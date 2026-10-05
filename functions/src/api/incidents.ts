import {FieldValue} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';
import type {Owner} from '../../../packages/contracts/src/index.js';
import {pageInputSchema,incidentProjection,incidentMutationSchema,transitions} from '../../../packages/contracts/src/operations.js';
import {db} from '../shared/admin.js';
import {scopedPage} from '../shared/pages.js';
import {ownerMutation} from '../shared/mutation.js';
export async function listIncidents(input:unknown){const page=pageInputSchema.parse(input);const result=await scopedPage('incidents',page);return {data:result.docs.map(doc=>incidentProjection(doc.data())),nextCursor:result.nextCursor,meta:{fetchedAt:new Date().toISOString(),scope:page.scope}};}
export async function changeIncident(input:unknown,owner:Owner){
 const data=incidentMutationSchema.parse(input);
 return ownerMutation(owner,data.idempotencyKey,'incident.workflow',data,async tx=>{
  const ref=db.doc(`incidents/${data.id}`);const snap=await tx.get(ref);
  if(!snap.exists) throw new HttpsError('not-found','Incident unavailable.');
  const incident=incidentProjection(snap.data()!);
  if(incident.revision!==data.revision) throw new HttpsError('aborted','Incident changed. Refresh before retry.');
  if(!transitions[incident.workflow].includes(data.workflow)) throw new HttpsError('failed-precondition','Transition unavailable.');
  const updated={...incident,workflow:data.workflow,revision:incident.revision+1,updatedAt:new Date().toISOString()};
  tx.set(ref,{...updated,changedBy:owner.uid,changedDate:FieldValue.serverTimestamp()}, {merge:true});
  tx.create(db.collection('incidentEvents').doc(),{incidentId:incident.id,appId:incident.appId,environment:incident.environment,workflow:data.workflow,note:data.note,actorUid:owner.uid,actorEmail:owner.email,occurredAt:updated.updatedAt,receivedAt:FieldValue.serverTimestamp(),schemaVersion:1});
  return updated;
 });
}

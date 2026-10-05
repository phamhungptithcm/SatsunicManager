import {FieldValue} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';
import {signalSchema,incidentSchema} from '../../../packages/contracts/src/operations.js';
import {db} from '../shared/admin.js';
import {digest} from '../shared/mutation.js';
// Server-only. A configured authenticated transport must verify its principal before invoking this.
export async function ingestSignal(input:unknown){
 const signal=signalSchema.parse(input);
 const id=digest(`${signal.appId}:${signal.environment}:${signal.sourceId}`);
 const receipt=db.doc(`signalReceipts/${digest(`${signal.sourceId}:${signal.eventId}`)}`);
 const ref=db.doc(`incidents/${id}`);const watermark=db.doc(`signalWatermarks/${id}`);
 return db.runTransaction(async tx=>{
  const [source,seen,current,mark]=await Promise.all([tx.get(db.doc(`integrationCapabilities/${signal.sourceId}`)),tx.get(receipt),tx.get(ref),tx.get(watermark)]);
  if(source.get('enabled')!==true||source.get('appId')!==signal.appId||source.get('environment')!==signal.environment||source.get('capability')!=='operational_signal') throw new HttpsError('permission-denied','Source unavailable.');
  if(seen.exists) return {id,duplicate:true};
  if(mark.exists&&mark.get('version')>=signal.sourceVersion){tx.create(receipt,{status:'ignored',receivedAt:FieldValue.serverTimestamp()});return {id,ignored:true};}
  const now=new Date().toISOString();
  tx.set(watermark,{version:signal.sourceVersion,sourceState:signal.condition,changedDate:FieldValue.serverTimestamp()});
  tx.create(receipt,{status:'accepted',sourceId:signal.sourceId,receivedAt:FieldValue.serverTimestamp()});
  if(!current.exists&&signal.condition==='recovered') return {id,ignored:true};
  const item=incidentSchema.parse({id,appId:signal.appId,environment:signal.environment,sourceId:signal.sourceId,sourceVersion:signal.sourceVersion,sourceState:signal.condition,workflow:current.exists?current.get('workflow'):'open',severity:signal.severity,title:signal.title,occurredAt:current.get('occurredAt')??signal.occurredAt,updatedAt:now,revision:(current.get('revision')??0)+1,evidence:signal.evidence});
  if(current.exists&&current.get('sourceState')==='recovered'&&signal.condition==='firing'&&item.workflow==='resolved') item.workflow='open';
  tx.set(ref,{...item,schemaVersion:1,createdBy:current.get('createdBy')??signal.sourceId,createdDate:current.get('createdDate')??FieldValue.serverTimestamp(),changedBy:signal.sourceId,changedDate:FieldValue.serverTimestamp()});
  const eventId=digest(`${id}:${signal.eventId}`);
  tx.create(db.doc(`incidentEvents/${eventId}`),{incidentId:id,appId:signal.appId,environment:signal.environment,sourceState:signal.condition,sourceVersion:signal.sourceVersion,occurredAt:signal.occurredAt,receivedAt:FieldValue.serverTimestamp(),schemaVersion:1});
  if(!current.exists||current.get('sourceState')!==signal.condition){
   const notification={id:eventId,incidentId:id,appId:signal.appId,environment:signal.environment,severity:signal.severity,title:signal.title,occurredAt:now};
   tx.create(db.doc(`notifications/${eventId}`),notification);
   tx.create(db.doc(`notificationOutbox/${eventId}`),{...notification,status:'pending',attemptCount:0,nextAttemptAt:now,channel:'email',deliveryBlocker:'channel_not_verified',schemaVersion:1});
  }
  return {id,duplicate:false};
 });
}

import {FieldValue} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';
import type {Owner} from '../../../packages/contracts/src/index.js';
import {pageInputSchema,notificationStateSchema} from '../../../packages/contracts/src/operations.js';
import {scopedPage} from '../shared/pages.js';
import {db} from '../shared/admin.js';
import {ownerMutation} from '../shared/mutation.js';
export async function listNotifications(input:unknown,owner:Owner){
 const page=pageInputSchema.parse(input);const result=await scopedPage('notifications',page);
 const states=result.docs.length?await db.getAll(...result.docs.map(doc=>db.doc(`owners/${owner.uid}/notificationStates/${doc.id}`))):[];
 return {data:result.docs.map((doc,i)=>({id:doc.id,incidentId:doc.get('incidentId'),title:doc.get('title'),severity:doc.get('severity'),appId:doc.get('appId'),occurredAt:doc.get('occurredAt'),read:states[i]?.get('read')===true})),nextCursor:result.nextCursor,meta:{fetchedAt:new Date().toISOString(),scope:page.scope,unreadInPage:states.filter(state=>state.get('read')!==true).length}};
}
export async function setNotificationRead(input:unknown,owner:Owner){
 const data=notificationStateSchema.parse(input);
 return ownerMutation(owner,data.idempotencyKey,'notification.read',data,async tx=>{
  const notification=await tx.get(db.doc(`notifications/${data.id}`));if(!notification.exists) throw new HttpsError('not-found','Notification unavailable.');
  tx.set(db.doc(`owners/${owner.uid}/notificationStates/${data.id}`),{read:data.read,changedDate:FieldValue.serverTimestamp(),changedBy:owner.uid,schemaVersion:1});
  return {id:data.id,read:data.read};
 });
}

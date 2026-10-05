import {createHash} from 'node:crypto';
import {FieldValue,type Transaction} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';
import type {Owner} from '../../../packages/contracts/src/index.js';
import {db} from './admin.js';
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function ownerMutation<T>(owner:Owner,key:string,action:string,input:unknown,work:(tx:Transaction)=>Promise<T>):Promise<T>{
 const op=db.doc(`idempotencyRecords/${digest(`${owner.uid}:${action}:${key}`)}`);const requestHash=digest(JSON.stringify(input));
 return db.runTransaction(async tx=>{
  const [access,cached]=await Promise.all([tx.get(db.doc(`ownerAccess/${owner.uid}`)),tx.get(op)]);
  if(access.get('enabled')!==true||access.get('role')!=='owner'||access.get('email')!==owner.email) throw new HttpsError('permission-denied','Access unavailable.');
  if(cached.exists){if(cached.get('requestHash')!==requestHash) throw new HttpsError('already-exists','Request key already used.');return cached.get('result') as T;}
  const result=await work(tx);
  tx.create(op,{requestHash,result,status:'completed',actorUid:owner.uid,receivedAt:FieldValue.serverTimestamp()});
  tx.create(db.collection('auditEvents').doc(),{action,actorUid:owner.uid,actorEmail:owner.email,receivedAt:FieldValue.serverTimestamp(),schemaVersion:1});
  return result;
 });
}

import {Timestamp} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';
import {db} from './admin.js';
import {digest} from './mutation.js';
// Durable across instances. Server-selected action and limit; never browser controlled.
export async function consumeRate(uid:string,action:string,maximum=60){
 const now=Date.now();const window=Math.floor(now/60000);
 const ref=db.doc(`rateLimits/${digest(`${uid}:${action}:${window}`)}`);
 await db.runTransaction(async tx=>{
  const current=await tx.get(ref);const count=current.get('count')??0;
  if(count>=maximum) throw new HttpsError('resource-exhausted','Wait before retrying.');
  tx.set(ref,{count:count+1,expiresAt:Timestamp.fromMillis((window+2)*60000)});
 });
}

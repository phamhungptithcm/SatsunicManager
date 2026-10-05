import {FieldPath} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';
import type {z} from 'zod';
import {pageInputSchema} from '../../../packages/contracts/src/operations.js';
import {db} from './admin.js';
export async function scopedPage(collection:string,input:z.infer<typeof pageInputSchema>){
 let q=db.collection(collection).where('environment','==',input.scope.environment).where('occurredAt','>=',input.scope.from).where('occurredAt','<=',input.scope.to);
 if(input.scope.appId!=='all') q=q.where('appId','==',input.scope.appId);
 q=q.orderBy('occurredAt','desc').orderBy(FieldPath.documentId(),'desc');
 if(input.cursor){
  try { const cursor=JSON.parse(Buffer.from(input.cursor,'base64url').toString()) as unknown;
   if(!Array.isArray(cursor)||cursor.length!==2||typeof cursor[0]!=='string'||typeof cursor[1]!=='string'||!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(cursor[0])||!Number.isFinite(Date.parse(cursor[0]))||!/^[-a-zA-Z0-9_]{1,128}$/.test(cursor[1])) throw new Error();
   q=q.startAfter(cursor[0],cursor[1]);
  }catch{throw new HttpsError('invalid-argument','Invalid page.');}
 }
 const docs=await q.limit(input.limit+1).get();const more=docs.size>input.limit;const items=docs.docs.slice(0,input.limit);const last=items.at(-1);
 return {docs:items,nextCursor:more&&last?Buffer.from(JSON.stringify([last.get('occurredAt'),last.id])).toString('base64url'):null};
}

import {FieldValue} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';
import type {Owner} from '../../../packages/contracts/src/index.js';
import {ownerPreferencesSchema,savePreferencesSchema} from '../../../packages/contracts/src/preferences.js';
import {db} from '../shared/admin.js';
import {ownerMutation} from '../shared/mutation.js';
export const preferencesSchema=savePreferencesSchema;
export async function getPreferences(owner:Owner){const snap=await db.doc(`owners/${owner.uid}`).get();return ownerPreferencesSchema.parse({locale:snap.get('locale')??'vi',theme:snap.get('theme')??'light',timezone:snap.get('timezone')??'America/Chicago',revision:snap.get('revision')??0});}
export async function savePreferences(input:unknown,owner:Owner){
 const data=preferencesSchema.parse(input);
 return ownerMutation(owner,data.idempotencyKey,'owner.preferences',data,async tx=>{
  const ref=db.doc(`owners/${owner.uid}`);const existing=await tx.get(ref);
  if((existing.get('revision')??0)!==data.revision)throw new HttpsError('aborted','Preferences changed. Refresh and retry.');
  const result={locale:data.locale,theme:data.theme,timezone:data.timezone,revision:data.revision+1};
  tx.set(ref,{...result,...(!existing.exists?{createdBy:owner.uid,createdDate:FieldValue.serverTimestamp()}:{}),changedBy:owner.uid,changedDate:FieldValue.serverTimestamp(),schemaVersion:1},{merge:true});return result;
 });
}

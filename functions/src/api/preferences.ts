import {z} from 'zod';
import {FieldValue} from 'firebase-admin/firestore';
import type {Owner} from '../../../packages/contracts/src/index.js';
import {timezoneSchema} from '../../../packages/contracts/src/index.js';
import {db} from '../shared/admin.js';
import {ownerMutation} from '../shared/mutation.js';
export const preferencesSchema=z.object({locale:z.enum(['vi','en']),theme:z.enum(['light','dark']),timezone:timezoneSchema,idempotencyKey:z.uuid()}).strict();
export async function getPreferences(owner:Owner){const snap=await db.doc(`owners/${owner.uid}`).get();return {locale:snap.get('locale')??'vi',theme:snap.get('theme')??'light',timezone:snap.get('timezone')??'America/Chicago'};}
export async function savePreferences(input:unknown,owner:Owner){const data=preferencesSchema.parse(input);return ownerMutation(owner,data.idempotencyKey,'owner.preferences',data,async tx=>{tx.set(db.doc(`owners/${owner.uid}`),{locale:data.locale,theme:data.theme,timezone:data.timezone,changedBy:owner.uid,changedDate:FieldValue.serverTimestamp(),schemaVersion:1},{merge:true});return {locale:data.locale,theme:data.theme,timezone:data.timezone};});}

import {FieldValue} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';
import {APP_CATALOG,appDefinitionSchema,registerAppInputSchema,type Owner} from '../../../packages/contracts/src/index.js';
import {db} from '../shared/admin.js';
import {ownerMutation} from '../shared/mutation.js';

// Project metadata is a request for verification, never runtime query authority.
export async function registerApp(input:unknown,owner:Owner){
 const data=registerAppInputSchema.parse(input);
 return ownerMutation(owner,data.idempotencyKey,'app.register',data,async tx=>{
  const ref=db.doc(`appDefinitions/${data.id}`);
  const [current,definitions]=await Promise.all([tx.get(ref),tx.get(db.collection('appDefinitions').limit(101))]);
  if((current.get('revision')??0)!==data.revision)throw new HttpsError('aborted','Application changed. Refresh before retry.');
  const ids=new Set([...APP_CATALOG.map(app=>app.id),...definitions.docs.map(doc=>doc.id)]);
  if(!ids.has(data.id)&&ids.size>=100)throw new HttpsError('resource-exhausted','Registry limit reached.');
  const result=appDefinitionSchema.parse({id:data.id,name:data.name,revision:data.revision+1,sourceProjectId:data.sourceProjectId,mappingVerified:false});
  tx.set(ref,{...result,createdBy:current.get('createdBy')??owner.uid,createdAt:current.get('createdAt')??FieldValue.serverTimestamp(),changedBy:owner.uid,changedAt:FieldValue.serverTimestamp(),schemaVersion:1});
  return result;
 });
}

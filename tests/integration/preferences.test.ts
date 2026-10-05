import {describe,it,expect,beforeAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../../functions/src/shared/admin';
import {getPreferences,savePreferences} from '../../functions/src/api/preferences';
beforeAll(()=>{if(process.env.GCLOUD_PROJECT!=='demo-satsunicmanager'||process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:28080')throw Error('Dedicated emulator only');});
describe('Owner preference persistence and concurrency',()=>{
 it('keeps owners separate, fences stale writes and retries uncertain saves idempotently',async()=>{
  const first={uid:`pref_${randomUUID()}`,email:'hunpeo97@gmail.com',role:'owner' as const};
  const second={uid:`pref_${randomUUID()}`,email:'phamhung.pitit@gmail.com',role:'owner' as const};
  try{
   for(const owner of [first,second])await db.doc(`ownerAccess/${owner.uid}`).set({...owner,enabled:true});
   expect(await getPreferences(first)).toEqual({locale:'vi',theme:'light',timezone:'America/Chicago',revision:0});
   const input={locale:'en',theme:'dark',timezone:'Asia/Ho_Chi_Minh',revision:0,idempotencyKey:randomUUID()};
   const saved=await savePreferences(input,first);expect(saved.revision).toBe(1);
   expect(await savePreferences(input,first)).toEqual(saved);expect(await getPreferences(first)).toEqual(saved);
   expect((await getPreferences(second)).locale).toBe('vi');
   const persisted=await db.doc(`owners/${first.uid}`).get();expect(persisted.get('createdBy')).toBe(first.uid);expect(persisted.get('changedBy')).toBe(first.uid);
   await expect(savePreferences({...input,idempotencyKey:randomUUID()},first)).rejects.toMatchObject({code:'aborted'});
   await expect(savePreferences({...input,theme:'light'},first)).rejects.toMatchObject({code:'already-exists'});
   await expect(savePreferences({...input,revision:1,uid:second.uid,idempotencyKey:randomUUID()},first)).rejects.toThrow();
   await expect(savePreferences({...input,revision:1,timezone:'UTC',idempotencyKey:randomUUID()},first)).rejects.toThrow();
   await db.doc(`ownerAccess/${first.uid}`).update({enabled:false});
   await expect(savePreferences({...input,revision:1,idempotencyKey:randomUUID()},first)).rejects.toMatchObject({code:'permission-denied'});
  }finally{for(const owner of [first,second]){await db.doc(`owners/${owner.uid}`).delete();await db.doc(`ownerAccess/${owner.uid}`).delete();}}
 });
});

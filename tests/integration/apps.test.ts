import {describe,it,expect,beforeAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../../functions/src/shared/admin';
import {registerApp} from '../../functions/src/api/apps';
import {appDefinitions} from '../../functions/src/api/registry';
import {readOperations} from '../../functions/src/integrations/operations';
beforeAll(()=>{if(process.env.GCLOUD_PROJECT!=='demo-satsunicmanager'||process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:28080')throw Error('Dedicated emulator only');});
describe('Dynamic registry authorization and fail-closed mapping',()=>{
 it('persists audited owner onboarding, deduplicates retries and prevents project-metadata query authority',async()=>{
 const uid=`apps_${randomUUID()}`,id=`fixture-${randomUUID()}`,owner={uid,email:'hunpeo97@gmail.com',role:'owner' as const};const access=db.doc(`ownerAccess/${uid}`),definition=db.doc(`appDefinitions/${id}`);
 try{
 await access.set({...owner,enabled:true});const input={id,name:'EMULATOR APP FIXTURE',sourceProjectId:'unverified-project',revision:0,idempotencyKey:randomUUID()};
 const added=await registerApp(input,owner);expect(added.mappingVerified).toBe(false);expect(added.revision).toBe(1);expect(await registerApp(input,owner)).toEqual(added);
 await expect(registerApp({...input,idempotencyKey:randomUUID()},owner)).rejects.toMatchObject({code:'aborted'});
 const apps=await appDefinitions();expect(apps.find(app=>app.id===id)?.name).toBe('EMULATOR APP FIXTURE');expect(apps.find(app=>app.id==='satsunicmec')?.name).toBe('SatsunicMec');
 const scope={appId:id,environment:'production',from:'2026-10-01T00:00:00.000Z',to:'2026-10-02T00:00:00.000Z',timezone:'America/Chicago'};const report=await readOperations({scope},async()=>{throw Error('Unverified project must never be fetched');},apps);expect(report.data[0]?.metrics.status).toBe('not_configured');expect(report.data[0]?.projectId).toBeNull();
 await access.update({enabled:false});await expect(registerApp({...input,revision:1,idempotencyKey:randomUUID()},owner)).rejects.toMatchObject({code:'permission-denied'});
 await expect(registerApp({...input,id:'../escape',idempotencyKey:randomUUID()},owner)).rejects.toThrow();
 }finally{await definition.delete();await access.delete();}
 });
});

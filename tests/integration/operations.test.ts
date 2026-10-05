import {describe,it,expect,beforeAll} from 'vitest';
import {consumeRate} from '../../functions/src/shared/rate';
import {randomUUID} from 'node:crypto';
import {db} from '../../functions/src/shared/admin';
import {ingestSignal} from '../../functions/src/alerts/ingest';
import {changeIncident,listIncidents} from '../../functions/src/api/incidents';
import {setNotificationRead,listNotifications} from '../../functions/src/api/notifications';
const owner={uid:'operations-fixture',email:'hunpeo97@gmail.com',role:'owner' as const};
const sourceId=`fixture_${randomUUID()}`;
const signal={eventId:randomUUID(),sourceId,sourceVersion:1,appId:'hunpeolabs',environment:'production',condition:'firing',severity:'P1',title:'EMULATOR FIXTURE',occurredAt:new Date().toISOString(),evidence:[]};
beforeAll(async()=>{
 if(process.env.GCLOUD_PROJECT!=='demo-satsunicmanager'||!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Emulator only');
 await db.doc(`ownerAccess/${owner.uid}`).set({...owner,enabled:true});
 await db.doc(`integrationCapabilities/${sourceId}`).set({enabled:true,appId:signal.appId,environment:'production',capability:'operational_signal'});
});
describe('Incident and private inbox transactions, emulator fixtures',()=>{
 it('deduplicates and orders signals, preserves independent source health, enforces revision/access',async()=>{
  const result=await ingestSignal(signal);const ref=db.doc(`incidents/${result.id}`);
  expect((await ingestSignal(signal)).duplicate).toBe(true);
  expect((await ingestSignal({...signal,eventId:randomUUID(),sourceVersion:0})).ignored).toBe(true);
  const mutation={id:result.id,revision:1,workflow:'acknowledged',note:'Fixture acknowledgement',idempotencyKey:randomUUID()};
  const changed=await changeIncident(mutation,owner);
  expect(changed.sourceState).toBe('firing');expect(changed.revision).toBe(2);
  expect(await changeIncident(mutation,owner)).toEqual(changed);
  await expect(changeIncident({...mutation,idempotencyKey:randomUUID()},owner)).rejects.toMatchObject({code:'aborted'});
  await expect(changeIncident({...mutation,revision:2,workflow:'resolved',idempotencyKey:randomUUID()},owner)).rejects.toMatchObject({code:'failed-precondition'});
  await ingestSignal({...signal,eventId:randomUUID(),sourceVersion:2,condition:'recovered'});
  expect((await ref.get()).get('workflow')).toBe('acknowledged');
  expect((await ref.get()).get('sourceState')).toBe('recovered');
  const scope={appId:'hunpeolabs',environment:'production',timezone:'America/Chicago',from:new Date(Date.now()-86400000).toISOString(),to:new Date(Date.now()+86400000).toISOString()};
  expect((await listIncidents({scope})).data.some(i=>i.id===result.id)).toBe(true);
  const inbox=await listNotifications({scope},owner);const row=inbox.data.find(n=>n.incidentId===result.id)!;
  expect(row.read).toBe(false);
  await setNotificationRead({id:row.id,read:true,idempotencyKey:randomUUID()},owner);
  expect((await listNotifications({scope},owner)).data.find(n=>n.id===row.id)?.read).toBe(true);
  const other={...owner,uid:'second-fixture'};
  expect((await listNotifications({scope},other)).data.find(n=>n.id===row.id)?.read).toBe(false);
  await db.doc(`ownerAccess/${owner.uid}`).update({enabled:false});
  await expect(changeIncident({...mutation,revision:3,idempotencyKey:randomUUID()},owner)).rejects.toMatchObject({code:'permission-denied'});
 });
 it('enforces a shared durable request cap',async()=>{const uid=randomUUID();await consumeRate(uid,'fixture',1);await expect(consumeRate(uid,'fixture',1)).rejects.toMatchObject({code:'resource-exhausted'});});
 it('rejects unknown or mismatched source descriptors',async()=>{
  await expect(ingestSignal({...signal,eventId:randomUUID(),sourceId:'unregistered_fixture'})).rejects.toMatchObject({code:'permission-denied'});
  await expect(ingestSignal({...signal,eventId:randomUUID(),appId:'befam'})).rejects.toMatchObject({code:'permission-denied'});
 });
});

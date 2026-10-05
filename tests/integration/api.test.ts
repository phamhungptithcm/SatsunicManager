import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
const project = 'demo-satsunicmanager';
const base = `http://127.0.0.1:25001/${project}/us-central1`;
const app = initializeApp({projectId:project}, 'integration-tests');
const db = getFirestore(app);
async function signIn(email: string, provider = 'google.com', expectDenied = false) {
  const sub = createHash('sha256').update(email).digest('hex');
  const idToken = ['eyJhbGciOiJub25lIn0', Buffer.from(JSON.stringify({sub,email,email_verified:true,name:'EMULATOR FIXTURE'})).toString('base64url'), ''].join('.');
  const response = await fetch(`http://127.0.0.1:29099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fixture-only`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({postBody:`id_token=${idToken}&providerId=${provider}`,requestUri:'http://localhost',returnSecureToken:true})});
  const result = await response.json() as {idToken:string;localId:string;error?:unknown};
  if (!result.idToken && !expectDenied) throw new Error('Fixture sign-in failed');
  return result;
}
async function call(name:string,token:string|undefined,data:unknown) {
  const response=await fetch(`${base}/${name}`, {method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify({data})});
  return {status:response.status,body:await response.json() as {result?:unknown;error?:{status:string}}};
}
beforeAll(async()=> {
  if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT!==project) throw new Error('Emulator only');
  // Remove only this demo project's prior fixture/probe state; never touch cloud data.
  const docs=await db.collection('integrationConnections').get();
  const batch=db.batch(); docs.docs.forEach(d=>batch.delete(d.ref)); await batch.commit();
});
afterAll(()=>deleteApp(app));
describe('Callable API → verified identity → access record → Firestore',()=>{
  it.each(['listIncidents','listNotifications','updateIncident','markNotificationRead','getOwnerPreferences','saveOwnerPreferences','listMonitoringSnapshots'])('rejects anonymous %s',async name=>expect((await call(name,undefined,{})).status).toBe(401));
  it('rejects anonymous registry read',async()=>expect((await call('listApps',undefined,{environment:'production'})).status).toBe(401));
  it('rejects outsider bootstrap and cannot read registry',async()=>{
    const denied=await signIn('outsider@example.test','google.com',true);
    expect(denied.idToken).toBeUndefined(); expect(denied.error).toBeDefined();
    // Adversarial emulator-only fixture simulates a pre-existing outsider session to test the API layer separately.
    const uid='adversarial-outsider';
    await getAuth(app).createUser({uid,email:'outsider@example.test',emailVerified:true}).catch(()=>undefined);
    const now=Math.floor(Date.now()/1000);
    const payload={aud:project,iss:`https://securetoken.google.com/${project}`,sub:uid,user_id:uid,email:'outsider@example.test',email_verified:true,auth_time:now,iat:now,exp:now+3600,firebase:{sign_in_provider:'google.com'}};
    const token=['eyJhbGciOiJub25lIn0',Buffer.from(JSON.stringify(payload)).toString('base64url'),''].join('.');
    expect((await call('bootstrapOwner',token,{})).status).toBe(403);
    expect((await call('listApps',token,{environment:'production'})).status).toBe(403);
  });
  it.each(['hunpeo97@gmail.com','phamhung.pitit@gmail.com'])('bootstraps exactly owner %s and records audit',async email=>{
    const owner=await signIn(email);
    const bootstrap=await call('bootstrapOwner',owner.idToken,{});
    expect(bootstrap.status).toBe(200);
    expect(bootstrap.body.result).toEqual({uid:owner.localId,email,role:'owner'});
    expect((await db.doc(`ownerAccess/${owner.localId}`).get()).get('enabled')).toBe(true);
    const registry=await call('listApps',owner.idToken,{environment:'production'});
    expect(registry.status).toBe(200);
    const result=registry.body.result as {data:{status:string;lastSuccessAt:null}[];meta:{fixture:boolean}};
    expect(result.data).toHaveLength(7); expect(result.meta.fixture).toBe(true);
    expect(result.data.every(a=>a.status==='not_configured' && a.lastSuccessAt===null)).toBe(true);
    expect((await call('listApps',owner.idToken,{environment:'production',projectId:'not-allowed'})).status).toBe(400);
    expect((await call('listIncidents',owner.idToken,{scope:{environment:'staging'}})).status).toBe(400);
    const events=await db.collection('auditEvents').where('actorUid','==',owner.localId).get();
    expect(events.empty).toBe(false);
  });
  it('real source check persists provenance, audit and idempotent replay without calling arbitrary URLs',async()=>{
    const owner=await signIn('hunpeo97@gmail.com');
    const key=crypto.randomUUID();
    const data={appId:'hunpeolabs',environment:'production',revision:0,idempotencyKey:key};
    const check=await call('checkConnection',owner.idToken,data);
    expect(check.status).toBe(200);
    const result=check.body.result as {status:string;revision:number;results:{httpStatus:number;capability:string}[];lastSuccessAt:null};
    expect(result.status).toBe('degraded'); expect(result.revision).toBe(1); expect(result.lastSuccessAt).toBeNull();
    expect(result.results.find(r=>r.capability==='public_reachability')?.httpStatus).toBe(200);
    expect(result.results.find(r=>r.capability==='backend_readiness')?.httpStatus).toBe(404);
    const replay=await call('checkConnection',owner.idToken,data); expect(replay.body.result).toEqual(check.body.result);
    const mismatch=await call('checkConnection',owner.idToken,{...data,revision:1}); expect(mismatch.status).toBe(409);
    const stale=await call('checkConnection',owner.idToken,{...data,idempotencyKey:crypto.randomUUID()}); expect(stale.status).toBe(409);
    const injection=await call('checkConnection',owner.idToken,{...data,url:'https://evil.test'}); expect(injection.status).toBe(400);
    const stored=await db.doc('integrationConnections/hunpeolabs_production').get(); expect(stored.get('revision')).toBe(1);
    const events=await db.collection('auditEvents').where('actorUid','==',owner.localId).get();
    expect(events.docs.some(d=>d.get('action')==='connection.test')).toBe(true);
  });
  it('rejects a changed access role at bootstrap and registry',async()=>{
    const owner=await signIn('hunpeo97@gmail.com');
    const ref=db.doc(`ownerAccess/${owner.localId}`);
    await ref.update({role:'viewer'});
    try {
      expect((await call('bootstrapOwner',owner.idToken,{})).status).toBe(403);
      expect((await call('listApps',owner.idToken,{environment:'production'})).status).toBe(403);
    } finally { await ref.update({role:'owner'}); }
  });
  it('disabled owner cannot read, bootstrap again or reset own access',async()=>{
    const owner=await signIn('hunpeo97@gmail.com');
    await db.doc(`ownerAccess/${owner.localId}`).update({enabled:false});
    expect((await call('listApps',owner.idToken,{environment:'production'})).status).toBe(403);
    expect((await call('bootstrapOwner',owner.idToken,{})).status).toBe(403);
    expect((await db.doc(`ownerAccess/${owner.localId}`).get()).get('enabled')).toBe(false);
    const denied=await signIn('hunpeo97@gmail.com','google.com',true); expect(denied.idToken).toBeUndefined();
    await db.doc(`ownerAccess/${owner.localId}`).update({enabled:true});
  });
});

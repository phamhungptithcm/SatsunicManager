import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';
let env: RulesTestEnvironment;
const token = (email: string, provider = 'google.com', verified = true) => ({ email, email_verified: verified, firebase: { sign_in_provider: provider } });
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-satsunicmanager', firestore: { host:'127.0.0.1', port:28080, rules: readFileSync('firestore.rules','utf8') }, storage: { host:'127.0.0.1', port:29199, rules:readFileSync('storage.rules','utf8') } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db,'ownerAccess/owner-a'), { email:'hunpeo97@gmail.com',role:'owner',enabled:true });
    await setDoc(doc(db,'ownerAccess/owner-b'), { email:'phamhung.pitit@gmail.com',role:'owner',enabled:true });
    await setDoc(doc(db,'apps/hunpeolabs'), { name:'HunpeoLabs' });
    await setDoc(doc(db,'aiConversations/private-b'), {ownerUid:'owner-b'});
    await setDoc(doc(db,'owners/owner-b/notificationStates/one'), {read:false});
    await uploadBytes(ref(context.storage(),'owners/owner-b/reports/r/file.csv'),new Uint8Array([1,2]));
  });
});
describe('Deny by default', () => {
  it('blocks anonymous reads and writes', async () => { const db=env.unauthenticatedContext().firestore(); await assertFails(getDoc(doc(db,'apps/hunpeolabs'))); await assertFails(setDoc(doc(db,'apps/new'),{})); });
  it.each([['outsider','other@gmail.com','google.com',true],['spoof','hunpeo97@gmail.com','password',true],['unverified','hunpeo97@gmail.com','google.com',false],['alias','hunpeo97+manager@gmail.com','google.com',true]])('blocks %s', async (uid,email,provider,verified) => { const db=env.authenticatedContext(uid,token(email,provider,verified)).firestore(); await assertFails(getDoc(doc(db,'apps/hunpeolabs'))); await assertFails(setDoc(doc(db,'ownerAccess/'+uid),{enabled:true})); });
  it.each([['owner-a','hunpeo97@gmail.com'],['owner-b','phamhung.pitit@gmail.com']])('allows active Google owner %s to read projection', async (uid,email) => { await assertSucceeds(getDoc(doc(env.authenticatedContext(uid,token(email)).firestore(),'apps/hunpeolabs'))); });
  it('blocks disabled owner immediately', async () => {
    await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'ownerAccess/owner-a'),{enabled:false},{merge:true}));
    await assertFails(getDoc(doc(env.authenticatedContext('owner-a',token('hunpeo97@gmail.com')).firestore(),'apps/hunpeolabs')));
  });
  it.each(['ownerAccess/owner-a','ownerBindings/email','auditEvents/a','financialEvents/a','metricSnapshots/a','integrationConnections/a','apps/hunpeolabs','owners/owner-a/notificationStates/a'])('rejects client writes to %s', async path => {
    await assertFails(setDoc(doc(env.authenticatedContext('owner-a',token('hunpeo97@gmail.com')).firestore(),path),{enabled:true}));
  });
  it('keeps conversations and inbox states private', async()=>{
    const db=env.authenticatedContext('owner-a',token('hunpeo97@gmail.com')).firestore();
    await assertFails(getDoc(doc(db,'aiConversations/private-b'))); await assertFails(getDoc(doc(db,'owners/owner-b/notificationStates/one')));
    await assertSucceeds(getDoc(doc(env.authenticatedContext('owner-b',token('phamhung.pitit@gmail.com')).firestore(),'aiConversations/private-b')));
  });
  it('protects Storage exports and denies uploads',async()=>{
    const a=env.authenticatedContext('owner-a',token('hunpeo97@gmail.com')).storage();
    const b=env.authenticatedContext('owner-b',token('phamhung.pitit@gmail.com')).storage();
    await assertFails(getBytes(ref(a,'owners/owner-b/reports/r/file.csv')));
    await assertSucceeds(getBytes(ref(b,'owners/owner-b/reports/r/file.csv')));
    await assertFails(uploadBytes(ref(b,'owners/owner-b/reports/r/evil.csv'),new Uint8Array([1])));
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(),'owners/owner-b/reports/r/file.csv')));
  });
});

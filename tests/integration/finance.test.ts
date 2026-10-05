import {describe,it,expect,beforeAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../../functions/src/shared/admin';
import {financeSnapshot} from '../../functions/src/finance/snapshot';
beforeAll(()=>{if(process.env.GCLOUD_PROJECT!=='demo-satsunicmanager'||process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:28080')throw Error('Dedicated emulator only');});
describe('Official-source snapshot integrity, explicit demo fixtures',()=>{
 it('does not expose unverified facts, preserves export/card equality and omits unknown net/cost',async()=>{
 const suffix=randomUUID();const appId=`fixture-${suffix}`,sourceId=`source-${suffix}`,factId=`fact-${suffix}`;const source=db.doc(`connectorSources/${sourceId}`),fact=db.doc(`financialFacts/${factId}`);
 const scope={appId,environment:'production',timezone:'America/Chicago',from:new Date(Date.now()-60000).toISOString(),to:new Date(Date.now()+60000).toISOString()};
 try{
 await fact.set({transactionId:'fixture_order',appId,currency:'JPY',kind:'gross',minorUnits:'1000',occurredAt:new Date().toISOString(),environment:'production',sourceId});
 const missing=await financeSnapshot({scope,currency:'JPY'});expect(missing.status).toBe('not_configured');expect(missing.data).toEqual([]);expect(missing.totals).toEqual({});
 await source.set({appId,enabled:true,verified:true,provider:'explicit_demo_fixture',netSemanticsVerified:false,observedThrough:scope.to});
 const snapshot=await financeSnapshot({scope,currency:'JPY'});expect(snapshot.data[0]?.minorUnits).toBe('1000');expect(snapshot.csv).toContain('"1000"');expect(snapshot.totals.gross).toBe('1000');expect(snapshot.totals.netCollections).toBeUndefined();expect(snapshot.totals.cost).toBeUndefined();
 await source.update({netSemanticsVerified:true});const reconciled=await financeSnapshot({scope,currency:'JPY'});expect(reconciled.totals.netCollections).toBe('1000');
 await source.update({observedThrough:scope.from});const partial=await financeSnapshot({scope,currency:'JPY'});expect(partial.status).toBe('partial');expect(partial.totals).toEqual({});expect(partial.csv).toBe('');
 }finally{await source.delete();await fact.delete();}
 });
});

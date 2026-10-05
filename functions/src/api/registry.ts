import { z } from 'zod';
import { APP_CATALOG, appDefinitionSchema, registryItemSchema, registryResponseSchema, environmentSchema } from '../../../packages/contracts/src/index.js';
import { db } from '../shared/admin.js';
import { targetsFor } from '../integrations/catalog.js';

export const registryInput = z.object({ environment: environmentSchema }).strict();
export async function appDefinitions(){
  const snapshots=await db.collection('appDefinitions').limit(101).get();
  if(snapshots.size>100)throw new Error('Registry limit exceeded');
  const definitions=new Map<string,{id:string;name:string}>(APP_CATALOG.map(app=>[app.id,{...app}]));
  for(const snapshot of snapshots.docs){const app=appDefinitionSchema.parse(Object.fromEntries(Object.keys(appDefinitionSchema.shape).map(key=>[key,snapshot.get(key)])));if(app.id!==snapshot.id)throw new Error('Registry identity mismatch');definitions.set(app.id,{id:app.id,name:app.name});}
  return [...definitions.values()];
}
export async function registry(environment: z.infer<typeof environmentSchema>) {
  const apps=await appDefinitions();
  const refs = apps.map(app => db.doc(`integrationConnections/${app.id}_${environment}`));
  const docs = await db.getAll(...refs);
  const now = Date.now();
  const data = apps.map((app, index) => {
    const doc = docs[index];
    if (doc?.exists) {
      const item = registryItemSchema.parse(Object.fromEntries(Object.keys(registryItemSchema.shape).map(key => [key, doc.get(key)])));
      return item.lastAttemptAt && now - Date.parse(item.lastAttemptAt) > 15 * 60000 ? { ...item, status: 'stale' as const } : item;
    }
    return registryItemSchema.parse({ ...app, environment, status: 'not_configured', revision: 0,
      lastAttemptAt: null, lastSuccessAt: null, results: [], source: targetsFor(app.id, environment)[0]?.url ?? null,
      missingSources: ['monitoring', 'logging', 'billing', 'revenue', 'analytics', 'backend_readiness', ...(!['hunpeolabs','satsunicseo','satsunicplan'].includes(app.id) ? ['verified_mapping'] : [])] });
  });
  return registryResponseSchema.parse({ data, meta: { fetchedAt: new Date().toISOString(), environment, queryVersion: 'registry-v1', fixture: process.env.GCLOUD_PROJECT?.startsWith('demo-') ?? false } });
}

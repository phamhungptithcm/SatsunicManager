import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { APP_CATALOG, connectionInputSchema, registryItemSchema, type Owner } from '../../../packages/contracts/src/index.js';
import { db } from '../shared/admin.js';
import { targetsFor } from '../integrations/catalog.js';
import { probe } from '../integrations/health.js';

export async function testConnection(input: unknown, owner: Owner) {
  const parsed = connectionInputSchema.safeParse(input);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Invalid connection request.');
  const { appId, environment, revision, idempotencyKey } = parsed.data;
  const targets = targetsFor(appId, environment);
  if (!targets.length) throw new HttpsError('failed-precondition', 'Source not configured.');
  const ref = db.doc(`integrationConnections/${appId}_${environment}`);
  const operation = db.doc(`idempotencyRecords/${createHash('sha256').update(`${owner.uid}:${idempotencyKey}`).digest('hex')}`);
  const rate = db.doc(`rateLimits/${owner.uid}_connection`);
  const requestHash = createHash('sha256').update(JSON.stringify({ appId, environment, revision })).digest('hex');
  const cached = await db.runTransaction(async tx => {
    const [op, current, limit] = await Promise.all([tx.get(operation), tx.get(ref), tx.get(rate)]);
    if (op.exists) {
      if (op.get('requestHash') !== requestHash) throw new HttpsError('already-exists', 'Request key already used.');
      if (op.get('status') === 'completed') return registryItemSchema.parse(op.get('result'));
      // Never replay a partially completed probe blindly.
      throw new HttpsError('aborted', 'Connection check pending. Refresh before retry.');
    }
    if ((current.exists ? current.get('revision') : 0) !== revision) throw new HttpsError('aborted', 'Connection changed. Refresh before retry.');
    const last = limit.get('lastAttemptAt') as Timestamp | undefined;
    if (last && Date.now() - last.toMillis() < 10000) throw new HttpsError('resource-exhausted', 'Wait before checking again.');
    tx.set(rate, { lastAttemptAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + 3600000) });
    tx.create(operation, { requestHash, status: 'pending', actorUid: owner.uid, receivedAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 86400000) });
    return null;
  });
  if (cached) return cached;
  const results = await Promise.all(targets.map(probe));
  return db.runTransaction(async tx => {
    const [current, access] = await Promise.all([tx.get(ref), tx.get(db.doc(`ownerAccess/${owner.uid}`))]);
    if (access.get('enabled') !== true || access.get('role') !== 'owner' || access.get('email') !== owner.email) throw new HttpsError('permission-denied', 'Access unavailable.');
    if ((current.exists ? current.get('revision') : 0) !== revision) throw new HttpsError('aborted', 'Connection changed. Refresh before retry.');
    const complete = results.every(r => r.status === 'healthy');
    const item = registryItemSchema.parse({ id: appId, name: APP_CATALOG.find(a => a.id === appId)!.name,
      environment, revision: revision + 1, status: complete ? 'healthy' : results.some(r => r.status === 'healthy') ? 'degraded' : 'failed',
      lastAttemptAt: new Date().toISOString(), lastSuccessAt: complete ? new Date().toISOString() : current.get('lastSuccessAt') ?? null,
      results, source: targets[0]!.url, missingSources: ['monitoring', 'logging', 'billing', 'revenue', 'analytics', ...(complete ? [] : ['backend_readiness'])] });
    tx.set(ref, { ...item, schemaVersion: 1,
      createdBy: current.get('createdBy') ?? owner.uid, createdDate: current.get('createdDate') ?? FieldValue.serverTimestamp(),
      changedBy: owner.uid, changedDate: FieldValue.serverTimestamp() });
    tx.update(operation, { status: 'completed', result: item, completedAt: FieldValue.serverTimestamp() });
    tx.create(db.collection('auditEvents').doc(), { action: 'connection.test', actorUid: owner.uid, actorEmail: owner.email,
      appId, environment, revision: item.revision, schemaVersion: 1, receivedAt: FieldValue.serverTimestamp() });
    return item;
  });
}

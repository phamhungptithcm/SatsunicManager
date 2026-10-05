import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { scopeSchema, type Scope } from '../../../packages/contracts/src/index.js';
import { readOperations } from '../integrations/operations.js';
import { RESOURCE_CATALOG } from '../integrations/resources.js';
import { googleRead, type GoogleReader } from '../integrations/google-read.js';
import { acquireLease, completeLeaseRun, releaseLease } from '../shared/leases.js';
import { db } from '../shared/admin.js';
import { digest } from '../shared/mutation.js';

function cursorTime(value: unknown): number {
  if (typeof value !== 'string' || !scopeSchema.shape.to.safeParse(value).success || !Number.isFinite(Date.parse(value))) throw new HttpsError('failed-precondition', 'Invalid collection checkpoint.');
  return Date.parse(value);
}

const verifiedIds = ['hunpeolabs', 'satsunicseo', 'satsunicplan'] as const;
export async function collectOperations(input: Scope, reader?: GoogleReader) {
  if (process.env.MANAGER_COLLECTOR_ENABLED !== 'true') return { status: 'blocked' as const, reason: 'collector_disabled' };
  const demo = process.env.GCLOUD_PROJECT?.startsWith('demo-') === true;
  if ((!demo && (!process.env.MANAGER_COLLECTOR_SERVICE_ACCOUNT || reader)) || (demo && !reader)) {
    return { status: 'blocked' as const, reason: 'collector_identity_unconfigured' };
  }
  const parsed = scopeSchema.parse(input);
  const scope = { ...parsed, from: new Date(parsed.from).toISOString(), to: new Date(parsed.to).toISOString() };
  if (Date.parse(scope.to) - Date.parse(scope.from) > 3600000 || Date.parse(scope.to) > Date.now() + 300000) {
    throw new HttpsError('invalid-argument', 'Invalid collection window.');
  }
  const apps = verifiedIds.filter(id => RESOURCE_CATALOG[id] && (scope.appId === 'all' || scope.appId === id)).map(id => ({ id, name: id }));
  if (!apps.length) throw new HttpsError('failed-precondition', 'Verified source required.');
  const jobId = `operations_metrics_v1_${apps.map(app => app.id).join('_')}`;
  const baseId = digest(JSON.stringify({ queryVersion: 'collector-v1', scope, apps: apps.map(app => app.id) }));
  const windowRef = db.doc(`operationsCollectionWindows/${baseId}`);
  const checkpointRef = db.doc(`connectorCheckpoints/${jobId}`);
  const statusRef = db.doc(`connectorStatuses/${jobId}`);
  const window = await windowRef.get();
  if (window.get('successfulRunId')) return { id: window.get('successfulRunId') as string, status: 'complete' as const, duplicate: true };
  const lease = await acquireLease(jobId, 60000);
  if (!lease) return { id: baseId, status: 'busy' as const };
  try {
    const attempt = await db.runTransaction(async tx => {
      const [job, currentWindow, base, checkpoint] = await Promise.all([
        tx.get(db.doc(`connectorJobs/${jobId}`)), tx.get(windowRef),
        tx.get(db.doc(`operationsCollectionRuns/${baseId}`)), tx.get(checkpointRef),
      ]);
      const expires = job.get('expiresAt');
      if (job.get('token') !== lease.token || job.get('revision') !== lease.revision || !(expires instanceof Timestamp) || expires.toMillis() <= job.readTime.toMillis()) throw new HttpsError('aborted', 'Worker lease unavailable.');
      if (currentWindow.get('successfulRunId')) return { id: currentWindow.get('successfulRunId') as string, duplicate: true };
      // Compatibility with completed runs created before per-window references.
      if (base.get('status') === 'complete') return { id: baseId, duplicate: true };
      const cursor = checkpoint.get('cursor');
      if (checkpoint.exists) {
        const committedTime = cursorTime(cursor);
        if (Date.parse(scope.from) > committedTime) throw new HttpsError('failed-precondition', 'Collection gap requires recovery.');
        if (Date.parse(scope.to) <= committedTime) throw new HttpsError('aborted', 'Collection window superseded.');
      }
      return { id: base.exists ? digest(`${baseId}:attempt:${lease.revision}`) : baseId, duplicate: false };
    });
    if (attempt.duplicate) return { id: attempt.id, status: 'complete' as const, duplicate: true };
    const id = attempt.id;
    const runRef = db.doc(`operationsCollectionRuns/${id}`);
    const response = await readOperations({ scope, logCursor: null }, reader ?? googleRead, apps, { includeLogs: false });
    const data = response.data.map(({ appId, projectId, services, metrics, provenance, freshness }) => ({ appId, projectId, services, metrics, provenance, freshness }));
    const complete = data.length === apps.length && data.every(item => item.metrics.status === 'available' || item.metrics.status === 'empty');
    const report = { id, baseWindowId: baseId, attemptRevision: lease.revision, scope, status: complete ? 'complete' : 'failed', data, fixture: response.meta.fixture, queryVersion: 'collector-v1', createdAt: FieldValue.serverTimestamp() };
    if (complete) {
      await completeLeaseRun(lease, { complete: true, cursor: scope.to }, async tx => {
        const [checkpoint, currentWindow] = await Promise.all([tx.get(checkpointRef), tx.get(windowRef)]);
        if (currentWindow.get('successfulRunId')) throw new HttpsError('aborted', 'Collection window completed.');
        if (checkpoint.exists) {
          const committedTime = cursorTime(checkpoint.get('cursor'));
          if (Date.parse(scope.from) > committedTime) throw new HttpsError('failed-precondition', 'Collection gap requires recovery.');
          if (committedTime >= Date.parse(scope.to)) throw new HttpsError('aborted', 'Collection window superseded.');
        }
        tx.create(runRef, report);
        tx.set(windowRef, { successfulRunId: id, latestAttemptRunId: id, status: 'complete', changedAt: FieldValue.serverTimestamp() }, { merge: true });
        tx.create(db.doc(`operationsSnapshots/${id}`), { ...report, queriedThrough: scope.to });
        tx.set(statusRef, { status: 'complete', runId: id, lastSuccessfulSnapshotId: id, attemptedThrough: scope.to, changedAt: FieldValue.serverTimestamp() }, { merge: true });
      });
    } else {
      // Failure is fenced and durable, but does not touch the successful checkpoint.
      await db.runTransaction(async tx => {
        const [snapshot, currentWindow] = await Promise.all([tx.get(db.doc(`connectorJobs/${jobId}`)), tx.get(windowRef)]);
        if (currentWindow.get('successfulRunId')) throw new HttpsError('aborted', 'Collection window completed.');
        const expires = snapshot.get('expiresAt');
        if (snapshot.get('token') !== lease.token || snapshot.get('revision') !== lease.revision || !(expires instanceof Timestamp) || expires.toMillis() <= snapshot.readTime.toMillis()) {
          throw new HttpsError('aborted', 'Worker lease unavailable.');
        }
        tx.create(runRef, report);
        tx.set(windowRef, { latestAttemptRunId: id, status: 'failed', changedAt: FieldValue.serverTimestamp() }, { merge: true });
        tx.set(statusRef, { status: 'failed', runId: id, attemptedThrough: scope.to, changedAt: FieldValue.serverTimestamp() }, { merge: true });
      });
    }
    return { id, status: complete ? 'complete' as const : 'failed' as const, duplicate: false };
  } finally {
    // Completion already releases; an expired/taken-over lease must stay untouched.
    await releaseLease(lease).catch(error => { if (!(error instanceof HttpsError) || error.code !== 'aborted') throw error; });
  }
}

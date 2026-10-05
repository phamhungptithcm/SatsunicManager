import { HttpsError } from 'firebase-functions/v2/https';
import { scopeSchema } from '../../../packages/contracts/src/index.js';
import { db } from '../shared/admin.js';
import { collectOperations } from './collector.js';
import type { GoogleReader } from '../integrations/google-read.js';

export const MONITORING_WORKER_ACCOUNT = 'manager-worker@satsunicmanager.iam.gserviceaccount.com';
export const MONITORING_SCHEDULER_ACCOUNT = 'manager-scheduler@satsunicmanager.iam.gserviceaccount.com';
const apps = ['hunpeolabs', 'satsunicseo', 'satsunicplan'] as const;
const period = 15 * 60000;
const settleDelay = 5 * 60000;
export function settledMonitoringThrough(now: number) {
  if (!Number.isFinite(now)) throw new HttpsError('invalid-argument', 'Invalid time.');
  // Monitoring observations arrive after sampling. Finalize only settled quarters,
  // because successful reports/checkpoints are immutable and retries deduplicate.
  return Math.floor((now - settleDelay) / period) * period;
}
// Body and Scheduler headers never choose source resources or collection windows.
export function validateMonitoringTransport(method: string, body: unknown) {
  if (method !== 'POST') throw new HttpsError('invalid-argument', 'POST required.');
  if (body !== undefined && body !== null && body !== '' && !(typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0)) {
    throw new HttpsError('invalid-argument', 'Collection input unavailable.');
  }
}
export async function runMonitoringCollection(reader?: GoogleReader, demoTime?: number) {
  const demo = process.env.GCLOUD_PROJECT?.startsWith('demo-') === true;
  if ((reader || demoTime !== undefined) && !demo) throw new HttpsError('permission-denied', 'Test configuration unavailable.');
  if (process.env.MANAGER_COLLECTOR_ENABLED !== 'true') return { status: 'blocked', results: [] };
  if (!demo && process.env.MANAGER_COLLECTOR_SERVICE_ACCOUNT !== MONITORING_WORKER_ACCOUNT) return { status: 'blocked', results: [] };
  const started = Date.now();
  const now = demoTime ?? started;
  if (!Number.isFinite(now)) throw new HttpsError('invalid-argument', 'Invalid time.');
  const through = settledMonitoringThrough(now);
  const results: Array<{ appId: string; status: string; runId: string | null; reason: string | null }> = [];
  for (const appId of apps) {
    if (Date.now() - started > 40000) { results.push({ appId, status: 'deferred', runId: null, reason: 'invocation_deadline' }); continue; }
    try {
      const checkpoint = await db.doc(`connectorCheckpoints/operations_metrics_v1_${appId}`).get();
      let from = through - period;
      if (checkpoint.exists) {
        const cursor = checkpoint.get('cursor');
        if (!scopeSchema.shape.to.safeParse(cursor).success || !Number.isFinite(Date.parse(cursor))) throw new HttpsError('failed-precondition', 'Invalid collection checkpoint.');
        from = Date.parse(cursor);
      } else {
        // Preserve the initial failed window too: lack of a successful checkpoint
        // must never let the next tick silently jump over uncollected coverage.
        const status = await db.doc(`connectorStatuses/operations_metrics_v1_${appId}`).get();
        if (status.exists) {
          const runId = status.get('runId');
          if (typeof runId !== 'string' || !/^[a-f0-9]{64}$/.test(runId)) throw new HttpsError('failed-precondition', 'Invalid collection state.');
          const attempt = await db.doc(`operationsCollectionRuns/${runId}`).get();
          const attemptScope = scopeSchema.safeParse(attempt.get('scope'));
          if (!attempt.exists || attempt.get('status') !== 'failed' || !attemptScope.success || attemptScope.data.appId !== appId || attemptScope.data.environment !== 'production') throw new HttpsError('failed-precondition', 'Invalid collection state.');
          from = Date.parse(attemptScope.data.from);
        }
      }
      if (from >= through) { results.push({ appId, status: 'up_to_date', runId: null, reason: null }); continue; }
      const to = Math.min(through, from + 3600000);
      const result = await collectOperations({ appId, environment: 'production', timezone: 'America/Chicago', from: new Date(from).toISOString(), to: new Date(to).toISOString() }, reader);
      results.push({ appId, status: result.status, runId: 'id' in result ? result.id ?? null : null, reason: 'reason' in result ? result.reason ?? null : null });
    } catch (error) {
      results.push({ appId, status: 'failed', runId: null, reason: error instanceof HttpsError ? error.code : 'collection_unavailable' });
    }
  }
  return { status: 'processed', results };
}

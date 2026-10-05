import { HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { monitoringInputSchema, monitoringReportSchema, monitoringResponseSchema, type MonitoringResponse } from '../../../packages/contracts/src/monitoring.js';
import { db } from '../shared/admin.js';
import { appDefinitions } from './registry.js';

const verified = new Set(['hunpeolabs', 'satsunicseo', 'satsunicplan']);
function report(value: Record<string, unknown> | undefined) {
  if (!value) return null;
  return monitoringReportSchema.parse({ id: value.id, scope: value.scope, status: value.status,
    data: value.data, fixture: value.fixture, queryVersion: value.queryVersion,
    createdAt: value.createdAt instanceof Timestamp ? value.createdAt.toDate().toISOString() : value.createdAt });
}
export async function monitoringSnapshots(input: unknown): Promise<MonitoringResponse> {
  const { scope, limit } = monitoringInputSchema.parse(input);
  const apps = (await appDefinitions()).filter(app => scope.appId === 'all' || app.id === scope.appId);
  if (!apps.length) throw new HttpsError('not-found', 'Application unavailable.');
  const recent = await db.collection('operationsSnapshots').where('scope.to', '>=', new Date(scope.from).toISOString()).where('scope.to', '<', new Date(scope.to).toISOString()).orderBy('scope.to', 'desc').limit(101).get();
  const boundedReports = recent.docs.slice(0, 100).map(snapshot => report(snapshot.data())!);
  let historyTruncated = recent.size > 100;
  const data = await Promise.all(apps.map(async app => {
    const item: MonitoringResponse['data'][number] = { appId: app.id, status: 'not_configured', lastAttemptAt: null, lastSuccessAt: null,
      attemptedThrough: null, lastSuccessfulThrough: null, latestAttempt: null, history: [] };
    if (!verified.has(app.id)) return item;
    const jobId = `operations_metrics_v1_${app.id}`;
    const [status, checkpoint] = await Promise.all([
      db.doc(`connectorStatuses/${jobId}`).get(), db.doc(`connectorCheckpoints/${jobId}`).get(),
    ]);
    const matching = boundedReports.filter(row => row.scope.appId === app.id && row.scope.environment === scope.environment);
    if (matching.length > limit) historyTruncated = true;
    item.history = matching.slice(0, limit);
    if (status.exists) {
      const runId = status.get('runId');
      if (typeof runId !== 'string' || !/^[a-f0-9]{64}$/.test(runId)) throw new HttpsError('failed-precondition', 'Monitoring state unavailable.');
      item.latestAttempt = report((await db.doc(`operationsCollectionRuns/${runId}`).get()).data());
      if (item.latestAttempt && (item.latestAttempt.scope.appId !== app.id || item.latestAttempt.scope.environment !== scope.environment)) throw new HttpsError('failed-precondition', 'Monitoring source mismatch.');
      item.lastAttemptAt = item.latestAttempt?.createdAt ?? null;
      item.attemptedThrough = item.latestAttempt?.scope.to ?? null;
      item.status = item.latestAttempt?.data.find(row => row.appId === app.id)?.metrics.status ?? 'failed';
      const successId = status.get('lastSuccessfulSnapshotId');
      if (successId !== undefined) {
        if (typeof successId !== 'string' || !/^[a-f0-9]{64}$/.test(successId)) throw new HttpsError('failed-precondition', 'Monitoring state unavailable.');
        const success = report((await db.doc(`operationsSnapshots/${successId}`).get()).data());
        if (success && (success.scope.appId !== app.id || success.scope.environment !== scope.environment)) throw new HttpsError('failed-precondition', 'Monitoring source mismatch.');
        item.lastSuccessAt = success?.createdAt ?? null;
      }
    }
    item.lastSuccessfulThrough = checkpoint.exists ? checkpoint.get('cursor') : null;
    return item;
  }));
  return monitoringResponseSchema.parse({ data, meta: { scope, fetchedAt: new Date().toISOString(), queryVersion: 'monitoring-v1', historyCoverage: 'bounded_recent', historyTruncated, fixture: process.env.GCLOUD_PROJECT?.startsWith('demo-') === true } });
}

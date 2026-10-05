import { HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import type { Owner, Scope } from '../../../packages/contracts/src/index.js';
import { generateReportInputSchema, listReportsInputSchema, reportIdInputSchema, reportSchema, reportExportSchema, reportsResponseSchema } from '../../../packages/contracts/src/reports.js';
import { db } from '../shared/admin.js';
import { digest, ownerMutation } from '../shared/mutation.js';
import { appDefinitions } from './registry.js';
import { buildOperationsReport } from '../reports/snapshot.js';
import { reportCsv } from '../reports/export.js';

function canonical(scope: Scope): Scope { return { ...scope, from: new Date(scope.from).toISOString(), to: new Date(scope.to).toISOString() }; }
const root = (owner: Owner) => db.collection('owners').doc(owner.uid);
function projection(value: Record<string, unknown>) { return reportSchema.parse(Object.fromEntries(Object.keys(reportSchema.shape).map(key => [key, value[key]]))); }
async function readerAccess(owner: Owner) {
  const snapshot = await db.doc(`ownerAccess/${owner.uid}`).get();
  if (snapshot.get('enabled') !== true || snapshot.get('role') !== 'owner' || snapshot.get('email') !== owner.email) throw new HttpsError('permission-denied', 'Access unavailable.');
}
export async function generateReport(input: unknown, owner: Owner) {
  const request = generateReportInputSchema.parse(input); const scope = canonical(request.scope);
  const apps = (await appDefinitions()).filter(app => scope.appId === 'all' || app.id === scope.appId);
  if (!apps.length) throw new HttpsError('not-found', 'Application unavailable.');
  const id = digest(`${owner.uid}:operations-report:${request.idempotencyKey}`);
  const scopeRef = root(owner).collection('operationReportScopes').doc(digest(JSON.stringify(scope)));
  return ownerMutation(owner, request.idempotencyKey, 'reports.generate', { scope }, async tx => {
    const [counter, snapshots, ...marks] = await Promise.all([
      tx.get(scopeRef),
      tx.get(db.collection('operationsSnapshots').where('scope.to', '>', scope.from).where('scope.to', '<=', scope.to).orderBy('scope.to', 'desc').limit(201)),
      ...apps.map(app => tx.get(db.doc(`connectorCheckpoints/operations_metrics_v1_${app.id}`))),
    ]);
    const previous = counter.get('version') ?? 0;
    if (!Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) throw new HttpsError('failed-precondition', 'Report version unavailable.');
    const watermarks = Object.fromEntries(apps.map((app, index) => [app.id, marks[index]!.get('cursor') ?? null]));
    const sourceCutoff = counter.readTime.toDate().toISOString();
    const report = buildOperationsReport({ id, version: previous + 1, scope, cutoff: sourceCutoff, apps, watermarks,
      snapshots: snapshots.docs.slice(0, 200).map(snapshot => ({ id: snapshot.id, value: snapshot.data() })), truncated: snapshots.size > 200, fixture: process.env.GCLOUD_PROJECT?.startsWith('demo-') === true });
    tx.create(root(owner).collection('operationReports').doc(id), { ...report, actorUid: owner.uid, actorEmail: owner.email, createdAt: FieldValue.serverTimestamp(), scopeKey: scopeRef.id });
    tx.set(scopeRef, { version: report.version, lastReportId: id, changedAt: FieldValue.serverTimestamp() });
    return report;
  });
}
export async function getReport(input: unknown, owner: Owner) {
  const { id } = reportIdInputSchema.parse(input); await readerAccess(owner);
  const snapshot = await root(owner).collection('operationReports').doc(id).get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Report unavailable.');
  const report = projection(snapshot.data()!);
  if (report.id !== id) throw new HttpsError('failed-precondition', 'Report identity mismatch.');
  return report;
}
export async function listReports(input: unknown, owner: Owner) {
  const { scope: original, limit } = listReportsInputSchema.parse(input); const scope = canonical(original); await readerAccess(owner);
  // Single-field bounded scan avoids a new composite index/deployment requirement.
  const snapshots = await root(owner).collection('operationReports').orderBy('createdAt', 'desc').limit(51).get();
  const matching = snapshots.docs.slice(0, 50).map(snapshot => projection(snapshot.data())).filter(report => report.scope.appId === scope.appId && report.scope.environment === scope.environment && report.scope.timezone === scope.timezone && Date.parse(report.scope.from) < Date.parse(scope.to) && Date.parse(report.scope.to) > Date.parse(scope.from));
  return reportsResponseSchema.parse({ data: matching.slice(0, limit), meta: { scope, fetchedAt: new Date().toISOString(), historyTruncated: snapshots.size > 50 || matching.length > limit } });
}
export async function exportReport(input: unknown, owner: Owner) {
  const { id } = reportIdInputSchema.parse(input);
  return db.runTransaction(async tx => {
    const [access, snapshot] = await Promise.all([tx.get(db.doc(`ownerAccess/${owner.uid}`)), tx.get(root(owner).collection('operationReports').doc(id))]);
    if (access.get('enabled') !== true || access.get('role') !== 'owner' || access.get('email') !== owner.email) throw new HttpsError('permission-denied', 'Access unavailable.');
    if (!snapshot.exists) throw new HttpsError('not-found', 'Report unavailable.');
    const report = projection(snapshot.data()!);
    if (report.id !== id) throw new HttpsError('failed-precondition', 'Report identity mismatch.');
    tx.create(db.collection('auditEvents').doc(), { action: 'reports.export', reportId: id, reportVersion: report.version, actorUid: owner.uid, actorEmail: owner.email, receivedAt: FieldValue.serverTimestamp() });
    return reportExportSchema.parse({ id: report.id, version: report.version, filename: `operations-report-v${report.version}-${report.id.slice(0, 12)}.csv`, csv: reportCsv(report) });
  });
}

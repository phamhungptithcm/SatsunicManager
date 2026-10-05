import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { db, auth } from '../../functions/src/shared/admin';
import { digest } from '../../functions/src/shared/mutation';
import { generateReport, getReport, listReports, exportReport } from '../../functions/src/api/reports';
import { reportCsv } from '../../functions/src/reports/export';
import type { Owner } from '../../packages/contracts/src/index';

const paths = new Set<string>();
const owners: string[] = [];
const originalFunctionsEmulator = process.env.FUNCTIONS_EMULATOR;
beforeAll(() => {
  if (process.env.GCLOUD_PROJECT !== 'demo-satsunicmanager' || !/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? '')) throw Error('Local demo Firestore only');
});
afterEach(async () => {
  if (originalFunctionsEmulator === undefined) delete process.env.FUNCTIONS_EMULATOR; else process.env.FUNCTIONS_EMULATOR = originalFunctionsEmulator;
  for (const uid of owners.splice(0)) {
    const events = await db.collection('auditEvents').where('actorUid', '==', uid).get();
    events.docs.forEach(event => paths.add(event.ref.path));
  }
  await Promise.all([...paths].map(path => db.doc(path).delete())); paths.clear();
});
async function owner(): Promise<Owner> {
  const value: Owner = { uid: `report-fixture-${randomUUID()}`, email: 'hunpeo97@gmail.com', role: 'owner' };
  owners.push(value.uid); paths.add(`ownerAccess/${value.uid}`);
  await db.doc(`ownerAccess/${value.uid}`).set({ ...value, enabled: true }); return value;
}
describe('Owner-private immutable version reports, local fixtures', () => {
  it('callable domain Auth rejects anonymous/outsider/disabled/revoked demo sessions', async () => {
    if (!/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '')) throw Error('Local demo Auth only');
    process.env.FUNCTIONS_EMULATOR = 'true';
    const api = await import('../../functions/src/index');
    const endpoints = [api.generateOperationsReport, api.getOperationsReport, api.listOperationsReports, api.exportOperationsReportCsv];
    const uid = `reports-auth-${randomUUID()}`; const now = Math.floor(Date.now() / 1000);
    const request = (email: string) => {
      const payload = { aud: 'demo-satsunicmanager', iss: 'https://securetoken.google.com/demo-satsunicmanager', sub: uid, user_id: uid, email, email_verified: true, auth_time: now - 60, iat: now, exp: now + 3600, firebase: { sign_in_provider: 'google.com' } };
      const token = ['eyJhbGciOiJub25lIn0', Buffer.from(JSON.stringify(payload)).toString('base64url'), ''].join('.');
      return { data: {}, auth: { uid, token: payload }, rawRequest: { headers: { authorization: `Bearer ${token}` } } } as unknown as Parameters<typeof api.generateOperationsReport.run>[0];
    };
    for (const endpoint of endpoints) await expect(endpoint.run({ data: {}, rawRequest: { headers: {} } } as Parameters<typeof api.generateOperationsReport.run>[0])).rejects.toMatchObject({ code: 'unauthenticated' });
    try {
      await auth.createUser({ uid });
      for (const endpoint of endpoints) await expect(endpoint.run(request('outsider@example.test'))).rejects.toMatchObject({ code: 'permission-denied' });
      paths.add(`ownerAccess/${uid}`);
      await db.doc(`ownerAccess/${uid}`).set({ enabled: false, email: 'hunpeo97@gmail.com', role: 'owner' });
      for (const endpoint of endpoints) await expect(endpoint.run(request('hunpeo97@gmail.com'))).rejects.toMatchObject({ code: 'permission-denied' });
      await db.doc(`ownerAccess/${uid}`).update({ enabled: true }); await auth.revokeRefreshTokens(uid);
      for (const endpoint of endpoints) await expect(endpoint.run(request('hunpeo97@gmail.com'))).rejects.toMatchObject({ code: 'unauthenticated' });
    } finally { await auth.deleteUser(uid).catch(() => undefined); }
  });
  it('deduplicates concurrent generation, creates new versions, preserves exact CSV/PII boundary and frozen scope', async () => {
    const actor = await owner(); const other = await owner();
    const start = Date.parse('2025-01-01T00:00:00.000Z'); const hour = 3600000;
    const iso = (offset: number) => new Date(start + offset).toISOString();
    const scope = { appId: 'hunpeolabs', environment: 'production', from: iso(0), to: iso(2 * hour), timezone: 'America/Chicago' } as const;
    const sourceIds = [digest(randomUUID()), digest(randomUUID())];
    for (const [index, id] of sourceIds.entries()) {
      paths.add(`operationsSnapshots/${id}`);
      await db.doc(`operationsSnapshots/${id}`).set({ id, scope: { ...scope, from: iso(index * hour), to: iso((index + 1) * hour) }, status: 'complete', fixture: true, queryVersion: 'collector-v1', createdAt: Timestamp.now(), data: [{ appId: 'hunpeolabs', projectId: 'hunpeolabs-prod', services: ['hunpeolabs'], metrics: { status: 'available', requestCount: 10, serverErrorCount: 0, errorRate: 0, points: [{ at: iso((index + 1) * hour), requests: 10, errors: 0 }], reason: null }, provenance: { provider: 'Google Cloud', resourceRef: 'projects/hunpeolabs-prod', queryVersion: 'operations-v1', metricDefinitionVersion: 'cloud-run-requests-v1' }, freshness: { fetchedAt: iso(3 * hour), observedThrough: iso((index + 1) * hour) } }] });
    }
    const keys = [randomUUID(), randomUUID(), randomUUID()];
    for (const key of keys) paths.add(`idempotencyRecords/${digest(`${actor.uid}:reports.generate:${key}`)}`);
    const request = { scope, idempotencyKey: keys[0] };
    const [first, duplicate] = await Promise.all([generateReport(request, actor), generateReport(request, actor)]);
    paths.add(`owners/${actor.uid}/operationReports/${first.id}`);
    paths.add(`owners/${actor.uid}/operationReportScopes/${digest(JSON.stringify(first.scope))}`);
    expect(first).toEqual(duplicate); expect(first.version).toBe(1);
    expect(first.sources[0]!.totals.requestCount).toBe(20);
    const next = await Promise.all(keys.slice(1).map(idempotencyKey => generateReport({ scope, idempotencyKey }, actor)));
    next.forEach(report => paths.add(`owners/${actor.uid}/operationReports/${report.id}`));
    expect(next.map(report => report.version).sort()).toEqual([2, 3]);
    const persisted = await getReport({ id: first.id }, actor); expect(persisted).toEqual(first);
    const csv = await exportReport({ id: first.id }, actor); expect(csv.version).toBe(1); expect(csv.csv).toBe(reportCsv(first));
    const audit = await db.collection('auditEvents').where('actorUid', '==', actor.uid).get();
    expect(audit.docs.filter(event => event.get('action') === 'reports.generate')).toHaveLength(3);
    expect(audit.docs.some(event => event.get('action') === 'reports.export' && event.get('reportVersion') === 1)).toBe(true);
    expect(JSON.stringify(persisted)).not.toContain(actor.email); expect(JSON.stringify(persisted)).not.toContain('actorUid');
    await expect(getReport({ id: first.id }, other)).rejects.toMatchObject({ code: 'not-found' });
    await expect(exportReport({ id: first.id }, other)).rejects.toMatchObject({ code: 'not-found' });
    const rolling = { ...scope, from: iso(hour), to: iso(3 * hour) };
    const history = await listReports({ scope: rolling, limit: 10 }, actor);
    expect(history.data).toHaveLength(3); expect(history.data.every(report => report.scope.to === scope.to)).toBe(true);
    await expect(generateReport({ scope: rolling, idempotencyKey: keys[0] }, actor)).rejects.toMatchObject({ code: 'already-exists' });
    await db.doc(`ownerAccess/${actor.uid}`).update({ enabled: false });
    await expect(getReport({ id: first.id }, actor)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(exportReport({ id: first.id }, actor)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(generateReport({ scope, idempotencyKey: randomUUID() }, actor)).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('rejects unregistered scope/injection and produces explicit missing sources rather than zero', async () => {
    const actor = await owner(); const scope = { appId: 'befam', environment: 'production', from: '2025-02-01T00:00:00.000Z', to: '2025-02-02T00:00:00.000Z', timezone: 'America/Chicago' } as const;
    const key = randomUUID(); paths.add(`idempotencyRecords/${digest(`${actor.uid}:reports.generate:${key}`)}`);
    const report = await generateReport({ scope, idempotencyKey: key }, actor);
    paths.add(`owners/${actor.uid}/operationReports/${report.id}`); paths.add(`owners/${actor.uid}/operationReportScopes/${digest(JSON.stringify(report.scope))}`);
    expect(report.coverage.status).toBe('missing'); expect(report.sources[0]).toMatchObject({ status: 'not_configured', totals: { requestCount: null }, intervals: [] });
    await expect(generateReport({ scope, idempotencyKey: randomUUID(), projectId: 'injected' }, actor)).rejects.toThrow();
    await expect(generateReport({ scope: { ...scope, appId: 'unregistered_fixture' }, idempotencyKey: randomUUID() }, actor)).rejects.toMatchObject({ code: 'not-found' });
    await expect(getReport({ id: '../other' }, actor)).rejects.toThrow();
  });
});

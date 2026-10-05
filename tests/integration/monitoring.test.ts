import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { db, auth } from '../../functions/src/shared/admin';
import { runMonitoringCollection, settledMonitoringThrough, validateMonitoringTransport } from '../../functions/src/sync/monitoring';
import { monitoringSnapshots } from '../../functions/src/api/monitoring';
import { monitoringInputSchema } from '../../packages/contracts/src/monitoring';
import type { GoogleReader } from '../../functions/src/integrations/google-read';

const ids = ['hunpeolabs', 'satsunicseo', 'satsunicplan'];
const created = new Set<string>();
const originalEnabled = process.env.MANAGER_COLLECTOR_ENABLED;
const originalFunctionsEmulator = process.env.FUNCTIONS_EMULATOR;
beforeAll(() => {
  if (process.env.GCLOUD_PROJECT !== 'demo-satsunicmanager' || !/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? '') || !/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '')) throw Error('Local demo emulators only');
});
afterEach(async () => {
  if (originalFunctionsEmulator === undefined) delete process.env.FUNCTIONS_EMULATOR; else process.env.FUNCTIONS_EMULATOR = originalFunctionsEmulator;
  if (originalEnabled === undefined) delete process.env.MANAGER_COLLECTOR_ENABLED; else process.env.MANAGER_COLLECTOR_ENABLED = originalEnabled;
  for (const id of ids) for (const collection of ['connectorJobs', 'connectorStatuses', 'connectorCheckpoints']) created.add(`${collection}/operations_metrics_v1_${id}`);
  await Promise.all([...created].map(path => db.doc(path).delete())); created.clear();
});
async function trackRuns(result: { results: Array<{ runId: string | null }> }) {
  for (const row of result.results) {
    if (!row.runId) continue;
    created.add(`operationsCollectionRuns/${row.runId}`); created.add(`operationsSnapshots/${row.runId}`);
    const run = await db.doc(`operationsCollectionRuns/${row.runId}`).get();
    const base = run.get('baseWindowId');
    if (typeof base === 'string') created.add(`operationsCollectionWindows/${base}`);
  }
}
describe('Independent scheduled monitoring and owner projection, demo fixtures only', () => {
  it('ignores no injected authority: transport rejects app/window/URL body and non-POST', () => {
    expect(() => validateMonitoringTransport('POST', {})).not.toThrow();
    expect(() => validateMonitoringTransport('GET', {})).toThrow('POST required.');
    for (const body of [{ appId: 'befam' }, { from: '2020-01-01' }, { url: 'http://127.0.0.1' }, ['hunpeolabs']]) expect(() => validateMonitoringTransport('POST', body)).toThrow('Collection input unavailable.');
    expect(monitoringInputSchema.safeParse({ scope: {}, projectId: 'injected' }).success).toBe(false);
  });
  it('keeps partial app checkpoint independent; retries immutable failure and recovers gaps one hour at a time', async () => {
    process.env.MANAGER_COLLECTOR_ENABLED = 'true';
    const through = Math.floor((Date.now() - 7200000) / 900000) * 900000;
    const old = new Date(through - 3 * 3600000).toISOString();
    for (const id of ids) await db.doc(`connectorCheckpoints/operations_metrics_v1_${id}`).set({ cursor: old });
    let calls = 0;
    const partialReader: GoogleReader = async url => {
      calls++; expect(url).toContain('monitoring.googleapis.com'); expect(url).not.toContain('logging');
      return url.includes('/hunpeolabs-prod/') ? { status: 200, data: { timeSeries: [], nextPageToken: 'partial' } } : { status: 200, data: { timeSeries: [] } };
    };
    try {
      const first = await runMonitoringCollection(partialReader, through + 300000); await trackRuns(first);
      expect(first.results.map(row => row.status)).toEqual(['failed', 'complete', 'complete']);
      expect(calls).toBe(3);
      expect((await db.doc('connectorCheckpoints/operations_metrics_v1_hunpeolabs').get()).get('cursor')).toBe(old);
      for (const id of ids.slice(1)) expect((await db.doc(`connectorCheckpoints/operations_metrics_v1_${id}`).get()).get('cursor')).toBe(new Date(through - 2 * 3600000).toISOString());
      const firstFailure = (await db.doc(`operationsCollectionRuns/${first.results[0]!.runId}`).get()).data();
      const second = await runMonitoringCollection(async () => ({ status: 200, data: { timeSeries: [] } }), through + 300000); await trackRuns(second);
      expect(second.results.map(row => row.status)).toEqual(['complete', 'complete', 'complete']);
      expect(second.results[0]!.runId).not.toBe(first.results[0]!.runId);
      expect((await db.doc(`operationsCollectionRuns/${first.results[0]!.runId}`).get()).data()).toEqual(firstFailure);
      expect((await db.doc('connectorCheckpoints/operations_metrics_v1_hunpeolabs').get()).get('cursor')).toBe(new Date(through - 2 * 3600000).toISOString());
      const view = await monitoringSnapshots({ scope: { appId: 'all', environment: 'production', from: old, to: new Date(through + 1000).toISOString(), timezone: 'America/Chicago' }, limit: 1 });
      expect(view.meta).toMatchObject({ fixture: true, historyCoverage: 'bounded_recent', historyTruncated: true });
      expect(view.data.find(row => row.appId === 'befam')).toMatchObject({ status: 'not_configured', history: [] });
      expect(view.data.find(row => row.appId === 'hunpeolabs')!.latestAttempt!.data[0]!.metrics.requestCount).toBeNull();
      expect(JSON.stringify(view)).not.toContain('logs');
      await expect(monitoringSnapshots({ scope: { appId: 'all', environment: 'production', from: old, to: new Date(through).toISOString(), timezone: 'America/Chicago' }, limit: 11 })).rejects.toThrow();
    } finally { /* afterEach removes only explicitly tracked fixture paths. */ }
  });
  it('does not refetch completed window and rejects malformed cursor independently', async () => {
    process.env.MANAGER_COLLECTOR_ENABLED = 'true';
    const through = Math.floor((Date.now() - 900000) / 900000) * 900000;
    let calls = 0;
    const reader: GoogleReader = async () => { calls++; return { status: 200, data: { timeSeries: [] } }; };
    try {
      await trackRuns(await runMonitoringCollection(reader, through + 300000));
      const duplicate = await runMonitoringCollection(reader, through + 300000);
      expect(duplicate.results.every(row => row.status === 'up_to_date')).toBe(true); expect(calls).toBe(3);
      await db.doc('connectorCheckpoints/operations_metrics_v1_hunpeolabs').set({ cursor: 'invalid' });
      const invalid = await runMonitoringCollection(reader, through + 300000);
      expect(invalid.results[0]).toMatchObject({ status: 'failed', reason: 'failed-precondition' }); expect(calls).toBe(3);
    } finally { /* afterEach removes only explicitly tracked fixture paths. */ }
  });
  it('does not finalize the newest quarter until the five-minute settlement delay has elapsed', async () => {
    process.env.MANAGER_COLLECTOR_ENABLED = 'true';
    const quarter = Math.floor((Date.now() - 3600000) / 900000) * 900000;
    expect(settledMonitoringThrough(quarter)).toBe(quarter - 900000);
    expect(settledMonitoringThrough(quarter + 300000 - 1)).toBe(quarter - 900000);
    expect(settledMonitoringThrough(quarter + 300000)).toBe(quarter);
    const ends: string[] = [];
    const reader: GoogleReader = async url => { ends.push(new URL(url).searchParams.get('interval.endTime')!); return { status: 200, data: { timeSeries: [] } }; };
    const unsettled = await runMonitoringCollection(reader, quarter + 300000 - 1); await trackRuns(unsettled);
    expect(ends).toHaveLength(3);
    expect(ends.every(end => end === new Date(quarter - 900000).toISOString())).toBe(true);
    for (const id of ids) expect((await db.doc(`connectorCheckpoints/operations_metrics_v1_${id}`).get()).get('cursor')).toBe(new Date(quarter - 900000).toISOString());
    const settled = await runMonitoringCollection(reader, quarter + 300000); await trackRuns(settled);
    expect(ends.slice(3).every(end => end === new Date(quarter).toISOString())).toBe(true);
    for (const id of ids) expect((await db.doc(`connectorCheckpoints/operations_metrics_v1_${id}`).get()).get('cursor')).toBe(new Date(quarter).toISOString());
  });
  it('retains initial failed coverage when the next scheduled tick has no successful checkpoint', async () => {
    process.env.MANAGER_COLLECTOR_ENABLED = 'true';
    const through = Math.floor((Date.now() - 3600000) / 900000) * 900000;
    const first = await runMonitoringCollection(async url => url.includes('/hunpeolabs-prod/')
      ? { status: 403, data: null } : { status: 200, data: { timeSeries: [] } }, through + 300000);
    await trackRuns(first);
    expect((await db.doc('connectorCheckpoints/operations_metrics_v1_hunpeolabs').get()).exists).toBe(false);
    const second = await runMonitoringCollection(async () => ({ status: 200, data: { timeSeries: [] } }), through + 900000 + 300000);
    await trackRuns(second);
    const recovered = await db.doc(`operationsCollectionRuns/${second.results[0]!.runId}`).get();
    expect(recovered.get('scope').from).toBe(new Date(through - 900000).toISOString());
    expect(recovered.get('scope').to).toBe(new Date(through + 900000).toISOString());
  });
  it('reader callable denies anonymous, outsider, disabled and revoked owner fixtures', async () => {
    // .run bypasses SDK transport: this demo-only fixture exercises domain Auth.
    // Real anonymous HTTP transport is checked separately by api.test.ts.
    process.env.FUNCTIONS_EMULATOR = 'true';
    const { listMonitoringSnapshots } = await import('../../functions/src/index');
    const now = Math.floor(Date.now() / 1000);
    const make = (uid: string, email: string) => {
      const payload = { aud: 'demo-satsunicmanager', iss: 'https://securetoken.google.com/demo-satsunicmanager', sub: uid, user_id: uid, email, email_verified: true, auth_time: now - 60, iat: now, exp: now + 3600, firebase: { sign_in_provider: 'google.com' } };
      const token = ['eyJhbGciOiJub25lIn0', Buffer.from(JSON.stringify(payload)).toString('base64url'), ''].join('.');
      return { data: {}, auth: { uid, token: payload }, rawRequest: { headers: { authorization: `Bearer ${token}` } } } as unknown as Parameters<typeof listMonitoringSnapshots.run>[0];
    };
    await expect(listMonitoringSnapshots.run({ data: {}, rawRequest: { headers: {} } } as Parameters<typeof listMonitoringSnapshots.run>[0])).rejects.toMatchObject({ code: 'unauthenticated' });
    const uid = 'monitoring-owner-fixture'; const outsider = 'monitoring-outsider-fixture';
    try {
      await auth.createUser({ uid });
      await auth.createUser({ uid: outsider, email: 'monitoring-outsider@example.test', emailVerified: true });
      await expect(listMonitoringSnapshots.run(make(outsider, 'monitoring-outsider@example.test'))).rejects.toMatchObject({ code: 'permission-denied' });
      await db.doc(`ownerAccess/${uid}`).set({ enabled: false, role: 'owner', email: 'hunpeo97@gmail.com' });
      await expect(listMonitoringSnapshots.run(make(uid, 'hunpeo97@gmail.com'))).rejects.toMatchObject({ code: 'permission-denied' });
      await db.doc(`ownerAccess/${uid}`).update({ enabled: true });
      await auth.revokeRefreshTokens(uid);
      await expect(listMonitoringSnapshots.run(make(uid, 'hunpeo97@gmail.com'))).rejects.toMatchObject({ code: 'unauthenticated' });
    } finally { await db.doc(`ownerAccess/${uid}`).delete(); await auth.deleteUser(uid).catch(() => undefined); await auth.deleteUser(outsider).catch(() => undefined); }
  });
});

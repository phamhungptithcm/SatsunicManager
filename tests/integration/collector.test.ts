import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { db } from '../../functions/src/shared/admin';
import { collectOperations } from '../../functions/src/sync/collector';
import type { GoogleReader } from '../../functions/src/integrations/google-read';

const priorEnabled = process.env.MANAGER_COLLECTOR_ENABLED;
const scope = (end: number) => ({ appId: 'hunpeolabs', environment: 'production', timezone: 'America/Chicago', from: new Date(end - 3600000).toISOString(), to: new Date(end).toISOString() } as const);
const jobId = 'operations_metrics_v1_hunpeolabs';
const paths: string[] = [];
beforeAll(() => {
  if (process.env.GCLOUD_PROJECT !== 'demo-satsunicmanager' || !/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? '')) throw Error('Local demo emulator only');
});
afterEach(async () => {
  if (priorEnabled === undefined) delete process.env.MANAGER_COLLECTOR_ENABLED; else process.env.MANAGER_COLLECTOR_ENABLED = priorEnabled;
  await Promise.all(paths.splice(0).map(path => db.doc(path).delete()));
});
function track(id: string, baseId = id) { paths.push(`operationsCollectionWindows/${baseId}`, `operationsCollectionRuns/${id}`, `operationsSnapshots/${id}`, `connectorJobs/${jobId}`, `connectorCheckpoints/${jobId}`, `connectorStatuses/${jobId}`); }
describe('Metrics-only internal collection, emulator fixtures', () => {
  it('blocks disabled collection before any reader invocation', async () => {
    delete process.env.MANAGER_COLLECTOR_ENABLED;
    let calls = 0;
    const result = await collectOperations(scope(Date.now()), async () => { calls++; return { status: 200, data: {} }; });
    expect(result.status).toBe('blocked'); expect(calls).toBe(0);
  });
  it('fences contention, deduplicates retry and retains previous success on source failure', async () => {
    process.env.MANAGER_COLLECTOR_ENABLED = 'true';
    const end = Date.now() - 3600000;
    let calls = 0;
    let unblock!: () => void;
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const waiting = new Promise<void>(resolve => { unblock = resolve; });
    const reader: GoogleReader = async url => {
      expect(url).toContain('monitoring.googleapis.com');
      calls++; started(); await waiting;
      return { status: 200, data: { timeSeries: [] } };
    };
    const first = collectOperations(scope(end), reader);
    await entered;
    expect((await collectOperations(scope(end), reader)).status).toBe('busy');
    unblock();
    const success = await first;
    expect(success.status).toBe('complete');
    if (!('id' in success)) throw Error('Missing run id');
    track(success.id);
    const snapshot = (await db.doc(`operationsSnapshots/${success.id}`).get()).data()!;
    expect(snapshot.data[0].metrics.status).toBe('empty');
    expect(snapshot.data[0].metrics.requestCount).toBeNull();
    expect(snapshot.data[0]).not.toHaveProperty('logs');
    expect(snapshot.fixture).toBe(true);
    const retry = await collectOperations(scope(end), reader);
    expect(retry).toMatchObject({ id: success.id, duplicate: true }); expect(calls).toBe(1);
    const failed = await collectOperations(scope(end + 1000), async () => ({ status: 403, data: null }));
    expect(failed.status).toBe('failed');
    if (!('id' in failed)) throw Error('Missing failure id');
    track(failed.id);
    expect((await db.doc(`operationsSnapshots/${failed.id}`).get()).exists).toBe(false);
    expect((await db.doc(`connectorCheckpoints/${jobId}`).get()).get('cursor')).toBe(scope(end).to);
    expect((await db.doc(`connectorStatuses/${jobId}`).get()).get('lastSuccessfulSnapshotId')).toBe(success.id);
    expect((await db.doc(`operationsCollectionRuns/${failed.id}`).get()).get('data')[0].metrics.status).toBe('permission_denied');
    const failedEvidence = (await db.doc(`operationsCollectionRuns/${failed.id}`).get()).data();
    let recoveryCalls = 0;
    const recoveryReader: GoogleReader = async () => { recoveryCalls++; return { status: 200, data: { timeSeries: [] } }; };
    const recovered = await collectOperations(scope(end + 1000), recoveryReader);
    if (!('id' in recovered)) throw Error('Missing recovered id');
    track(recovered.id, failed.id);
    expect(recovered.status).toBe('complete'); expect(recovered.id).not.toBe(failed.id);
    expect((await db.doc(`operationsCollectionRuns/${failed.id}`).get()).data()).toEqual(failedEvidence);
    expect((await db.doc(`connectorCheckpoints/${jobId}`).get()).get('cursor')).toBe(scope(end + 1000).to);
    expect(await collectOperations(scope(end + 1000), recoveryReader)).toMatchObject({ id: recovered.id, duplicate: true });
    expect(recoveryCalls).toBe(1);
    const partial = await collectOperations(scope(end + 2000), async () => ({ status: 200, data: { timeSeries: [], nextPageToken: 'incomplete' } }));
    if (!('id' in partial)) throw Error('Missing partial id');
    track(partial.id); expect(partial.status).toBe('failed');
    expect((await db.doc(`connectorCheckpoints/${jobId}`).get()).get('cursor')).toBe(scope(end + 1000).to);
  });
  it('rejects gaps before reads, accepts overlap and compares equivalent timestamp precision numerically', async () => {
    process.env.MANAGER_COLLECTOR_ENABLED = 'true';
    const checkpoint = db.doc(`connectorCheckpoints/${jobId}`);
    paths.push(checkpoint.path, `connectorJobs/${jobId}`, `connectorStatuses/${jobId}`);
    const end = Math.floor((Date.now() - 3600000) / 1000) * 1000 + 100;
    const previous = new Date(end).toISOString().replace('.100Z', '.1Z');
    await checkpoint.set({ cursor: previous });
    let calls = 0;
    const reader: GoogleReader = async () => { calls++; return { status: 200, data: { timeSeries: [] } }; };
    await expect(collectOperations({ ...scope(end + 2000), from: new Date(end + 1000).toISOString() }, reader)).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(calls).toBe(0);
    // .1Z and .100Z denote the same boundary; a lexical comparison misorders them.
    const boundary = { ...scope(end + 2000), from: new Date(end).toISOString() };
    const result = await collectOperations(boundary, reader);
    if (!('id' in result)) throw Error('Missing boundary id');
    track(result.id); expect(result.status).toBe('complete'); expect(calls).toBe(1);
    const equivalent = { ...boundary, from: previous };
    expect(await collectOperations(equivalent, reader)).toMatchObject({ id: result.id, duplicate: true });
    expect(calls).toBe(1);
    const overlap = await collectOperations({ ...scope(end + 4000), from: new Date(end + 1000).toISOString() }, reader);
    if (!('id' in overlap)) throw Error('Missing overlap id');
    track(overlap.id); expect(overlap.status).toBe('complete');
    await checkpoint.set({ cursor: 'invalid' });
    await expect(collectOperations(scope(end + 5000), reader)).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(calls).toBe(2);
    await checkpoint.set({ cursor: 123 });
    await expect(collectOperations(scope(end + 6000), reader)).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(calls).toBe(2);
  });
  it('rejects unverified app scope and excessively wide collection window without reads', async () => {
    process.env.MANAGER_COLLECTOR_ENABLED = 'true';
    let calls = 0; const reader: GoogleReader = async () => { calls++; return { status: 200, data: {} }; };
    await expect(collectOperations({ ...scope(Date.now()), appId: 'befam' }, reader)).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(collectOperations({ ...scope(Date.now()), from: new Date(Date.now() - 7200000).toISOString() }, reader)).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(calls).toBe(0);
  });
});

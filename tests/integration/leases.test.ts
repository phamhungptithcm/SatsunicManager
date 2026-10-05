import { beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../../functions/src/shared/admin';
import { acquireLease, renewLease, releaseLease, completeLeaseRun } from '../../functions/src/shared/leases';

beforeAll(() => {
  if (process.env.GCLOUD_PROJECT !== 'demo-satsunicmanager' ||
      !/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? '')) throw Error('Local demo emulator only');
});
describe('Durable worker lease and checkpoint transactions, emulator only', () => {
  it('admits one contender, renews, and fences stale workers after expiry takeover', async () => {
    const id = `lease_${randomUUID()}`;
    const ref = db.doc(`connectorJobs/${id}`);
    try {
      const contenders = await Promise.all(Array.from({ length: 5 }, () => acquireLease(id)));
      const winners = contenders.filter(x => x !== null);
      expect(winners).toHaveLength(1);
      const first = winners[0]!;
      await renewLease(first, 120000);
      expect((await ref.get()).get('expiresAt').toMillis()).toBeGreaterThan(Date.now() + 60000);
      // Controlled persisted expiry avoids sleeps and cannot contact production.
      await ref.update({ expiresAt: Timestamp.fromMillis(0) });
      await expect(renewLease(first)).rejects.toMatchObject({ code: 'aborted' });
      const second = (await acquireLease(id))!;
      expect(second.revision).toBe(first.revision + 1);
      expect(second.token).not.toBe(first.token);
      await expect(releaseLease(first)).rejects.toMatchObject({ code: 'aborted' });
      await expect(renewLease(first)).rejects.toMatchObject({ code: 'aborted' });
      await expect(completeLeaseRun(first, { complete: true, cursor: 'stale' }, async () => undefined)).rejects.toMatchObject({ code: 'aborted' });
      expect((await db.doc(`connectorCheckpoints/${id}`).get()).exists).toBe(false);
      await releaseLease(second);
      const third = (await acquireLease(id))!;
      expect(third.revision).toBe(second.revision + 1);
      await releaseLease(third);
    } finally { await ref.delete(); await db.doc(`connectorCheckpoints/${id}`).delete(); }
  });
  it('commits data and cursor together; partial or failed persistence never advances cursor', async () => {
    const id = `lease_${randomUUID()}`;
    const ref = db.doc(`connectorJobs/${id}`);
    const checkpoint = db.doc(`connectorCheckpoints/${id}`);
    const output = db.doc(`leaseTestOutputs/${id}`);
    try {
      await checkpoint.set({ cursor: 'previous', leaseRevision: 0 });
      const lease = (await acquireLease(id))!;
      let invoked = false;
      await expect(completeLeaseRun(lease, { complete: false, cursor: 'partial' }, async () => { invoked = true; })).rejects.toMatchObject({ code: 'failed-precondition' });
      expect(invoked).toBe(false);
      await expect(completeLeaseRun(lease, { complete: true, cursor: 'failed' }, async tx => { tx.set(output, { invalid: true }); throw Error('Persistence failed'); })).rejects.toThrow('Persistence failed');
      expect((await checkpoint.get()).get('cursor')).toBe('previous');
      expect((await output.get()).exists).toBe(false);
      await completeLeaseRun(lease, { complete: true, cursor: 'next' }, async tx => { tx.set(output, { valid: true }); });
      expect((await checkpoint.get()).get('cursor')).toBe('next');
      expect((await checkpoint.get()).get('committedAt')).toBeInstanceOf(Timestamp);
      expect((await output.get()).get('valid')).toBe(true);
      await expect(releaseLease(lease)).rejects.toMatchObject({ code: 'aborted' });
    } finally { await ref.delete(); await checkpoint.delete(); await output.delete(); }
  });
  it('bounds duration and rejects unsafe job identifiers', async () => {
    await expect(acquireLease('../other')).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(acquireLease(`lease_${randomUUID()}`, 300001)).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(acquireLease(`lease_${randomUUID()}`, 999)).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});

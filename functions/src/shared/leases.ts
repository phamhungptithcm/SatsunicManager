import { randomUUID } from 'node:crypto';
import { FieldValue, Timestamp, type Transaction, type DocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from './admin.js';

export type WorkerLease = { jobId: string; token: string; revision: number };
const jobRef = (id: string) => {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new HttpsError('invalid-argument', 'Invalid job.');
  return db.doc(`connectorJobs/${id}`);
};
function duration(ms: number) {
  if (!Number.isInteger(ms) || ms < 1000 || ms > 300000) throw new HttpsError('invalid-argument', 'Invalid lease duration.');
  return ms;
}
function active(snapshot: DocumentSnapshot, lease: WorkerLease) {
  const expires = snapshot.get('expiresAt');
  if (!snapshot.exists || snapshot.get('token') !== lease.token || snapshot.get('revision') !== lease.revision ||
      !(expires instanceof Timestamp) || expires.toMillis() <= snapshot.readTime.toMillis()) {
    throw new HttpsError('aborted', 'Worker lease unavailable.');
  }
}

export async function acquireLease(jobId: string, ttlMs = 60000): Promise<WorkerLease | null> {
  const ref = jobRef(jobId); duration(ttlMs);
  const token = randomUUID();
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const expires = snapshot.get('expiresAt');
    if (snapshot.get('token') && expires instanceof Timestamp && expires.toMillis() > snapshot.readTime.toMillis()) return null;
    const previous = snapshot.get('revision') ?? 0;
    if (!Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) throw new HttpsError('failed-precondition', 'Invalid job state.');
    const revision = previous + 1;
    tx.set(ref, { token, revision, expiresAt: Timestamp.fromMillis(snapshot.readTime.toMillis() + ttlMs), changedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { jobId, token, revision };
  });
}

export async function renewLease(lease: WorkerLease, ttlMs = 60000) {
  const ref = jobRef(lease.jobId); duration(ttlMs);
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); active(snapshot, lease);
    tx.update(ref, { expiresAt: Timestamp.fromMillis(snapshot.readTime.toMillis() + ttlMs), changedAt: FieldValue.serverTimestamp() });
  });
}

export async function releaseLease(lease: WorkerLease) {
  const ref = jobRef(lease.jobId);
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); active(snapshot, lease);
    tx.update(ref, { token: null, expiresAt: snapshot.readTime, changedAt: FieldValue.serverTimestamp() });
  });
}

// Call only after a complete provider page is validated. The callback must perform
// transaction reads/writes only: Firestore may retry it. No network/provider calls.
// Its writes and the checkpoint commit atomically; failures never advance progress.
export async function completeLeaseRun<T>(lease: WorkerLease, result: { complete: boolean; cursor: string | null }, persist: (tx: Transaction) => Promise<T>): Promise<T> {
  if (result.complete !== true || (result.cursor !== null && (typeof result.cursor !== 'string' || result.cursor.length > 4096))) {
    throw new HttpsError('failed-precondition', 'Complete source page required.');
  }
  const ref = jobRef(lease.jobId);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); active(snapshot, lease);
    const value = await persist(tx);
    tx.set(db.doc(`connectorCheckpoints/${lease.jobId}`), { cursor: result.cursor, leaseRevision: lease.revision, committedAt: FieldValue.serverTimestamp() });
    tx.update(ref, { token: null, expiresAt: snapshot.readTime, changedAt: FieldValue.serverTimestamp(), lastSuccessAt: FieldValue.serverTimestamp() });
    return value;
  });
}

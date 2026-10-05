import { FieldValue } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../shared/admin.js';
import { verifiedToken } from './authorize.js';
import { assertRecentAuth } from './policy.js';
import { ownerSchema } from '../../../packages/contracts/src/index.js';

export async function bootstrap(request: CallableRequest) {
  const token = await verifiedToken(request);
  const email = token.email!.trim().toLowerCase();
  const accessRef = db.doc(`ownerAccess/${token.uid}`);
  const bindingRef = db.doc(`ownerBindings/${email}`);
  await db.runTransaction(async tx => {
    const [binding, access] = await Promise.all([tx.get(bindingRef), tx.get(accessRef)]);
    if ((binding.exists && binding.get('uid') !== token.uid) || (access.exists && (access.get('enabled') !== true || access.get('role') !== 'owner' || access.get('email') !== email))) {
      throw new HttpsError('permission-denied', 'Access unavailable.');
    }
    if (!binding.exists) tx.create(bindingRef, { uid: token.uid, schemaVersion: 1, createdDate: FieldValue.serverTimestamp() });
    if (!access.exists) {
      if (!assertRecentAuth(token.auth_time, Date.now() / 1000)) throw new HttpsError('unauthenticated', 'Sign in again.');
      tx.create(accessRef, { uid: token.uid, email, enabled: true, role: 'owner', schemaVersion: 1, revision: 1,
        createdBy: token.uid, changedBy: token.uid, createdDate: FieldValue.serverTimestamp(), changedDate: FieldValue.serverTimestamp() });
      tx.create(db.collection('auditEvents').doc(), { action: 'owner.bootstrap', actorUid: token.uid, actorEmail: email,
        receivedAt: FieldValue.serverTimestamp(), schemaVersion: 1 });
    }
  });
  return ownerSchema.parse({ uid: token.uid, email, role: 'owner' });
}

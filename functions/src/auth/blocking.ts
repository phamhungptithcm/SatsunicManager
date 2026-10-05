import { beforeUserCreated, beforeUserSignedIn } from 'firebase-functions/v2/identity';
import { HttpsError } from 'firebase-functions/v2/https';
import { allowedIdentity } from './policy.js';
import { db } from '../shared/admin.js';
// Identity endpoints capture options when this module loads, before index.ts globals.
const options = { maxInstances: 2, concurrency: 8, timeoutSeconds: 7, memory: '256MiB' as const,
  ...(process.env.MANAGER_REGION ? { region: process.env.MANAGER_REGION } : {}),
  ...(process.env.MANAGER_API_SERVICE_ACCOUNT ? { serviceAccount: process.env.MANAGER_API_SERVICE_ACCOUNT } : {}) };
function requireConfiguration() {
  const emulator = process.env.FUNCTIONS_EMULATOR === 'true' && process.env.GCLOUD_PROJECT?.startsWith('demo-') === true;
  if (!emulator && (!process.env.MANAGER_REGION || !process.env.MANAGER_API_SERVICE_ACCOUNT)) {
    throw new HttpsError('failed-precondition', 'Service configuration unavailable.');
  }
}
export const beforeCreated = beforeUserCreated(options, event => {
  requireConfiguration();
  const provider = event.additionalUserInfo?.providerId;
  if (!allowedIdentity(event.data?.email, event.data?.emailVerified, provider)) throw new HttpsError('permission-denied', 'Access unavailable.');
});
export const beforeSignedIn = beforeUserSignedIn(options, async event => {
  requireConfiguration();
  if (!event.data || !allowedIdentity(event.data.email, event.data.emailVerified, event.additionalUserInfo?.providerId)) {
    throw new HttpsError('permission-denied', 'Access unavailable.');
  }
  const access = await db.doc(`ownerAccess/${event.data.uid}`).get();
  if (access.exists && access.get('enabled') !== true) throw new HttpsError('permission-denied', 'Access unavailable.');
});

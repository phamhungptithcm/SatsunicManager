import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { auth, db } from '../shared/admin.js';
import { allowedIdentity, assertRecentAuth } from './policy.js';
import type { Owner } from '../../../packages/contracts/src/index.js';

export async function verifiedToken(request: CallableRequest, recent = false): Promise<DecodedIdToken> {
  const header = request.rawRequest.headers.authorization;
  if (!request.auth || typeof header !== 'string' || !header.startsWith('Bearer ')) throw new HttpsError('unauthenticated', 'Sign in required.');
  let token: DecodedIdToken;
  try { token = await auth.verifyIdToken(header.slice(7), true); }
  catch { throw new HttpsError('unauthenticated', 'Sign in again.'); }
  const project = process.env.GCLOUD_PROJECT;
  if (!project || token.aud !== project || token.iss !== `https://securetoken.google.com/${project}`
    || token.uid !== request.auth.uid || !allowedIdentity(token.email, token.email_verified, token.firebase?.sign_in_provider)) {
    throw new HttpsError('permission-denied', 'Access unavailable.');
  }
  if (recent && !assertRecentAuth(token.auth_time, Date.now() / 1000)) throw new HttpsError('unauthenticated', 'Sign in again.');
  return token;
}
export async function authorize(request: CallableRequest, recent = false): Promise<Owner> {
  const token = await verifiedToken(request, recent);
  const access = await db.doc(`ownerAccess/${token.uid}`).get();
  if (!access.exists || access.get('enabled') !== true || access.get('email') !== token.email?.trim().toLowerCase()
    || access.get('role') !== 'owner') throw new HttpsError('permission-denied', 'Access unavailable.');
  return { uid: token.uid, email: token.email!.trim().toLowerCase(), role: 'owner' };
}

import { OWNER_EMAILS } from '../../../packages/contracts/src/index.js';

export function allowedIdentity(email: unknown, verified: unknown, provider: unknown): email is string {
  return typeof email === 'string' && verified === true && provider === 'google.com'
    && (OWNER_EMAILS as readonly string[]).includes(email.trim().toLowerCase());
}
export function assertRecentAuth(authTime: number, nowSeconds: number): boolean {
  return Number.isFinite(authTime) && authTime <= nowSeconds && nowSeconds - authTime <= 300;
}

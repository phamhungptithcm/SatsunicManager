import { describe, it, expect } from 'vitest';
import { allowedIdentity, assertRecentAuth } from '../../functions/src/auth/policy';
import { APP_CATALOG, connectionInputSchema, scopeSchema } from '../../packages/contracts/src/index';
import { publicAddress, validateResponse } from '../../functions/src/integrations/health';
import { targetsFor } from '../../functions/src/integrations/catalog';
describe('Identity boundary', () => {
  it.each(['hunpeo97@gmail.com', 'phamhung.pitit@gmail.com'])('accepts only verified Google owner %s', email => expect(allowedIdentity(email, true, 'google.com')).toBe(true));
  it.each(['hunpeo.97@gmail.com', 'hunpeo97+manager@gmail.com', 'hunpeo97@evil.com', 'other@gmail.com', '', undefined])('rejects alias or outsider %s', email => expect(allowedIdentity(email, true, 'google.com')).toBe(false));
  it.each(['password', 'anonymous', 'custom', 'github.com', undefined])('rejects alternate provider %s', provider => expect(allowedIdentity('hunpeo97@gmail.com', true, provider)).toBe(false));
  it('requires verification and bounds recent auth', () => {
    expect(allowedIdentity('hunpeo97@gmail.com', false, 'google.com')).toBe(false);
    expect(assertRecentAuth(999, 1000)).toBe(true); expect(assertRecentAuth(699, 1000)).toBe(false);
    expect(assertRecentAuth(1001, 1000)).toBe(false); expect(assertRecentAuth(NaN, 1000)).toBe(false);
  });
});
describe('Source and scope contracts', () => {
  it('has the seven approved products with the exact Mec name', () => expect(APP_CATALOG.map(a => a.name)).toEqual(['HunpeoLabs', 'SatsunicSEO', 'SatsunicCode', 'SatsunicPlan', 'BeFam', 'SatsunicGo', 'SatsunicMec']));
  it('never accepts browser URL/project injection', () => {
    const base = { appId: 'hunpeolabs', environment: 'production', revision: 0, idempotencyKey: '6673f306-2bf0-4446-8c64-cc641e632526' };
    expect(connectionInputSchema.safeParse(base).success).toBe(true);
    expect(connectionInputSchema.safeParse({ ...base, url: 'http://169.254.169.254' }).success).toBe(false);
    expect(connectionInputSchema.safeParse({ ...base, projectId: 'unregistered' }).success).toBe(false);
    expect(connectionInputSchema.safeParse({appId:'hunpeolabs',environment:'staging',revision:0,idempotencyKey:'6673f306-2bf0-4446-8c64-cc641e632526'}).success).toBe(false); expect(targetsFor('befam', 'production')).toEqual([]);
  });
  it('rejects backwards or unbounded date range', () => {
    const scope = { appId: 'all', environment: 'production', timezone: 'America/Chicago', from: '2026-01-01T00:00:00.000Z', to: '2026-02-01T00:00:00.000Z' };
    expect(scopeSchema.safeParse(scope).success).toBe(true);
    expect(scopeSchema.safeParse({ ...scope, to: '2025-12-01T00:00:00.000Z' }).success).toBe(false);
    expect(scopeSchema.safeParse({ ...scope, to: '2027-02-01T00:00:00.000Z' }).success).toBe(false);
  });
});
describe('Health probe security and semantics', () => {
  it.each(['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','100.64.0.1','198.18.0.1','192.0.2.1','::1','fe80::1','fc00::1','::ffff:127.0.0.1','2001:db8::1','2002:7f00:1::','0.0.0.0','invalid'])('blocks private/reserved address %s', address => expect(publicAddress(address)).toBe(false));
  it.each(['8.8.8.8','1.1.1.1','2606:4700:4700::1111'])('accepts public address %s', address => expect(publicAddress(address)).toBe(true));
  it('rejects SPA fallback, redirects, wrong schema and non-200', () => {
    const target = targetsFor('hunpeolabs', 'production')[1]!;
    expect(validateResponse(target, 200, 'text/html', '<html>SPA</html>')).toBe('unexpected_content');
    expect(validateResponse(target, 302, 'text/html', '')).toBe('redirect_blocked');
    expect(validateResponse(target, 200, 'application/json', '{"status":"down"}')).toBe('unexpected_content');
    expect(validateResponse(target, 404, 'text/html', 'missing')).toBe('unexpected_status');
    expect(validateResponse(target, 200, 'application/json; charset=utf-8', '{"status":"ok"}')).toBe('valid_response');
  });
});

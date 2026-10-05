import { resolve4, resolve6 } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import type { HealthResult } from '../../../packages/contracts/src/index.js';
import type { ProbeTarget } from './catalog.js';

export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a = 0, b = 0, c = 0] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 192 && b === 0) || (a === 192 && b === 88 && c === 99) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
      || (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) === 6) return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:(db8|0|2|10|20):/i.test(address) && !/^2002:/i.test(address);
  return false;
}
export function validateResponse(target: ProbeTarget, status: number, contentType: string, body: string): HealthResult['reason'] {
  if (status >= 300 && status < 400) return 'redirect_blocked';
  if (status !== target.expectedStatus) return 'unexpected_status';
  if (contentType.split(';')[0]?.trim().toLowerCase() !== target.contentType) return 'unexpected_content';
  if (target.expectedBody) {
    try { const parsed: unknown = JSON.parse(body); if (!parsed || typeof parsed !== 'object' || !('status' in parsed) || parsed.status !== target.expectedBody.status) return 'unexpected_content'; }
    catch { return 'unexpected_content'; }
  } else if (!body.trim()) return 'unexpected_content';
  return 'valid_response';
}
export async function probe(target: ProbeTarget): Promise<HealthResult> {
  const started = Date.now();
  const base: HealthResult = { status: 'failed', capability: target.capability, httpStatus: null, contentType: null,
    reason: 'network_error', checkedAt: new Date().toISOString(), latencyMs: null };
  const url = new URL(target.url);
  if (url.protocol !== 'https:' || url.hostname !== 'hunpeolabs.com' || url.username || url.password || url.port) return { ...base, reason: 'unsafe_address' };
  try {
    const addresses = await Promise.race([
      Promise.allSettled([resolve4(url.hostname), resolve6(url.hostname)]).then(rs => rs.flatMap(r => r.status === 'fulfilled' ? r.value : [])),
      new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('timeout')), 3000); timer.unref(); }),
    ]);
    if (!addresses.length || addresses.some(a => !publicAddress(a))) return { ...base, reason: 'unsafe_address' };
    // Pin the validated address at connection time; a second DNS lookup cannot rebind to a private address.
    const address = addresses[0]!;
    return await new Promise<HealthResult>(resolve => {
      let done = false;
      const finish = (value: HealthResult) => { if (!done) { done = true; clearTimeout(timer); resolve({ ...value, latencyMs: Date.now() - started }); } };
      const request = https.get(url, { lookup: (_host, options, callback) => options.all ? callback(null, [{ address, family: isIP(address) }]) : callback(null, address, isIP(address)), headers: { 'Accept': target.contentType, 'User-Agent': 'SatsunicManager/1 health probe' } }, response => {
        const status = response.statusCode ?? 0;
        const type = response.headers['content-type'] ?? '';
        let bytes = 0; const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 65536) { finish({ ...base, httpStatus: status, contentType: type, reason: 'response_too_large' }); request.destroy(); }
          else chunks.push(chunk);
        });
        response.on('error', () => finish(base));
        response.on('end', () => {
          const reason = validateResponse(target, status, type, Buffer.concat(chunks).toString('utf8'));
          finish({ ...base, httpStatus: status, contentType: type, reason, status: reason === 'valid_response' ? 'healthy' : 'failed' });
        });
      });
      const timer = setTimeout(() => { finish({ ...base, reason: 'timeout' }); request.destroy(); }, 5000);
      request.on('error', () => finish(base));
    });
  } catch (error) { return { ...base, reason: error instanceof Error && error.message === 'timeout' ? 'timeout' : 'network_error', latencyMs: Date.now() - started }; }
}

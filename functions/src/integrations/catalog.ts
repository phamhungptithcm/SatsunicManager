import type { z } from 'zod';
import { appIdSchema, environmentSchema } from '../../../packages/contracts/src/index.js';
export type ProbeTarget = { url: string; capability: 'public_reachability' | 'backend_readiness'; contentType: string; expectedStatus: number; expectedBody?: { status: 'ok' } };
// Confirmed public domain in HunpeoLabs README. These are read-only probes, not source data/IAM connections.
export function targetsFor(app: z.infer<typeof appIdSchema>, environment: z.infer<typeof environmentSchema>): ProbeTarget[] {
  return app === 'hunpeolabs' && environment === 'production' ? [
    { url: 'https://hunpeolabs.com/', capability: 'public_reachability', contentType: 'text/html', expectedStatus: 200 },
    { url: 'https://hunpeolabs.com/healthz', capability: 'backend_readiness', contentType: 'application/json', expectedStatus: 200, expectedBody: { status: 'ok' } },
  ] : [];
}

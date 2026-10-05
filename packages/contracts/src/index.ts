import { z } from 'zod';

export const OWNER_EMAILS = ['hunpeo97@gmail.com', 'phamhung.pitit@gmail.com'] as const;
export const APP_CATALOG = [
  { id: 'hunpeolabs', name: 'HunpeoLabs' },
  { id: 'satsunicseo', name: 'SatsunicSEO' },
  { id: 'satsuniccode', name: 'SatsunicCode' },
  { id: 'satsunicplan', name: 'SatsunicPlan' },
  { id: 'befam', name: 'BeFam' },
  { id: 'satsunicgo', name: 'SatsunicGo' },
  { id: 'satsunicmec', name: 'SatsunicMec' },
] as const;
export const appIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,59}$/).refine(id=>id!=='all','Reserved identifier');
export const appDefinitionSchema=z.object({id:appIdSchema,name:z.string().trim().min(1).max(80),revision:z.number().int().nonnegative(),sourceProjectId:z.string().regex(/^[a-z][a-z0-9-]{5,29}$/).nullable(),mappingVerified:z.literal(false)}).strict();
export const registerAppInputSchema=appDefinitionSchema.omit({mappingVerified:true}).extend({idempotencyKey:z.uuid()}).strict();
export const environmentSchema = z.literal('production');
export const timezoneSchema = z.enum(['America/Chicago', 'Asia/Ho_Chi_Minh']);
export const scopeSchema = z.object({
  appId: z.union([appIdSchema, z.literal('all')]), environment: environmentSchema,
  from: z.iso.datetime(), to: z.iso.datetime(), timezone: timezoneSchema,
}).strict().refine(s => Date.parse(s.to) > Date.parse(s.from) && Date.parse(s.to) - Date.parse(s.from) <= 90 * 86400000, 'Invalid period');
export const connectionInputSchema = z.object({ appId: appIdSchema, environment: environmentSchema,
  idempotencyKey: z.uuid(), revision: z.number().int().nonnegative() }).strict();
export const statusSchema = z.enum(['not_configured', 'validating', 'healthy', 'degraded', 'stale', 'permission_denied', 'failed', 'unsupported']);
export const healthResultSchema = z.object({
  status: statusSchema, capability: z.enum(['public_reachability', 'backend_readiness']),
  httpStatus: z.number().int().nullable(), contentType: z.string().nullable(),
  reason: z.enum(['valid_response', 'not_configured', 'unexpected_status', 'unexpected_content', 'unsafe_address', 'redirect_blocked', 'timeout', 'network_error', 'response_too_large']),
  checkedAt: z.iso.datetime(), latencyMs: z.number().nonnegative().nullable(),
}).strict();
export const registryItemSchema = z.object({
  id: appIdSchema, name: z.string(), environment: environmentSchema,
  status: statusSchema, revision: z.number().int().nonnegative(),
  lastAttemptAt: z.iso.datetime().nullable(), lastSuccessAt: z.iso.datetime().nullable(),
  results: z.array(healthResultSchema), source: z.string().nullable(),
  missingSources: z.array(z.enum(['monitoring', 'logging', 'billing', 'revenue', 'analytics', 'backend_readiness', 'verified_mapping'])),
}).strict();
export const registryResponseSchema = z.object({ data: z.array(registryItemSchema), meta: z.object({
  fetchedAt: z.iso.datetime(), environment: environmentSchema, queryVersion: z.literal('registry-v1'),
  fixture: z.boolean(),
}).strict() }).strict();
export const ownerSchema = z.object({ uid: z.string(), email: z.string(), role: z.literal('owner') }).strict();
export type RegistryItem = z.infer<typeof registryItemSchema>;
export type HealthResult = z.infer<typeof healthResultSchema>;
export type Owner = z.infer<typeof ownerSchema>;
export type Scope = z.infer<typeof scopeSchema>;

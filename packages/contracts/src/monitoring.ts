import { z } from 'zod';
import { appIdSchema, scopeSchema } from './index.js';
import { operationsResponseSchema, sourceStatusSchema } from './metrics.js';

export const monitoringInputSchema = z.object({ scope: scopeSchema, limit: z.number().int().min(1).max(10).default(5) }).strict();
const metricsRow = operationsResponseSchema.shape.data.element.omit({ logs: true });
export const monitoringReportSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/), scope: scopeSchema, status: z.enum(['complete', 'failed']),
  data: z.array(metricsRow).max(3), fixture: z.boolean(), queryVersion: z.literal('collector-v1'),
  createdAt: z.iso.datetime(),
}).strict();
export const monitoringResponseSchema = z.object({
  data: z.array(z.object({
    appId: appIdSchema, status: sourceStatusSchema,
    lastAttemptAt: z.iso.datetime().nullable(), lastSuccessAt: z.iso.datetime().nullable(),
    attemptedThrough: z.iso.datetime().nullable(), lastSuccessfulThrough: z.iso.datetime().nullable(),
    latestAttempt: monitoringReportSchema.nullable(), history: z.array(monitoringReportSchema).max(10),
  }).strict()).max(100),
  meta: z.object({ scope: scopeSchema, fetchedAt: z.iso.datetime(), queryVersion: z.literal('monitoring-v1'), fixture: z.boolean(), historyCoverage: z.literal('bounded_recent'), historyTruncated: z.boolean() }).strict(),
}).strict();
export type MonitoringResponse = z.infer<typeof monitoringResponseSchema>;

import { z } from 'zod';
import { appIdSchema, scopeSchema } from './index.js';

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable();
const totals = z.object({ requestCount: count, serverErrorCount: count, errorRate: z.number().min(0).max(1).nullable() }).strict();
export const reportSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/), version: z.number().int().positive(), scope: scopeSchema,
  generatedAt: z.iso.datetime(), sourceCutoff: z.iso.datetime(), definitionVersion: z.literal('operations-report-v1'), queryVersion: z.literal('reports-v1'), fixture: z.boolean(),
  alignmentPeriodSeconds: z.literal(3600), metricCaveat: z.literal('aligned_buckets_not_query_period_totals'),
  coverage: z.object({ status: z.enum(['complete', 'partial', 'missing']), truncated: z.boolean(), snapshotLimit: z.literal(200) }).strict(),
  sources: z.array(z.object({
    appId: appIdSchema, name: z.string().min(1).max(80), status: z.enum(['available', 'empty', 'partial', 'not_configured', 'missing']),
    watermark: z.iso.datetime().nullable(), coveredMs: z.number().int().nonnegative(), measurementCoveredMs: z.number().int().nonnegative(), requestedMs: z.number().int().positive(), totals,
    intervals: z.array(z.object({ snapshotId: z.string().regex(/^[a-f0-9]{64}$/), from: z.iso.datetime(), to: z.iso.datetime(), status: z.enum(['available', 'empty']), alignedWindows: z.array(z.object({ from: z.iso.datetime(), to: z.iso.datetime() }).strict()).max(200), ...totals.shape }).strict()).max(200),
    excludedOverlaps: z.number().int().nonnegative(), excludedAlignment: z.number().int().nonnegative(),
  }).strict()).max(100),
  gaps: z.tuple([z.literal('finance'), z.literal('analytics'), z.literal('incidents'), z.literal('email'), z.literal('pdf')]),
}).strict();
export const generateReportInputSchema = z.object({ scope: scopeSchema, idempotencyKey: z.uuid() }).strict();
export const listReportsInputSchema = z.object({ scope: scopeSchema, limit: z.number().int().min(1).max(10).default(5) }).strict();
export const reportIdInputSchema = z.object({ id: reportSchema.shape.id }).strict();
export const reportsResponseSchema = z.object({ data: z.array(reportSchema).max(10), meta: z.object({ scope: scopeSchema, fetchedAt: z.iso.datetime(), historyTruncated: z.boolean() }).strict() }).strict();
export const reportExportSchema = z.object({ id: reportSchema.shape.id, version: reportSchema.shape.version, filename: z.string(), csv: z.string() }).strict();
export type OperationsReport = z.infer<typeof reportSchema>;

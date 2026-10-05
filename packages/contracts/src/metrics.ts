import {z} from 'zod';
import {scopeSchema,appIdSchema} from './index.js';
export const operationsInputSchema=z.object({scope:scopeSchema,logCursor:z.string().max(4096).nullable().default(null)}).strict();
export const sourceStatusSchema=z.enum(['available','empty','partial','not_configured','permission_denied','failed']);
export const operationsResponseSchema=z.object({
 data:z.array(z.object({appId:appIdSchema,projectId:z.string().nullable(),services:z.array(z.string()),
  metrics:z.object({status:sourceStatusSchema,requestCount:z.number().nonnegative().nullable(),serverErrorCount:z.number().nonnegative().nullable(),errorRate:z.number().min(0).max(1).nullable(),points:z.array(z.object({at:z.iso.datetime(),requests:z.number().nonnegative(),errors:z.number().nonnegative()})),reason:z.string().nullable()}),
  logs:z.object({status:sourceStatusSchema,entries:z.array(z.object({at:z.iso.datetime(),severity:z.string(),service:z.string(),httpStatus:z.number().int().nullable()})),nextCursor:z.string().nullable(),reason:z.string().nullable()}),
  provenance:z.object({provider:z.literal('Google Cloud'),resourceRef:z.string().nullable(),queryVersion:z.literal('operations-v1'),metricDefinitionVersion:z.literal('cloud-run-requests-v1')}),
  freshness:z.object({fetchedAt:z.iso.datetime(),observedThrough:z.iso.datetime().nullable()}),
 })),meta:z.object({scope:scopeSchema,fetchedAt:z.iso.datetime(),fixture:z.boolean()})
});
export type OperationsResponse=z.infer<typeof operationsResponseSchema>;

import {z} from 'zod';
import {appIdSchema,scopeSchema} from './index.js';
export const pageInputSchema=z.object({scope:scopeSchema,cursor:z.string().max(500).nullable().default(null),limit:z.number().int().min(1).max(50).default(25)}).strict();
export const workflowSchema=z.enum(['open','acknowledged','investigating','mitigated','resolved']);
export const signalSchema=z.object({eventId:z.uuid(),sourceId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),sourceVersion:z.number().int().nonnegative(),appId:appIdSchema,environment:z.literal('production'),condition:z.enum(['firing','recovered']),severity:z.enum(['P0','P1','P2','P3']),title:z.string().min(1).max(160),occurredAt:z.iso.datetime(),evidence:z.array(z.object({resourceRef:z.string().max(300),description:z.string().max(240)}).strict()).max(10)}).strict();
export const incidentSchema=z.object({id:z.string(),appId:appIdSchema,environment:z.literal('production'),sourceId:z.string(),sourceVersion:z.number().int(),sourceState:z.enum(['firing','recovered']),workflow:workflowSchema,severity:z.enum(['P0','P1','P2','P3']),title:z.string(),occurredAt:z.iso.datetime(),updatedAt:z.iso.datetime(),revision:z.number().int().nonnegative(),evidence:signalSchema.shape.evidence}).strict();
export const incidentMutationSchema=z.object({id:z.string().regex(/^[a-f0-9]{64}$/),revision:z.number().int().nonnegative(),workflow:workflowSchema,note:z.string().trim().min(1).max(1000),idempotencyKey:z.uuid()}).strict();
export const notificationStateSchema=z.object({id:z.string().regex(/^[a-f0-9]{64}$/),read:z.boolean(),idempotencyKey:z.uuid()}).strict();
export type Incident= z.infer<typeof incidentSchema>;
export type Signal=z.infer<typeof signalSchema>;
export const transitions:Record<z.infer<typeof workflowSchema>,readonly z.infer<typeof workflowSchema>[]>= {open:['acknowledged'],acknowledged:['investigating'],investigating:['mitigated','resolved'],mitigated:['investigating','resolved'],resolved:['open']};

export function incidentProjection(data:Record<string,unknown>):Incident { return incidentSchema.parse(Object.fromEntries(Object.keys(incidentSchema.shape).map(key=>[key,data[key]]))); }
export const incidentPageSchema=z.object({data:z.array(incidentSchema),nextCursor:z.string().nullable(),meta:z.object({fetchedAt:z.iso.datetime(),scope:scopeSchema})});
export const notificationPageSchema=z.object({data:z.array(z.object({id:z.string(),incidentId:z.string(),title:z.string(),severity:z.string(),appId:appIdSchema,occurredAt:z.iso.datetime(),read:z.boolean()})),nextCursor:z.string().nullable(),meta:z.object({fetchedAt:z.iso.datetime(),scope:scopeSchema,unreadInPage:z.number().int().nonnegative()})});

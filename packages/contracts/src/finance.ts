import {z} from 'zod';
import {appIdSchema,scopeSchema} from './index.js';
export const currencySchema=z.enum(['USD','EUR','GBP','VND','JPY']);
export const financialKindSchema=z.enum(['gross','tax','refund','chargeback','fee','net','cost','settlement']);
export const financialFactSchema=z.object({transactionId:z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),appId:appIdSchema,currency:currencySchema,kind:financialKindSchema,minorUnits:z.string().regex(/^\d{1,18}$/),occurredAt:z.iso.datetime()}).strict();
export const financeQuerySchema=z.object({scope:scopeSchema,currency:currencySchema}).strict();
export type FinancialFact=z.infer<typeof financialFactSchema>;
export const financeSnapshotSchema=z.object({id:z.string(),scope:scopeSchema,currency:currencySchema,minorUnitDigits:z.number().int(),status:z.enum(['available','empty','partial','not_configured']),fetchedAt:z.iso.datetime(),observedThrough:z.iso.datetime().nullable(),queryVersion:z.literal('finance-v1'),data:z.array(financialFactSchema),totals:z.record(z.string(),z.string()),count:z.number().int(),coverage:z.literal('verified official sources only'),csv:z.string()});

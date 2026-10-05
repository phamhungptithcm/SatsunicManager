import {z} from 'zod';
import {timezoneSchema} from './index.js';

export const ownerPreferencesSchema = z.object({
  locale: z.enum(['vi', 'en']),
  theme: z.enum(['light', 'dark']),
  timezone: timezoneSchema,
  revision: z.number().int().nonnegative(),
}).strict();
export const savePreferencesSchema = ownerPreferencesSchema.extend({idempotencyKey: z.uuid()});
export type OwnerPreferences = z.infer<typeof ownerPreferencesSchema>;

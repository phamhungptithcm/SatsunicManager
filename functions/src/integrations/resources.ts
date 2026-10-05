import type {z} from 'zod';
import type {appIdSchema} from '../../../packages/contracts/src/index.js';
// Repository project mapping + 2026-10-04 live Cloud Run service metadata readback.
export const RESOURCE_CATALOG:Partial<Record<z.infer<typeof appIdSchema>,{projectId:string;location:string;services:readonly string[]}>>={
 hunpeolabs:{projectId:'hunpeolabs-prod',location:'us-central1',services:['hunpeolabs']},
 satsunicseo:{projectId:'satsunicseoextension',location:'asia-southeast1',services:['billingmaintenance','maintenance','runjob','googleconnectioncallback','billingwebhook','api']},
 satsunicplan:{projectId:'satsunicplan',location:'us-central1',services:['api']},
 // SatsunicCode Run API and BeFam mapping could not be verified; do not invent services.
};

import {registerApp} from './api/apps.js';
import {getPreferences,savePreferences} from './api/preferences.js';
import {financeSnapshot} from './finance/snapshot.js';
import {readOperations} from './integrations/operations.js';
import { consumeRate } from './shared/rate.js';
import { ZodError } from 'zod';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { listIncidents as incidents, changeIncident } from './api/incidents.js';
import { listNotifications as notifications, setNotificationRead } from './api/notifications.js';
import { setGlobalOptions } from 'firebase-functions/v2';
import { bootstrap } from './auth/bootstrap.js';
import { authorize } from './auth/authorize.js';
import { appDefinitions, registry, registryInput } from './api/registry.js';
import { testConnection } from './api/connections.js';
export { beforeCreated, beforeSignedIn } from './auth/blocking.js';
setGlobalOptions({ maxInstances: 2, concurrency: 8, timeoutSeconds: 30, memory: '256MiB',
  ...(process.env.MANAGER_REGION ? { region: process.env.MANAGER_REGION } : {}),
  ...(process.env.MANAGER_API_SERVICE_ACCOUNT ? { serviceAccount: process.env.MANAGER_API_SERVICE_ACCOUNT } : {}) });
const emulator = process.env.FUNCTIONS_EMULATOR === 'true' && process.env.GCLOUD_PROJECT?.startsWith('demo-') === true;
const options = { enforceAppCheck: !emulator, cors: emulator ? true : process.env.MANAGER_ORIGINS?.split(',') ?? [] };
function safe(handler: (request: CallableRequest) => Promise<unknown>) {
  return async (request: CallableRequest) => {
    if (process.env.FUNCTIONS_EMULATOR !== 'true' && (!process.env.MANAGER_API_SERVICE_ACCOUNT || !process.env.MANAGER_REGION || !process.env.MANAGER_ORIGINS)) {
      throw new HttpsError('failed-precondition', 'Service configuration unavailable.');
    }
    try { return await handler(request); }
    catch (error) { if (error instanceof HttpsError) throw error; if (error instanceof ZodError) throw new HttpsError('invalid-argument', 'Invalid request.'); throw new HttpsError('internal', 'Operation unavailable.'); }
  };
}
export const bootstrapOwner = onCall(options, safe(bootstrap));
export const addApp = onCall(options,safe(async request=>{const owner=await authorize(request,true);await consumeRate(owner.uid,'apps.write',10);return registerApp(request.data,owner);}));
export const listApps = onCall(options, safe(async request => {
  await authorize(request);
  const input = registryInput.safeParse(request.data);
  if (!input.success) throw new HttpsError('invalid-argument', 'Invalid scope.');
  return registry(input.data.environment);
}));
export const checkConnection = onCall(options, safe(async request => testConnection(request.data, await authorize(request, true))));

export const listIncidents = onCall(options, safe(async request => {
  const owner = await authorize(request);
  await consumeRate(owner.uid, 'incidents.read');
  return incidents(request.data);
}));
export const updateIncident = onCall(options, safe(async request => {
  const owner = await authorize(request, true);
  await consumeRate(owner.uid, 'incidents.write', 20);
  return changeIncident(request.data, owner);
}));
export const listNotifications = onCall(options, safe(async request => {
  const owner = await authorize(request);
  await consumeRate(owner.uid, 'notifications.read');
  return notifications(request.data, owner);
}));
export const markNotificationRead = onCall(options, safe(async request => {
  const owner = await authorize(request);
  await consumeRate(owner.uid, 'notifications.write', 30);
  return setNotificationRead(request.data, owner);
}));

export const getOperations = onCall(options, safe(async request => {
  const owner = await authorize(request);
  await consumeRate(owner.uid, 'operations.read', 10);
  return readOperations(request.data,undefined,await appDefinitions());
}));

export const getFinanceSnapshot = onCall(options,safe(async request=>{const owner=await authorize(request);await consumeRate(owner.uid,'finance.read',20);return financeSnapshot(request.data);}));

export const getOwnerPreferences = onCall(options,safe(async request=>{const owner=await authorize(request);await consumeRate(owner.uid,'preferences.read');return getPreferences(owner);}));
export const saveOwnerPreferences = onCall(options,safe(async request=>{const owner=await authorize(request);await consumeRate(owner.uid,'preferences.write',20);return savePreferences(request.data,owner);}));

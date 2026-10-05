import { withProgress } from './ui/action-progress';
import { z } from 'zod';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
export const configSchema = z.object({
  projectId: z.string().min(6), apiKey: z.string().min(1), authDomain: z.string().min(1), appId: z.string().min(1),
  oauthClientId: z.string().min(1), region: z.string().min(1), appCheckSiteKey: z.string().min(1),
  emulator: z.boolean().default(false), addAppEnabled:z.boolean().default(false), financeEnabled:z.boolean().default(false), preferencesEnabled:z.boolean().default(false), monitoringEnabled:z.boolean().default(false), reportsEnabled:z.boolean().default(false),
}).strict();
export type ClientConfig = z.infer<typeof configSchema>;
export async function loadClient() {
  const response = await fetch('/manager-config.json', { cache: 'no-store' });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('configuration');
  const config = configSchema.parse(await response.json());
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (config.emulator && (!local || !import.meta.env.DEV || !config.projectId.startsWith('demo-'))) throw new Error('configuration');
  if (!config.emulator && (config.projectId.startsWith('demo-') || !config.oauthClientId.endsWith('.apps.googleusercontent.com'))) throw new Error('configuration');
  const app = initializeApp(config);
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  const functions = getFunctions(app, config.region);
  const firestore = getFirestore(app);
  if (config.emulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:29099', { disableWarnings: true });
    connectFunctionsEmulator(functions, '127.0.0.1', 25001);
    connectFirestoreEmulator(firestore, '127.0.0.1', 28080);
  } else initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(config.appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  return { config, auth, functions, firestore, call: (name: string, data: unknown) => withProgress(async () => (await httpsCallable(functions, name)(data)).data) };
}
export type Client = Awaited<ReturnType<typeof loadClient>>;

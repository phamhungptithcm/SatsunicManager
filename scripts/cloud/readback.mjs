import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const project = process.env.SM_VERIFY_PROJECT ?? 'satsunicmanager';
if (!['satsunicmanager'].includes(project)) throw new Error('Unapproved verification project');
const require = createRequire(import.meta.url);
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { getGlobalDefaultAccount } = require('firebase-tools/lib/auth');
const { Client } = require('firebase-tools/lib/apiv2');
// Reuse the authenticated Firebase CLI session; never print or persist credentials.
await requireAuth({ project, ...getGlobalDefaultAccount() });
const client = new Client({ urlPrefix: 'https://identitytoolkit.googleapis.com/admin', apiVersion: 'v2' });
const checks = [];
for (const [name, path, fields] of [
  ['auth_config', `/projects/${project}/config`, 'name,subtype,authorizedDomains,signIn.email.enabled,signIn.phoneNumber.enabled,signIn.anonymous.enabled,client.permissions,blockingFunctions.triggers'],
  ['google_provider', `/projects/${project}/defaultSupportedIdpConfigs/google.com`, 'name,enabled,clientId'],
  ['providers', `/projects/${project}/defaultSupportedIdpConfigs`, 'defaultSupportedIdpConfigs(name,enabled),nextPageToken'],
]) {
  try {
    // Field projection happens on the server: no client secrets/hash config fetched.
    const response = await client.get(path, { queryParams: { fields }, resolveOnHTTPError: true });
    checks.push({ name, status: response.status, data: response.status < 400 ? response.body : null,
      errorCode: response.status >= 400 ? response.body?.error?.status ?? 'UNAVAILABLE' : null,
      errorMessage: response.status >= 400 ? response.body?.error?.message ?? null : null,
      reasons: response.body?.error?.details?.map(item => item.reason).filter(Boolean) ?? [] });
  } catch { checks.push({name,status:null,data:null,errorCode:'REQUEST_FAILED'}); }
}
const report = {projectId:project,checkedAt:new Date().toISOString(),mode:'read-only public/non-secret auth metadata',checks};
writeFileSync(`docs/evidence/${project}-auth-readback.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

if (process.argv.includes('--expect-identity-platform') && checks.find(item=>item.name==='auth_config')?.data?.subtype!=='IDENTITY_PLATFORM') process.exitCode=1;
if (process.argv.includes('--expect-closed-google')) {
  const config=checks.find(item=>item.name==='auth_config')?.data;
  const google=checks.find(item=>item.name==='google_provider')?.data;
  const providers=checks.find(item=>item.name==='providers')?.data;
  const expected=['FIREBASE_AUTH','IDENTITY_PLATFORM'].includes(config?.subtype) && config?.client?.permissions?.disabledUserSignup===true
    && config?.client?.permissions?.disabledUserDeletion===true
    && JSON.stringify([...(config?.authorizedDomains??[])].sort())===JSON.stringify([`${project}.firebaseapp.com`,`${project}.web.app`].sort())
    && !config?.signIn?.email?.enabled && !config?.signIn?.phoneNumber?.enabled && !config?.signIn?.anonymous?.enabled
    && google?.enabled===true && google?.clientId?.endsWith('.apps.googleusercontent.com')
    && providers?.defaultSupportedIdpConfigs?.length===1 && !providers?.nextPageToken
    && providers.defaultSupportedIdpConfigs[0].name.endsWith('/google.com');
  if (!expected) process.exitCode=1;
}

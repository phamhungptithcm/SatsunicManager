import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {Client}=require('firebase-tools/lib/apiv2');
const project=process.env.SM_VERIFY_PROJECT;
const apps={'satsunicmanager':{number:'317759361800',id:'1:317759361800:web:d4710116013ca2dca492bd'}};
assert.equal(project,'satsunicmanager','Only production is retained');
assert.ok(Object.hasOwn(apps,project),'Unapproved project');
const apply=process.argv.includes('--apply');
if(apply) assert.equal(process.env.SM_CLOUD_APPROVAL,'SM-CLOUD-003');
const app=apps[project];
const key=JSON.parse(readFileSync(`docs/evidence/${project}-recaptcha-key.json`,'utf8'));
assert.ok(key.name.startsWith(`projects/${app.number}/keys/`));
assert.equal(key.webSettings.integrationType,'SCORE');
assert.equal(key.webSettings.allowAllDomains,false);
assert.deepEqual([...key.webSettings.allowedDomains].sort(),[`${project}.web.app`,`${project}.firebaseapp.com`].sort());
await requireAuth({project,...getGlobalDefaultAccount()});
const client=new Client({urlPrefix:'https://firebaseappcheck.googleapis.com',apiVersion:'v1'});
const path=`/projects/${app.number}/apps/${app.id}/recaptchaEnterpriseConfig`;
const siteKey=key.name.split('/').at(-1);
if(apply){
 const previous=await client.get(path,{headers:{'x-goog-user-project':project},resolveOnHTTPError:true});
 if(previous.status<400 && previous.body.siteKey) assert.equal(previous.body.siteKey,siteKey,'Existing different key requires a reviewed delta');
 else if(previous.status<400) assert.ok(Object.keys(previous.body).every(field=>['name','tokenTtl','riskScore','riskAnalysis','siteKey'].includes(field)),'Unexpected existing configuration');
 else if(previous.status!==404){
  writeFileSync(`docs/evidence/${project}-app-check.json`,JSON.stringify({projectId:project,httpStatus:previous.status,errorCode:previous.body?.error?.status,errorMessage:previous.body?.error?.message,registered:false},null,2)+'\n');
  throw new Error(`App Check preflight blocked: ${previous.status}`);
 }
 const response=await client.patch(path,{name:path.slice(1),siteKey},{headers:{'x-goog-user-project':project},queryParams:{updateMask:'siteKey'},resolveOnHTTPError:true});
 if(response.status>=400){
  writeFileSync(`docs/evidence/${project}-app-check.json`,JSON.stringify({projectId:project,httpStatus:response.status,errorCode:response.body?.error?.status,errorMessage:response.body?.error?.message,registered:false},null,2)+'\n');
  throw new Error(`App Check registration failed: ${response.status}`);
 }
}
const response=await client.get(path,{headers:{'x-goog-user-project':project}});
assert.equal(response.body.siteKey,siteKey);
writeFileSync(`docs/evidence/${project}-app-check.json`,JSON.stringify({projectId:project,verifiedAt:new Date().toISOString(),registered:true,config:response.body,liveTokenVerified:false,enforcementChanged:false,approvalRef:'docs/approval-SM-CLOUD-003.md'},null,2)+'\n');
console.log(`${project}: App Check registration verified; live token NOT_TESTED`);

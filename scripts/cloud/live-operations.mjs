import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {Client}=require('firebase-tools/lib/apiv2');
await requireAuth({project:'satsunicmanager',...getGlobalDefaultAccount()});
const {readOperations}=await import('../../functions/lib/functions/src/integrations/operations.js');
let runtimeToken=null;
if(process.argv.includes('--runtime')){const token=spawnSync('gcloud',['auth','print-access-token','--impersonate-service-account=manager-api@satsunicmanager.iam.gserviceaccount.com'],{encoding:'utf8'});if(token.status!==0)throw Error('Runtime impersonation unavailable; no additional grant applied.');runtimeToken=token.stdout.trim();}
const read=async(raw,body)=>{const url=new URL(raw);if(runtimeToken){const r=await fetch(raw,{method:body?'POST':'GET',headers:{authorization:`Bearer ${runtimeToken}`,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000)});return {status:r.status,data:await r.json()};}const queryParams=Object.fromEntries(url.searchParams);const client=new Client({urlPrefix:url.origin,apiVersion:''});const response=body?await client.post(url.pathname,body,{queryParams,resolveOnHTTPError:true}):await client.get(url.pathname,{queryParams,resolveOnHTTPError:true});return {status:response.status,data:response.body};};
const to=new Date();const from=new Date(to.getTime()-86400000);
const result=await readOperations({scope:{appId:'all',environment:'production',from:from.toISOString(),to:to.toISOString(),timezone:'America/Chicago'}},read);
mkdirSync('.ai/local',{recursive:true});writeFileSync('.ai/local/live-operations.json',JSON.stringify(result,null,2)+'\n');
const evidence={checkedAt:result.meta.fetchedAt,identity:runtimeToken?'impersonated manager-api runtime identity via existing authority':'authenticated CLI administrator; not deployed Manager runtime',scope:result.meta.scope,privateResult:'.ai/local/live-operations.json',sources:result.data.map(item=>({appId:item.appId,projectId:item.projectId,metricsStatus:item.metrics.status,metricObservationCount:item.metrics.points.length,logsStatus:item.logs.status,logMetadataCount:item.logs.entries.length,rawPayloadFetched:false,reason:item.metrics.reason}))};
writeFileSync('docs/evidence/live-operations-read.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));

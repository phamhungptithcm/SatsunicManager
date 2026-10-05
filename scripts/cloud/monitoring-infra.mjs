import {validateMonitoringWorker,validateMonitoringJob} from './monitoring-policy.mjs';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
const phase=process.argv[2];
if(!['preflight','provision','scheduler','run'].includes(phase)||process.argv.length!==3)throw Error('Select exact monitoring phase');
if(phase!=='preflight'&&process.env.MANAGER_RELEASE_APPROVAL!=='SM-MONITOR-010')throw Error('Exact010 approval required');
if(!readFileSync('docs/approval-SM-MONITOR-010.md','utf8').includes('Approval status: APPROVED'))throw Error('Human receipt required');
const require=createRequire(import.meta.url);
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {Client}=require('firebase-tools/lib/apiv2');
await requireAuth({project:'satsunicmanager',...getGlobalDefaultAccount()});
const project='satsunicmanager',number='317759361800';
const worker=`manager-worker@${project}.iam.gserviceaccount.com`,scheduler=`manager-scheduler@${project}.iam.gserviceaccount.com`;
const sources=['hunpeolabs-prod','satsunicseoextension','satsunicplan'];
const permissions=['datastore.databases.get','datastore.entities.create','datastore.entities.get','datastore.entities.list','datastore.entities.update'];
const client=(host,version)=>new Client({urlPrefix:`https://${host}.googleapis.com`,apiVersion:version});
const iam=client('iam','v1'),crm=client('cloudresourcemanager','v1'),usage=client('serviceusage','v1'),jobs=client('cloudscheduler','v1');
const opts={headers:{'x-goog-user-project':project},skipLog:{resBody:true,body:true}};
const get=async(c,path)=>{try{return (await c.get(path,{...opts})).body;}catch(e){if(e.status===404)return null;throw e;}};
const post=async(c,path,body)=>(await c.post(path,body,{...opts})).body;
const put=async(c,path,body)=>(await c.put(path,body,{...opts})).body;
async function waitOperation(c,op){
 for(let attempt=0;!op.done&&attempt<60;attempt++){await new Promise(resolve=>setTimeout(resolve,1000));op=await get(c,`/${op.name}`);if(!op)throw Error('Operation readback unavailable');}
 if(!op.done||op.error)throw Error('Approved operation did not complete');return op;
}
const report={checkedAt:new Date().toISOString(),phase,project,worker,scheduler,sources,permissions};
async function grant(target,role,member){const policy=await post(crm,`/projects/${target}:getIamPolicy`,{options:{requestedPolicyVersion:3}});const bindings=policy.bindings??=[];let binding=bindings.find(b=>b.role===role&&!b.condition);if(binding?.members.includes(member))return;binding??=({role,members:[]});if(!bindings.includes(binding))bindings.push(binding);binding.members.push(member);await post(crm,`/projects/${target}:setIamPolicy`,{policy:{...policy,bindings}});}
async function ensureAccount(id){const email=`${id}@${project}.iam.gserviceaccount.com`;if(await get(iam,`/projects/${project}/serviceAccounts/${email}`))return;await post(iam,`/projects/${project}/serviceAccounts`,{accountId:id,serviceAccount:{displayName:id}});}
const roleName=`projects/${project}/roles/managerWorkerFirestore`;
const existingRole=await get(iam,`/${roleName}`);
if(existingRole&&(existingRole.deleted||JSON.stringify([...existingRole.includedPermissions].sort())!==JSON.stringify(permissions)))throw Error('Existing worker role differs from approved permissions');
for(const source of sources){const r=await get(iam,`/projects/${source}/roles/managerMonitoringRead`);if(!r||r.deleted||JSON.stringify(r.includedPermissions)!==JSON.stringify(['monitoring.timeSeries.list']))throw Error('Verified exact source role required');}
report.accountsExist={worker:Boolean(await get(iam,`/projects/${project}/serviceAccounts/${worker}`)),scheduler:Boolean(await get(iam,`/projects/${project}/serviceAccounts/${scheduler}`))};
report.schedulerApi=await get(usage,`/projects/${number}/services/cloudscheduler.googleapis.com`);
if(phase==='provision'){
 const supported=await post(iam,'/permissions:queryTestablePermissions',{fullResourceName:`//cloudresourcemanager.googleapis.com/projects/${project}`,pageSize:1000});
 // Follow provider pagination before treating missing permissions as unsupported.
 let all=[...(supported.permissions??[])],token=supported.nextPageToken;
 while(token){const page=await post(iam,'/permissions:queryTestablePermissions',{fullResourceName:`//cloudresourcemanager.googleapis.com/projects/${project}`,pageSize:1000,pageToken:token});all.push(...(page.permissions??[]));token=page.nextPageToken;}
 if(!permissions.every(p=>all.some(x=>x.name===p&&x.customRolesSupportLevel!=='NOT_SUPPORTED')))throw Error('Exact permission support not verified');
 await ensureAccount('manager-worker');await ensureAccount('manager-scheduler');
 if(!existingRole)await post(iam,`/projects/${project}/roles`,{roleId:'managerWorkerFirestore',role:{title:'Manager worker Firestore',stage:'GA',includedPermissions:permissions}});
 await grant(project,roleName,`serviceAccount:${worker}`);
 for(const source of sources)await grant(source,`projects/${source}/roles/managerMonitoringRead`,`serviceAccount:${worker}`);
 if(report.schedulerApi?.state!=='ENABLED'){
  const op=await post(usage,`/projects/${number}/services/cloudscheduler.googleapis.com:enable`,{});
  await waitOperation(usage,op);
 }
 const beta=client('serviceusage','v1beta1');
 await waitOperation(beta,await post(beta,`/projects/${number}/services/cloudscheduler.googleapis.com:generateServiceIdentity`,{}));
 await grant(project,'roles/cloudscheduler.serviceAgent',`serviceAccount:service-${number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com`);
 report.schedulerApi=await get(usage,`/projects/${number}/services/cloudscheduler.googleapis.com`);
 if(report.schedulerApi?.state!=='ENABLED')throw Error('Scheduler API not enabled');
}
if(phase==='scheduler'||phase==='run'){
 const fn=await get(client('cloudfunctions','v2'),`/projects/${project}/locations/us-central1/functions/collectMonitoring`);
 if(fn?.state!=='ACTIVE'||fn.serviceConfig?.serviceAccountEmail!==worker||fn.serviceConfig.maxInstanceCount!==1||fn.serviceConfig.maxInstanceRequestConcurrency!==1||fn.serviceConfig.timeoutSeconds!==60||!['256Mi','256M'].includes(fn.serviceConfig.availableMemory))throw Error('Exact ACTIVE private worker required');
 const uri=fn.serviceConfig.uri; const name=`projects/${project}/locations/us-central1/jobs/manager-monitoring-15m`;
 const service=fn.serviceConfig.service;
 const run=client('run','v2');const policy=(await run.get(`/${service}:getIamPolicy`,{...opts,queryParams:{'options.requestedPolicyVersion':3}})).body;
 validateMonitoringWorker(fn,policy);
 if(phase==='scheduler'){
  const job={name,schedule:'*/15 * * * *',timeZone:'Etc/UTC',attemptDeadline:'60s',retryConfig:{retryCount:0,maxRetryDuration:'0s'},httpTarget:{uri,httpMethod:'POST',headers:{'Content-Type':'application/json'},body:Buffer.from('{}').toString('base64'),oidcToken:{serviceAccountEmail:scheduler,audience:uri}}};
  const current=await get(jobs,`/${name}`);
  if(current)throw Error('Existing Scheduler job requires explicit reviewed diff; do not overwrite');
  await post(jobs,`/projects/${project}/locations/us-central1/jobs`,job);
 }else {
  const current=await get(jobs,`/${name}`);
  validateMonitoringJob(current,uri);
  await post(jobs,`/${name}:run`,{});
 }
 report.scheduler=await get(jobs,`/${name}`);
}
writeFileSync(`.ai/local/monitor010-${phase}.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({phase,project,accountsExist:report.accountsExist,schedulerApi:report.schedulerApi?.state,complete:true}));

process.exit(0);

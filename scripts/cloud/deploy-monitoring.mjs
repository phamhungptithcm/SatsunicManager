import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {candidateHash} from '../validate/candidate.mjs';
const phase=process.argv[2];
if(!['backend','hosting'].includes(phase)||process.argv.length!==3)throw Error('Select exact backend or hosting phase');
const config=JSON.parse(readFileSync(process.env.MANAGER_DEPLOY_CONFIG??'', 'utf8'));
if(config.production?.projectId!=='satsunicmanager'||config.candidateHash!==candidateHash()||config.approvalRef!=='docs/approval-SM-MONITOR-010.md'||process.env.MANAGER_RELEASE_APPROVAL!=='SM-MONITOR-010')throw Error('Exact SM-MONITOR-010 approval and tested candidate required');
const expectedOrigins=['https://satsunicmanager.firebaseapp.com','https://satsunicmanager.web.app'];
if(config.production.region!=='us-central1'||config.production.apiServiceAccount!=='manager-api@satsunicmanager.iam.gserviceaccount.com'||JSON.stringify([...(config.production.origins??[])].sort())!==JSON.stringify(expectedOrigins))throw Error('Exact approved runtime identity, region and origins required');
const runtime=Object.fromEntries(readFileSync('functions/.env.satsunicmanager','utf8').split('\n').filter(line=>/^MANAGER_(REGION|API_SERVICE_ACCOUNT|ORIGINS|COLLECTOR_SERVICE_ACCOUNT|COLLECTOR_ENABLED)=/.test(line)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1).trim()];}));
if(runtime.MANAGER_REGION!==config.production.region||runtime.MANAGER_API_SERVICE_ACCOUNT!==config.production.apiServiceAccount||JSON.stringify((runtime.MANAGER_ORIGINS??'').split(',').sort())!==JSON.stringify(expectedOrigins))throw Error('Exact approved runtime environment binding required');
if(runtime.MANAGER_COLLECTOR_SERVICE_ACCOUNT!=='manager-worker@satsunicmanager.iam.gserviceaccount.com'||runtime.MANAGER_COLLECTOR_ENABLED!=='true')throw Error('Exact approved collector environment required');
const checks=JSON.parse(readFileSync('docs/evidence/checks.json','utf8'));
const required=['typecheck','lint','build','unit','approval_regression','approval','secret_scan','doctor','emulator_rules_api','e2e'];
if(checks.candidateHash!==config.candidateHash||!required.every(name=>checks.checks?.some(check=>check.name===name&&check.candidateHash===config.candidateHash&&check.status==='PASSED')))throw Error('Fresh stable full release checks required');
const gate=spawnSync(process.execPath,['scripts/validate/doctor.mjs','--deployment'],{stdio:'inherit',env:process.env});
if(gate.status!==0)process.exit(gate.status??1);
const names=['collectMonitoring','listMonitoringSnapshots'];
if(phase==='hosting'){
 const evidence=JSON.parse(readFileSync('docs/evidence/monitor010-backend-readback.json','utf8'));
 if(evidence.candidateHash!==config.candidateHash||evidence.functions?.length!==2||!names.every(name=>evidence.functions.some(fn=>fn.name===`projects/satsunicmanager/locations/us-central1/functions/${name}`&&fn.state==='ACTIVE'&&fn.serviceConfig?.serviceAccountEmail===(name==='collectMonitoring'?'manager-worker@satsunicmanager.iam.gserviceaccount.com':config.production.apiServiceAccount)&&fn.serviceConfig.maxInstanceCount===(name==='collectMonitoring'?1:2)&&fn.serviceConfig.maxInstanceRequestConcurrency===(name==='collectMonitoring'?1:8)&&fn.serviceConfig.timeoutSeconds===(name==='collectMonitoring'?60:30)&&['256Mi','256M'].includes(fn.serviceConfig.availableMemory))))throw Error('Fresh exact monitoring backend readback required');
 const publicConfig=JSON.parse(readFileSync('apps/web/dist/manager-config.json','utf8'));
 if(publicConfig.projectId!=='satsunicmanager'||publicConfig.region!=='us-central1'||publicConfig.oauthClientId!==config.production.oauthClientId||publicConfig.appCheckSiteKey!==config.production.appCheckSiteKey||publicConfig.emulator===true||publicConfig.monitoringEnabled!==true)throw Error('Exact production monitoring config required');
}
const only=phase==='backend'?names.map(name=>`functions:manager:${name}`).join(','):'hosting';
console.log(JSON.stringify({project:'satsunicmanager',phase,candidateHash:config.candidateHash,only}));
const result=spawnSync(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','deploy','--project','satsunicmanager','--only',only,'--non-interactive'],{stdio:'inherit',env:process.env});
process.exitCode=result.status??1;

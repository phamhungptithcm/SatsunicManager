import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {candidateHash} from '../validate/candidate.mjs';
const phase=process.argv[2];
const names=['beforeCreated','beforeSignedIn','bootstrapOwner','listApps','checkConnection','listIncidents','updateIncident','listNotifications','markNotificationRead','getOperations','addApp'];
if(!['backend','hosting'].includes(phase)||process.argv.length!==3)throw Error('Select exact backend or hosting phase');
const config=JSON.parse(readFileSync(process.env.MANAGER_DEPLOY_CONFIG??'', 'utf8'));
if(config.production?.projectId!=='satsunicmanager'||config.candidateHash!==candidateHash()||config.approvalRef!=='docs/approval-SM-RELEASE-009.md'||process.env.MANAGER_RELEASE_APPROVAL!=='SM-RELEASE-009')throw Error('Exact SM-RELEASE-009 approval and tested candidate required');
const checks=JSON.parse(readFileSync('docs/evidence/checks.json','utf8'));
const required=['typecheck','lint','build','unit','approval_regression','approval','secret_scan','doctor','emulator_rules_api','e2e'];
if(checks.candidateHash!==config.candidateHash||!required.every(name=>checks.checks?.some(check=>check.name===name&&check.candidateHash===config.candidateHash&&check.status==='PASSED')))throw Error('Fresh stable full release checks required');
const gate=spawnSync(process.execPath,['scripts/validate/doctor.mjs','--deployment'],{stdio:'inherit',env:process.env});
if(gate.status!==0)process.exit(gate.status??1);
if(phase==='hosting'){
 const evidence=JSON.parse(readFileSync('docs/evidence/release009-backend-readback.json','utf8'));
 const actual=evidence.functions??[];
 if(evidence.candidateHash!==config.candidateHash||actual.length!==names.length||!names.every(name=>actual.some(fn=>fn.name===`projects/satsunicmanager/locations/us-central1/functions/${name}`&&fn.state==='ACTIVE'&&fn.serviceConfig?.serviceAccountEmail===config.production.apiServiceAccount&&fn.serviceConfig.maxInstanceCount===2)))throw Error('Fresh exact backend readback required before Hosting');
}
const only=phase==='backend'?['firestore:rules','firestore:indexes',...names.map(name=>`functions:manager:${name}`)].join(','):'hosting';
console.log(JSON.stringify({project:'satsunicmanager',phase,candidateHash:config.candidateHash,only}));
const result=spawnSync(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','deploy','--project','satsunicmanager','--only',only,'--non-interactive'],{stdio:'inherit',env:process.env});
process.exitCode=result.status??1;

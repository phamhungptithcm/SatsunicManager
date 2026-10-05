import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {candidateHash} from '../validate/candidate.mjs';

// Fixed selection is the approved surface, regardless of other local exports.
const functions=['beforeCreated','beforeSignedIn','bootstrapOwner','listApps','checkConnection','listIncidents','updateIncident','listNotifications','markNotificationRead','getOperations'];
const phase=process.argv[2];
if(!['backend','hosting'].includes(phase)||process.argv.length!==3)throw Error('Select backend or hosting; no additional deployment arguments allowed');
const config=JSON.parse(readFileSync(process.env.MANAGER_DEPLOY_CONFIG??'', 'utf8'));
if(config.production?.projectId!=='satsunicmanager'||config.candidateHash!==candidateHash()||process.env.MANAGER_RELEASE_APPROVAL!=='SM-LIVE-006')throw Error('Exact approved Manager candidate required');
const gate=spawnSync(process.execPath,['scripts/validate/doctor.mjs','--deployment'],{stdio:'inherit',env:process.env});
if(gate.status!==0)process.exit(gate.status??1);
const only=phase==='backend'?['firestore:rules','firestore:indexes',...functions.map(name=>`functions:manager:${name}`)].join(','):'hosting';
console.log(JSON.stringify({project:'satsunicmanager',phase,candidateHash:config.candidateHash,only}));
const result=spawnSync(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','deploy','--project','satsunicmanager','--only',only,'--non-interactive'],{stdio:'inherit',env:process.env});
process.exitCode=result.status??1;

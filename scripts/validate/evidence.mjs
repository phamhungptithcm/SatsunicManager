import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { candidateHash } from './candidate.mjs';
const checks = [
  ['typecheck',['npm','run','typecheck']], ['lint',['npm','run','lint']], ['build',['npm','run','build']],
  ['unit',['npm','exec','vitest','--','run','tests/unit','--reporter=json','--outputFile=docs/evidence/unit-tests.json']],
  ['approval_regression',['python3','tests/unit/approval_gate_test.py']],
  ['approval',['python3','.ai/scripts/validate_implementation_approval.py','--path','firebase.json']],
  ['secret_scan',['node','scripts/validate/secret-scan.mjs']],
  ['doctor',['node','scripts/validate/doctor.mjs']],
];
if (process.argv.includes('--emulators')) {
  if(process.env.GCLOUD_PROJECT !== 'demo-satsunicmanager' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:28080') throw new Error('Use dedicated demo emulators only');
  checks.push(['emulator_rules_api',['npm','exec','vitest','--','run','tests/rules','tests/integration','--reporter=json','--outputFile=docs/evidence/emulator-tests.json']],['e2e',['npm','run','test:e2e']]);
}
const records=[];
mkdirSync('.ai/local/check-logs',{recursive:true});
for(const [name,[command,...args]] of checks) {
  // The API suite and browser use the same demo owner; respect the durable 10s probe cooldown.
  if(name==='e2e') spawnSync(process.execPath,['-e','setTimeout(()=>{},11000)'],{timeout:15000});
  const startedAt=new Date().toISOString(); const hash=candidateHash();
  const r=spawnSync(command,args,{encoding:'utf8',timeout:180000,env:process.env,maxBuffer:8*1024*1024});
  writeFileSync(`.ai/local/check-logs/${name}.txt`,(r.stdout??'')+'\n'+(r.stderr??''));
  records.push({name,command:[command,...args],startedAt,endedAt:new Date().toISOString(),candidateHash:hash,exitCode:r.status,status:r.status===0?'PASSED':name==='doctor'?'BLOCKED':'FAILED',error:r.error?.code??null});
  console.log(`${name}: ${records.at(-1).status} (exit ${r.status})`);
}
writeFileSync('docs/evidence/checks.json',JSON.stringify({candidateHash:candidateHash(),commit:null,environment:'local/demo emulators; public HunpeoLabs HTTPS probes',checks:records},null,2)+'\n');
process.exitCode=records.some(r=>r.status==='FAILED')?1:0;

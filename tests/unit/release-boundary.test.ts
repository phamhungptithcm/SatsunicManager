import {it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {candidateHash} from '../../scripts/validate/candidate.mjs';

it('release driver rejects extra deployment flags before reading config or invoking cloud',()=>{
 const result=spawnSync(process.execPath,['scripts/cloud/deploy-release.mjs','backend','--force'],{encoding:'utf8',env:{...process.env,MANAGER_DEPLOY_CONFIG:'/nonexistent'}});
 expect(result.status).not.toBe(0);expect(result.stderr).toContain('Select exact backend or hosting phase');
});
it('preferences release cannot substitute an unapproved runtime principal even with current approval hash',()=>{
 const directory=mkdtempSync(join(tmpdir(),'sm-preferences-runtime-'));
 try{
  const path=join(directory,'config.json');writeFileSync(path,JSON.stringify({production:{projectId:'satsunicmanager',region:'us-central1',apiServiceAccount:'unapproved@satsunicmanager.iam.gserviceaccount.com',origins:['https://satsunicmanager.web.app','https://satsunicmanager.firebaseapp.com']},candidateHash:candidateHash(),approvalRef:'docs/approval-SM-PREFERENCES-011.md'}));
  const result=spawnSync(process.execPath,['scripts/cloud/deploy-preferences.mjs','backend'],{encoding:'utf8',env:{...process.env,MANAGER_DEPLOY_CONFIG:path,MANAGER_RELEASE_APPROVAL:'SM-PREFERENCES-011'}});
  expect(result.status).not.toBe(0);expect(result.stderr).toContain('Exact approved runtime identity, region and origins required');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
it('preferences release rejects arbitrary arguments and stale approval before cloud access',()=>{
 const extra=spawnSync(process.execPath,['scripts/cloud/deploy-preferences.mjs','backend','--force'],{encoding:'utf8',env:{...process.env,MANAGER_DEPLOY_CONFIG:'/nonexistent'}});
 expect(extra.status).not.toBe(0);expect(extra.stderr).toContain('Select exact backend or hosting phase');
 const directory=mkdtempSync(join(tmpdir(),'sm-preferences-denial-'));
 try{
  const path=join(directory,'config.json');writeFileSync(path,JSON.stringify({production:{projectId:'satsunicmanager'},candidateHash:'stale',approvalRef:'docs/approval-SM-PREFERENCES-011.md'}));
  const result=spawnSync(process.execPath,['scripts/cloud/deploy-preferences.mjs','backend'],{encoding:'utf8',env:{...process.env,MANAGER_DEPLOY_CONFIG:path,MANAGER_RELEASE_APPROVAL:'SM-PREFERENCES-011'}});
  expect(result.status).not.toBe(0);expect(result.stderr).toContain('Exact SM-PREFERENCES-011 approval and tested candidate required');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
it('release driver fails closed for stale or unauthenticated release bindings',()=>{
 const directory=mkdtempSync(join(tmpdir(),'sm-release-denial-'));
 try{
  const path=join(directory,'config.json');writeFileSync(path,JSON.stringify({production:{projectId:'satsunicmanager'},candidateHash:'stale',approvalRef:'docs/approval-SM-RELEASE-009.md'}));
  const result=spawnSync(process.execPath,['scripts/cloud/deploy-release.mjs','backend'],{encoding:'utf8',env:{...process.env,MANAGER_DEPLOY_CONFIG:path,MANAGER_RELEASE_APPROVAL:'SM-RELEASE-009'}});
  expect(result.status).not.toBe(0);expect(result.stderr).toContain('Exact SM-RELEASE-009 approval and tested candidate required');
 }finally{rmSync(directory,{recursive:true,force:true});}
});

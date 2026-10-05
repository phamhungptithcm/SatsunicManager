import {it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
it('reports release selectors match actual exported callables',()=>{
 const wrapper=readFileSync('scripts/cloud/deploy-reports.mjs','utf8');
 const names=JSON.parse(wrapper.match(/const names=(\[[^;]+\]);/)![1].replaceAll("'",'"')) as string[];
 const backend=readFileSync('functions/src/index.ts','utf8');
 expect(names).toHaveLength(4);
 for(const name of names)expect(backend).toMatch(new RegExp(`export const ${name}\\s*=`));
 expect(names).toContain('exportOperationsReportCsv');
});
it('reports release rejects broad selectors and stale candidate before cloud access',()=>{
 const extra=spawnSync(process.execPath,['scripts/cloud/deploy-reports.mjs','backend','--force'],{encoding:'utf8',env:{...process.env,MANAGER_DEPLOY_CONFIG:'/nonexistent'}});
 expect(extra.status).not.toBe(0);expect(extra.stderr).toContain('Select exact backend or hosting phase');
 const directory=mkdtempSync(join(tmpdir(),'sm-report-release-'));
 try{const path=join(directory,'config.json');writeFileSync(path,JSON.stringify({production:{projectId:'satsunicmanager'},candidateHash:'stale',approvalRef:'docs/approval-SM-REPORTS-012.md'}));
 const result=spawnSync(process.execPath,['scripts/cloud/deploy-reports.mjs','backend'],{encoding:'utf8',env:{...process.env,MANAGER_DEPLOY_CONFIG:path,MANAGER_RELEASE_APPROVAL:'SM-REPORTS-012'}});
 expect(result.status).not.toBe(0);expect(result.stderr).toContain('Exact SM-REPORTS-012 approval and tested candidate required');
 }finally{rmSync(directory,{recursive:true,force:true});}
});

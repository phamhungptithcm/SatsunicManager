import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { candidateFiles } from '../../scripts/validate/candidate.mjs';
it('includes runtime configuration and shared source instead of treating source lib as build output',()=>{
  const files=candidateFiles();
  for(const path of ['apps/web/src/lib/firebase.ts','apps/web/src/lib/ui/action-progress.ts','packages/contracts/src/index.ts','functions/src/auth/authorize.ts','firebase.json','.gitignore','.node-version','.github/workflows/sanity.yml']) expect(files).toContain(path);
  expect(files.some((path:string)=>path.startsWith('functions/lib/'))).toBe(false);
});
it('keeps frontend lib source trackable while ignoring emitted backend artifacts',()=>{
  expect(spawnSync('git',['check-ignore','--quiet','apps/web/src/lib/firebase.ts']).status).toBe(1);
  expect(spawnSync('git',['check-ignore','--quiet','functions/lib/functions/src/index.js']).status).toBe(0);
});

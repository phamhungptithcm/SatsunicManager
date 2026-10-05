import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
export function candidateFiles() {
  const files = [];
  function walk(path) {
    for (const entry of readdirSync(path,{withFileTypes:true})) {
      if (['node_modules','dist','__pycache__'].includes(entry.name) || (path === 'functions' && entry.name === 'lib')) continue;
      const file = `${path}/${entry.name}`;
      if (entry.isDirectory()) walk(file); else if (entry.isFile() && !entry.name.endsWith('.tsbuildinfo')) files.push(file);
    }
  }
  ['apps','functions','packages','scripts','tests','.github/workflows'].filter(existsSync).forEach(walk);
  for (const file of ['.gitignore','.node-version','package.json','package-lock.json','tsconfig.base.json','eslint.config.js','vitest.config.ts','playwright.config.ts','firebase.json','firestore.rules','storage.rules','firestore.indexes.json','.ai/scripts/validate_implementation_approval.py']) if(existsSync(file)) files.push(file);
  return files.sort();
}
export function candidateHash() {
  const hash=createHash('sha256');
  candidateFiles().forEach(file=>{hash.update(file);hash.update('\0');hash.update(readFileSync(file));hash.update('\0');});
  return hash.digest('hex');
}

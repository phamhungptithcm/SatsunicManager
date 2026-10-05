import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { candidateFiles } from './candidate.mjs';
const patterns = [new RegExp(['-----BEGIN','(?: RSA| EC| OPENSSH)? PRIVATE KEY-----'].join('')), /(?:ghp|github_pat)_[A-Za-z0-9_]{30,}/, /AKIA[0-9A-Z]{16}/, /"type"\s*:\s*"service_account"/];
const findings = [];
for (const file of candidateFiles()) { const text=readFileSync(file,'utf8'); if(patterns.some(p=>p.test(text))) findings.push(file); }
function assets(path) {
  if(!existsSync(path)) return;
  for(const entry of readdirSync(path,{withFileTypes:true})) {
    const file=`${path}/${entry.name}`;
    if(entry.isDirectory()) assets(file);
    else if(/\.(js|html|json|map)$/.test(entry.name)) {
      const text=readFileSync(file,'utf8');
      if(text.includes('fixture-only') || entry.name.endsWith('.map') || patterns.some(p=>p.test(text))) findings.push(file);
    }
  }
}
assets('apps/web/dist');
console.log(JSON.stringify({status:findings.length?'FAILED':'PASSED',scope:'candidate source and built web assets; bounded signature scan, not a full secret scanner',findings}));
process.exitCode=findings.length?1:0;

import { writeFileSync } from 'node:fs';
import { probe } from '../../functions/lib/functions/src/integrations/health.js';
import { targetsFor } from '../../functions/lib/functions/src/integrations/catalog.js';
const results = await Promise.all(targetsFor('hunpeolabs','production').map(probe));
const evidence = { observedAt:new Date().toISOString(), source:'public_https', appId:'hunpeolabs', environment:'production', managerDeployed:false, coverage:'public_reachability and candidate readiness endpoint only', results };
writeFileSync('docs/evidence/real-probe.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
process.exitCode = results.every(r=>r.status==='healthy') ? 0 : 1;

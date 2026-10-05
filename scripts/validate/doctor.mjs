import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {candidateHash} from './candidate.mjs';
const deployment = process.argv.includes('--deployment');
const configPath = process.env.MANAGER_DEPLOY_CONFIG;
const checks = [];
const check = (id, pass, action) => checks.push({ id, status: pass ? 'PASSED' : 'BLOCKED', action: pass ? null : action });
check('node_lts', Number(process.versions.node.split('.')[0]) === 22, 'Run with .node-version (Node 22).');
check('workspace_lock', existsSync('package-lock.json'), 'Install approved dependencies with npm ci.');
check('manager_projects', Boolean(configPath && existsSync(configPath)), 'Provide an approved deployment config; verify the production Manager ID, never reuse customer Auth.');
if (configPath && existsSync(configPath)) {
  const c = JSON.parse(readFileSync(resolve(configPath), 'utf8'));
  const sourceProjects = new Set(['hunpeolabs-prod','satsuniccode','satsunicplan','satsunicseoextension','befam-b43bd','befam-490823','be-fam-3ab23']);
  const projects = [c.production?.projectId];
  check('manager_project', projects.every(p => typeof p === 'string' && /^[a-z][a-z0-9-]{5,29}$/.test(p) && !sourceProjects.has(p) && !p.startsWith('demo-')), 'Supply the verified production Manager project ID.');
  for (const name of ['production']) {
    const env = c[name] ?? {};
    for (const key of ['region','apiServiceAccount','oauthClientId','appCheckSiteKey','origins','billingApprovalRef','resourcePlanApprovalRef','googleOnlyProviderVerified','identityPlatformVerified']) {
      check(`${name}_${key}`, Boolean(env[key] && (key !== 'origins' || (Array.isArray(env.origins) && env.origins.length > 0 && env.origins.every(o => /^https:\/\//.test(o))))), `Verify ${name}.${key} with real cloud readback and approval.`);
    }
    check(`${name}_blocking_boundary`, c.phase==='bootstrap' ? env.signupClosedVerified===true : env.blockingTriggersVerified===true, 'Bootstrap requires closed signup; an active pilot requires both verified blocking triggers.');
  }
  if(deployment){
    const receipts={'SM-LIVE-006':'docs/approval-SM-LIVE-006.md','SM-RELEASE-009':'docs/approval-SM-RELEASE-009.md','SM-PREFERENCES-011':'docs/approval-SM-PREFERENCES-011.md','SM-MONITOR-010':'docs/approval-SM-MONITOR-010.md','SM-REPORTS-012':'docs/approval-SM-REPORTS-012.md'};
    const receipt=receipts[process.env.MANAGER_RELEASE_APPROVAL];
    check('release_approval',Boolean(receipt&&c.approvalRef===receipt&&existsSync(receipt)), 'Provide exact human release approval.');
    check('candidate_binding',c.candidateHash===candidateHash(),'Review/test the current candidate and bind its hash before deployment.');
    check('phase', ['bootstrap','pilot'].includes(c.phase),'Choose an approved rollout phase.');
  }
} else check('cloud_setup', false, 'Deployment blocked: no confirmed OAuth/Identity Platform/App Check, region, service identities or approved resource plan.');
check('production_not_emulator', !deployment || !process.env.FIRESTORE_EMULATOR_HOST, 'Remove emulator settings before deployment.');
console.log(JSON.stringify({ mode: deployment ? 'deployment' : 'preflight', readiness:'NOT_READY', checks }, null, 2));
// Passing bootstrap permits provisioning only; it does not certify full production acceptance.
process.exitCode=checks.some(c=>c.status!=='PASSED')?1:0;

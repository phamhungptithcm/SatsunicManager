import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const project=process.env.SM_VERIFY_PROJECT ?? 'satsunicmanager';
if (!['satsunicmanager'].includes(project)) throw new Error('Unapproved verification project');
const require=createRequire(import.meta.url);
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {Client}=require('firebase-tools/lib/apiv2');
const {listFirebaseApps,AppPlatform}=require('firebase-tools/lib/management/apps');
await requireAuth({project:project,...getGlobalDefaultAccount()});
const cli=(args)=>{
 const result=spawnSync('gcloud',args,{encoding:'utf8',timeout:30000});
 return {exitCode:result.status,data:result.status===0?JSON.parse(result.stdout):null};
};
const rules=new Client({urlPrefix:'https://firebaserules.googleapis.com',apiVersion:'v1'});
const release=(await rules.get(`/projects/${project}/releases/cloud.firestore`,{queryParams:{fields:'name,rulesetName,updateTime'}})).body;
const ruleset=(await rules.get('/'+release.rulesetName,{queryParams:{fields:'name,source.files'},skipLog:{resBody:true}})).body;
const remote=ruleset.source.files.find(file=>file.name==='firestore.rules');
const hash=value=>createHash('sha256').update(value).digest('hex');
const local=hash(readFileSync('firestore.rules','utf8'));
const deployed=remote?hash(remote.content):null;
const anonymous=await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/apps/manager-security-read-probe`);
const anonymousResult=await anonymous.json();
const apps=(await listFirebaseApps(project,AppPlatform.WEB)).map(({appId,projectId,displayName,state})=>({appId,projectId,displayName,state}));
const report={apps,projectId:project,verifiedAt:new Date().toISOString(),approvalRef:'docs/approval-SM-CLOUD-003.md',
 database:cli(['firestore','databases','describe',`--project=${project}`,'--database=(default)','--format=json(name,locationId,type,deleteProtectionState,createTime)']),
 billing:cli(['billing','projects','describe',project,'--format=json(projectId,billingEnabled,billingAccountName)']),
 buckets:cli(['storage','buckets','list',`--project=${project}`,'--format=json(name,location)']),
 rules:{release,rulesetName:ruleset.name,localHash:local,deployedHash:deployed,exactSourceMatch:local===deployed},
 anonymousRead:{httpStatus:anonymous.status,errorCode:anonymousResult.error?.status??null,expectedDenied:[401,403].includes(anonymous.status)},
 limitations:['No production Google session or backend deployment','No authenticated owner read tested','No production data write or deletion attempted']};
writeFileSync(`docs/evidence/${project}-cloud-setup.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(local!==deployed || !report.anonymousRead.expectedDenied) process.exitCode=1;

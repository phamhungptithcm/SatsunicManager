import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {Client}=require('firebase-tools/lib/apiv2');
await requireAuth({project:'satsunicmanager',...getGlobalDefaultAccount()});
const catalog=[['hunpeolabs','hunpeolabs-prod'],['satsunicseo','satsunicseoextension'],['satsuniccode','satsuniccode'],['satsunicplan','satsunicplan'],['befam','be-fam-3ab23']];
const checks=[];
for(const [appId,project] of catalog){
 for(const [capability,prefix,path,queryParams] of [
  ['services','https://run.googleapis.com',`/v2/projects/${project}/locations/-/services`,{pageSize:100,fields:'services(name,uri,latestReadyRevision),nextPageToken'}],
  ['metric_descriptors','https://monitoring.googleapis.com',`/v3/projects/${project}/metricDescriptors`,{filter:'metric.type = starts_with("run.googleapis.com/")',pageSize:100,fields:'metricDescriptors(type,metricKind,valueType,unit,displayName),nextPageToken'}],
  ['billing_exports','https://bigquery.googleapis.com',`/bigquery/v2/projects/${project}/datasets`,{maxResults:100,fields:'datasets(datasetReference,location),nextPageToken'}],
 ]){
  try {const r=await new Client({urlPrefix:prefix,apiVersion:''}).get(path,{queryParams,resolveOnHTTPError:true});checks.push({appId,projectId:project,capability,status:r.status,data:r.status===200?r.body:null,errorCode:r.status>=400?r.body?.error?.status??'UNAVAILABLE':null});}
  catch{checks.push({appId,projectId:project,capability,status:null,data:null,errorCode:'REQUEST_FAILED'});}
 }
}
const report={checkedAt:new Date().toISOString(),identity:'authenticated CLI administrator, not Manager runtime',mode:'read-only metadata; no secrets, raw logs or billing query',checks};
writeFileSync('docs/evidence/source-discovery.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checkedAt:report.checkedAt,checks:checks.map(({appId,capability,status,errorCode})=>({appId,capability,status,errorCode}))},null,2));

import {it,expect} from 'vitest';
import {validateMonitoringJob,validateMonitoringWorker} from '../../scripts/cloud/monitoring-policy.mjs';
const uri='https://collectmonitoring-example-uc.a.run.app';
const job=()=>({name:'projects/satsunicmanager/locations/us-central1/jobs/manager-monitoring-15m',schedule:'*/15 * * * *',timeZone:'Etc/UTC',state:'ENABLED',attemptDeadline:'60s',httpTarget:{uri,httpMethod:'POST',body:Buffer.from('{}').toString('base64'),oidcToken:{serviceAccountEmail:'manager-scheduler@satsunicmanager.iam.gserviceaccount.com',audience:uri}}});
it('accepts protobuf omitted zero retry defaults but rejects positive retries and injected body',()=>{
 expect(()=>validateMonitoringJob(job(),uri)).not.toThrow();
 expect(()=>validateMonitoringJob({...job(),retryConfig:{retryCount:1}},uri)).toThrow();
 expect(()=>validateMonitoringJob({...job(),retryConfig:{maxRetryDuration:'60s'}},uri)).toThrow();
 expect(()=>validateMonitoringJob({...job(),httpTarget:{...job().httpTarget,body:Buffer.from('{"project":"other"}').toString('base64')}},uri)).toThrow();
});
it('rejects OIDC recipient/audience substitution, paused schedule and altered deadline',()=>{
 for(const changed of [{state:'PAUSED'},{attemptDeadline:'600s'},{schedule:'* * * * *'},{httpTarget:{...job().httpTarget,oidcToken:{...job().httpTarget.oidcToken,audience:'https://other.example'}}}])expect(()=>validateMonitoringJob({...job(),...changed},uri)).toThrow();
});
it('requires exact caps and private single scheduler transport binding',()=>{
 const fn={state:'ACTIVE',serviceConfig:{serviceAccountEmail:'manager-worker@satsunicmanager.iam.gserviceaccount.com',maxInstanceCount:1,maxInstanceRequestConcurrency:1,timeoutSeconds:60,availableMemory:'256Mi',uri}};
 const policy={bindings:[{role:'roles/run.invoker',members:['serviceAccount:manager-scheduler@satsunicmanager.iam.gserviceaccount.com']}]};
 expect(()=>validateMonitoringWorker(fn,policy)).not.toThrow();
 expect(()=>validateMonitoringWorker(fn,{bindings:[...policy.bindings,{role:'roles/run.invoker',members:['allUsers']}]})).toThrow();
 expect(()=>validateMonitoringWorker({...fn,serviceConfig:{...fn.serviceConfig,maxInstanceCount:2}},policy)).toThrow();
 expect(()=>validateMonitoringWorker(fn,{bindings:[]})).toThrow();
 expect(()=>validateMonitoringWorker(fn,{bindings:[{role:'roles/run.invoker',members:[...policy.bindings[0].members,'serviceAccount:other@example.com']}]})).toThrow();
});

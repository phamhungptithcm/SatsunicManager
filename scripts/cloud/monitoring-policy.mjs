export function validateMonitoringWorker(fn,policy){
 const service=fn?.serviceConfig;
 if(fn?.state!=='ACTIVE'||service?.serviceAccountEmail!=='manager-worker@satsunicmanager.iam.gserviceaccount.com'||service.maxInstanceCount!==1||service.maxInstanceRequestConcurrency!==1||service.timeoutSeconds!==60||!['256Mi','256M'].includes(service.availableMemory)||!/^https:\/\/[^/?#]+\.a\.run\.app\/?$/.test(service.uri??''))throw Error('Exact ACTIVE private worker required');
 if((policy?.bindings??[]).some(b=>b.members?.some(m=>m==='allUsers'||m==='allAuthenticatedUsers')))throw Error('Worker must remain private');
 const allowed='serviceAccount:manager-scheduler@satsunicmanager.iam.gserviceaccount.com';
 if((policy?.bindings??[]).some(b=>b.role==='roles/run.invoker'&&(b.condition||b.members?.some(member=>member!==allowed))))throw Error('Unapproved worker invoker binding');
 const binding=policy?.bindings?.find(b=>b.role==='roles/run.invoker'&&!b.condition);
 if(!binding?.members?.includes('serviceAccount:manager-scheduler@satsunicmanager.iam.gserviceaccount.com'))throw Error('Exact scheduler invoker binding missing');
}
export function validateMonitoringJob(job,uri){
 if(job?.name!=='projects/satsunicmanager/locations/us-central1/jobs/manager-monitoring-15m'||job.schedule!=='*/15 * * * *'||job.timeZone!=='Etc/UTC'||job.state!=='ENABLED'||job.attemptDeadline!=='60s'||job.httpTarget?.uri!==uri||job.httpTarget?.httpMethod!=='POST'||job.httpTarget?.oidcToken?.serviceAccountEmail!=='manager-scheduler@satsunicmanager.iam.gserviceaccount.com'||job.httpTarget?.oidcToken?.audience!==uri||job.httpTarget?.body!==Buffer.from('{}').toString('base64')||(job.retryConfig?.retryCount??0)!==0||(job.retryConfig?.maxRetryDuration??'0s')!=='0s')throw Error('Exact approved Scheduler job required');
}

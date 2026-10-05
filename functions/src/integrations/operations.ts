import {z} from 'zod';
import {HttpsError} from 'firebase-functions/v2/https';
import {digest} from '../shared/mutation.js';
import {APP_CATALOG,type Scope} from '../../../packages/contracts/src/index.js';
import {operationsInputSchema,operationsResponseSchema,type OperationsResponse} from '../../../packages/contracts/src/metrics.js';
import {RESOURCE_CATALOG} from './resources.js';
import {googleRead,type GoogleReader} from './google-read.js';
const seriesSchema=z.object({timeSeries:z.array(z.object({metric:z.object({labels:z.record(z.string(),z.string()).default({})}),points:z.array(z.object({interval:z.object({endTime:z.iso.datetime()}),value:z.object({int64Value:z.string().regex(/^\d+$/)})})).default([])})).default([]),nextPageToken:z.string().optional()});
const logsSchema=z.object({entries:z.array(z.object({timestamp:z.iso.datetime(),severity:z.string().default('DEFAULT'),resource:z.object({labels:z.object({service_name:z.string().default('unknown')})}),httpRequest:z.object({status:z.number().int().optional()}).optional()})).default([]),nextPageToken:z.string().optional()});
const reason=(status:number)=>status===403?'permission_denied':status===429?'rate_limited':`source_http_${status}`;
export function serviceFilter(services:readonly string[],location?:string){return `${location?`resource.labels.location="${location}" AND `:''}resource.type="cloud_run_revision" AND (${services.map(service=>`resource.labels.service_name="${service}"`).join(' OR ')})`;}
export function monitoringServiceFilter(services:readonly string[],location:string){return `resource.type="cloud_run_revision" AND resource.labels.location=${JSON.stringify(location)} AND resource.labels.service_name=one_of(${services.map(service=>JSON.stringify(service)).join(',')})`;}
export function metricTotals(series:z.infer<typeof seriesSchema>){
 if(series.nextPageToken)return null;
 const buckets=new Map<string,{at:string;requests:number;errors:number}>();
 for(const row of series.timeSeries){const code=row.metric.labels.response_code; if(!code||!/^\d{3}$/.test(code))return null;
  for(const point of row.points){const n=Number(point.value.int64Value);if(!Number.isSafeInteger(n)||n<0)return null;const at=point.interval.endTime;const bucket=buckets.get(at)??{at,requests:0,errors:0};bucket.requests+=n;if(Number(code)>=500)bucket.errors+=n;if(!Number.isSafeInteger(bucket.requests))return null;buckets.set(at,bucket);}}
 const points=[...buckets.values()].sort((a,b)=>a.at.localeCompare(b.at));const requests=points.reduce((sum,p)=>sum+p.requests,0);const errors=points.reduce((sum,p)=>sum+p.errors,0);
 if(!Number.isSafeInteger(requests)||!Number.isSafeInteger(errors))return null;
 return {points,requestCount:requests,serverErrorCount:errors,errorRate:requests?errors/requests:null};
}
export async function readOperations(input:unknown,read:GoogleReader=googleRead,apps:readonly {id:string;name:string}[]=APP_CATALOG,options:{includeLogs:boolean}={includeLogs:true}):Promise<OperationsResponse>{
 const {scope,logCursor}=operationsInputSchema.parse(input);const fetchedAt=new Date().toISOString();
 // Query tokens are only supported for one selected app; all-app paging is per-source.
 if(logCursor&&scope.appId==='all')throw new HttpsError('invalid-argument','Select one application for pagination.');
 let pageToken:string|undefined;
 if(logCursor){try{const cursor=JSON.parse(Buffer.from(logCursor,'base64url').toString()) as unknown;if(!Array.isArray(cursor)||cursor.length!==2||cursor[0]!==digest(JSON.stringify(scope))||typeof cursor[1]!=='string'||cursor[1].length>2500)throw Error();pageToken=cursor[1];}catch{throw new HttpsError('invalid-argument','Invalid page.');}}
 const selected=apps.filter(app=>scope.appId==='all'||app.id===scope.appId);
 if(scope.appId!=='all'&&!selected.length)throw new HttpsError('not-found','Application unavailable.');
 const data=await Promise.all(selected.map(async app=>{
  const source=RESOURCE_CATALOG[app.id];
  const result:OperationsResponse['data'][number]={appId:app.id,projectId:source?.projectId??null,services:[...(source?.services??[])],metrics:{status:'not_configured',requestCount:null,serverErrorCount:null,errorRate:null,points:[],reason:'resource_not_verified'},logs:{status:'not_configured',entries:[],nextCursor:null,reason:'resource_not_verified'},provenance:{provider:'Google Cloud',resourceRef:source?`projects/${source.projectId}`:null,queryVersion:'operations-v1',metricDefinitionVersion:'cloud-run-requests-v1'},freshness:{fetchedAt,observedThrough:null}};
  if(!source)return result;
  const filter=serviceFilter(source.services,source.location);
  await Promise.all([
   (async()=>{try{
    const params=new URLSearchParams({filter:`metric.type="run.googleapis.com/request_count" AND ${monitoringServiceFilter(source.services,source.location)}`,'interval.startTime':scope.from,'interval.endTime':scope.to,'aggregation.alignmentPeriod':'3600s','aggregation.perSeriesAligner':'ALIGN_SUM',view:'FULL',pageSize:'500',fields:'timeSeries(metric(labels),points(interval(endTime),value(int64Value))),nextPageToken'});
    const r=await read(`https://monitoring.googleapis.com/v3/projects/${source.projectId}/timeSeries?${params}`);
    if(r.status!==200){result.metrics.status=r.status===403?'permission_denied':'failed';result.metrics.reason=reason(r.status);return;}
    const series=seriesSchema.parse(r.data);const totals=metricTotals(series);
    if(!totals){result.metrics.status='partial';result.metrics.reason='incomplete_or_invalid_series';return;}
    if(!series.timeSeries.length||!totals.points.length){result.metrics.status='empty';result.metrics.reason='no_observations';return;}
    result.metrics={status:'available',...totals,reason:null};result.freshness.observedThrough=totals.points.at(-1)?.at??null;
   }catch{result.metrics.status='failed';result.metrics.reason='source_unavailable';}})(),
   (async()=>{if(!options.includeLogs){result.logs.reason='on_demand_only';return;}try{
    const r=await read('https://logging.googleapis.com/v2/entries:list?fields=entries(timestamp,severity,resource(labels),httpRequest(status)),nextPageToken',{resourceNames:[`projects/${source.projectId}/locations/global/buckets/_Default/views/_Default`],filter:`${filter} AND timestamp >= "${scope.from}" AND timestamp < "${scope.to}"`,orderBy:'timestamp desc',pageSize:25,...(pageToken?{pageToken}:{})});
    if(r.status!==200){result.logs.status=r.status===403?'permission_denied':'failed';result.logs.reason=reason(r.status);return;}
    const logs=logsSchema.parse(r.data);result.logs={status:logs.entries.length?'available':'empty',entries:logs.entries.map(entry=>({at:entry.timestamp,severity:entry.severity,service:entry.resource.labels.service_name,httpStatus:entry.httpRequest?.status??null})),nextCursor:logs.nextPageToken&&logs.nextPageToken.length<=2500?Buffer.from(JSON.stringify([digest(JSON.stringify(scope)),logs.nextPageToken])).toString('base64url'):null,reason:logs.entries.length?null:'no_observations'};
   }catch{result.logs.status='failed';result.logs.reason='source_unavailable';}})(),
  ]);
  return result;
 }));
 return operationsResponseSchema.parse({data,meta:{scope,fetchedAt,fixture:process.env.GCLOUD_PROJECT?.startsWith('demo-')===true}});
}
export type OperationsScope=Scope;

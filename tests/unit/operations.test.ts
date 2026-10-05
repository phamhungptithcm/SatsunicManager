import {describe,it,expect} from 'vitest';
import {readOperations,metricTotals,serviceFilter} from '../../functions/src/integrations/operations';
const scope={appId:'hunpeolabs',environment:'production',from:'2026-10-01T00:00:00.000Z',to:'2026-10-02T00:00:00.000Z',timezone:'America/Chicago'};
const series=(code:string,n:string)=>({metric:{labels:{response_code:code}},points:[{interval:{endTime:'2026-10-01T01:00:00.000Z'},value:{int64Value:n}}]});
describe('Actual Monitoring/Logging adapter contract',()=>{
 it('weights HTTP5xx by total requests and never averages per-service rates',()=>{const total=metricTotals({timeSeries:[series('200','90'),series('503','10')]});expect(total?.requestCount).toBe(100);expect(total?.errorRate).toBe(.1);});
 it('does not call missing data valid zero or aggregate truncated/unsafe series',()=>{expect(metricTotals({timeSeries:[series('200','9007199254740992')]})).toBeNull();expect(metricTotals({timeSeries:[series('200','1')],nextPageToken:'more'})).toBeNull();expect(metricTotals({timeSeries:[series('200','0')]})?.errorRate).toBeNull();});
 it('server-resolves scope and fetches only metadata fields, never raw payload',async()=>{
  const calls:{url:string;body:unknown}[]=[];
  const result=await readOperations({scope},async(url,body)=>{calls.push({url,body});return {status:200,data:body?{entries:[{timestamp:'2026-10-01T00:01:00.000Z',severity:'ERROR',resource:{labels:{service_name:'hunpeolabs'}},httpRequest:{status:503}}]}:{timeSeries:[series('200','7')]}};});
  expect(result.data[0]?.metrics.requestCount).toBe(7);expect(result.data[0]?.logs.entries[0]?.httpStatus).toBe(503);
  const log=calls.find(c=>c.body)!;expect(new URL(log.url).searchParams.get('fields')).not.toContain('jsonPayload');expect(log.body).toMatchObject({resourceNames:['projects/hunpeolabs-prod/locations/global/buckets/_Default/views/_Default'],pageSize:25});
  expect(serviceFilter(['hunpeolabs'])).toContain('resource.labels.service_name="hunpeolabs"');
 });
 it('rejects browser project/filter injections and unverified mapping without source calls',async()=>{
  await expect(readOperations({scope,projectId:'other'},async()=>{throw Error('Must not call');})).rejects.toThrow();
  const result=await readOperations({scope:{...scope,appId:'befam'}},async()=>{throw Error('Must not call');});expect(result.data[0]?.metrics.status).toBe('not_configured');expect(result.data[0]?.metrics.requestCount).toBeNull();
 });
 it('uses a compatible Monitoring selector for multi-service regional sources',async()=>{
  let filter='';await readOperations({scope:{...scope,appId:'satsunicseo'}},async(url,body)=>{if(!body)filter=new URL(url).searchParams.get('filter')??'';return {status:200,data:{}};});
  expect(filter).toContain('resource.labels.location="asia-southeast1"');
  expect(filter).toContain('resource.labels.service_name=one_of("billingmaintenance","maintenance","runjob","googleconnectioncallback","billingwebhook","api")');
  expect(filter).not.toContain(' OR ');
 });
 it('does not fetch logs during metrics-only background collection',async()=>{const calls:string[]=[];await readOperations({scope},async(url)=>{calls.push(url);return {status:200,data:{}};},undefined,{includeLogs:false});expect(calls).toHaveLength(1);expect(calls[0]).toContain('monitoring.googleapis.com');});
 it('keeps empty per-series point arrays unavailable rather than valid zero',async()=>{const result=await readOperations({scope},async()=>({status:200,data:{timeSeries:[{metric:{labels:{response_code:'200'}},points:[]}]}}));expect(result.data[0]?.metrics.status).toBe('empty');expect(result.data[0]?.metrics.requestCount).toBeNull();});
 it('handles permission, empty, rate-limit and timeout without invented observations',async()=>{
  for(const status of [403,429,503]){const result=await readOperations({scope},async()=>({status,data:null}));expect(result.data[0]?.metrics.requestCount).toBeNull();expect(result.data[0]?.metrics.status).toBe(status===403?'permission_denied':'failed');}
  const empty=await readOperations({scope},async()=>({status:200,data:{}}));expect(empty.data[0]?.metrics.status).toBe('empty');expect(empty.data[0]?.metrics.requestCount).toBeNull();
  const timeout=await readOperations({scope},async()=>{throw Error('timeout');});expect(timeout.data[0]?.metrics.status).toBe('failed');
 });
});

import {describe,it,expect,vi} from 'vitest';
import {EventEmitter} from 'node:events';
// Import the real entry point after setting runtime config: catches ES module ordering.
describe('Deployed endpoint identity',()=>{
  it('pins both blocking endpoints to the configured region and dedicated identity',async()=>{
    vi.resetModules();
    vi.stubEnv('GCLOUD_PROJECT','demo-satsunicmanager');
    vi.stubEnv('MANAGER_REGION','us-central1');
    vi.stubEnv('MANAGER_API_SERVICE_ACCOUNT','manager-api@satsunicmanager.iam.gserviceaccount.com');
    try {
      const {beforeCreated,beforeSignedIn}=await import('../../functions/src/index');
      for(const endpoint of [beforeCreated.__endpoint,beforeSignedIn.__endpoint]){
        expect(endpoint.region).toEqual(['us-central1']);
        expect(endpoint.serviceAccountEmail).toBe('manager-api@satsunicmanager.iam.gserviceaccount.com');
        expect(endpoint.timeoutSeconds).toBe(7);
        expect(endpoint.maxInstances).toBe(2);
        expect(endpoint.availableMemoryMb).toBe(256);
      }
      vi.stubEnv('FUNCTIONS_EMULATOR','');
      vi.stubEnv('MANAGER_REGION','');
      const event = {data:{email:'hunpeo97@gmail.com',emailVerified:true},additionalUserInfo:{providerId:'google.com'}} as Parameters<typeof beforeCreated.run>[0];
      expect(()=>beforeCreated.run(event)).toThrow('Service configuration unavailable.');
      await expect(beforeSignedIn.run(event)).rejects.toMatchObject({code:'failed-precondition'});
    } finally {vi.unstubAllEnvs();}
  });
});

it('keeps every release callable on the dedicated identity with App Check and bounded runtime',async()=>{
 vi.resetModules();
 vi.stubEnv('GCLOUD_PROJECT','satsunicmanager');
 vi.stubEnv('FUNCTIONS_EMULATOR','');
 vi.stubEnv('MANAGER_REGION','us-central1');
 vi.stubEnv('MANAGER_API_SERVICE_ACCOUNT','manager-api@satsunicmanager.iam.gserviceaccount.com');
 vi.stubEnv('MANAGER_ORIGINS','https://satsunicmanager.web.app,https://satsunicmanager.firebaseapp.com');
 try{
  const api=await import('../../functions/src/index');
  for(const name of ['bootstrapOwner','listApps','checkConnection','listIncidents','updateIncident','listNotifications','markNotificationRead','getOperations','addApp','listMonitoringSnapshots'] as const){
   const endpoint=api[name].__endpoint;
   expect(endpoint.serviceAccountEmail).toBe('manager-api@satsunicmanager.iam.gserviceaccount.com');
   expect(endpoint.region).toEqual(['us-central1']);
   expect(endpoint.maxInstances).toBe(2);expect(endpoint.concurrency).toBe(8);
   expect(endpoint.timeoutSeconds).toBe(30);expect(endpoint.availableMemoryMb).toBe(256);
   // Firebase's deployment manifest intentionally omits enforceAppCheck.
   // Exercise the real SDK HTTP wrapper, not .run(), which bypasses transport checks.
   const headers:Record<string,string>={'content-type':'application/json'};
   const request={method:'POST',headers,body:{data:{}},header:(key:string)=>headers[key.toLowerCase()]};
   let status=0,body:unknown;
   const response=Object.assign(new EventEmitter(),{getHeader:()=>undefined,setHeader:()=>undefined,status:(code:number)=>{status=code;return response;},send:(value:unknown)=>{body=value;response.emit('finish');return response;}});
   await api[name](request as Parameters<typeof api[typeof name]>[0],response as unknown as Parameters<typeof api[typeof name]>[1]);
   expect(status).toBe(401);expect(body).toMatchObject({error:{status:'UNAUTHENTICATED',message:'Unauthenticated'}});
   if(name==='addApp'){
    // Mutation control: disabling App Check reaches the domain Auth denial,
    // whose distinct message would make the guarded assertion above fail.
    const {onCall}=await import('firebase-functions/v2/https');
    const unguarded=onCall({enforceAppCheck:false,cors:false},api.addApp.run);
    await unguarded(request as Parameters<typeof unguarded>[0],response as unknown as Parameters<typeof unguarded>[1]);
    expect(body).toMatchObject({error:{status:'UNAUTHENTICATED',message:'Sign in required.'}});
   }
  }
 }finally{vi.unstubAllEnvs();}
});

 it('pins the private monitoring worker to only the approved scheduler and worker identities', async () => {
  const {collectMonitoring}=await import('../../functions/src/index');
  const endpoint=collectMonitoring.__endpoint;
  expect(endpoint.region).toEqual(['us-central1']);
  expect(endpoint.serviceAccountEmail).toBe('manager-worker@satsunicmanager.iam.gserviceaccount.com');
  expect(endpoint.httpsTrigger?.invoker).toEqual(['manager-scheduler@satsunicmanager.iam.gserviceaccount.com']);
  expect(endpoint.maxInstances).toBe(1); expect(endpoint.concurrency).toBe(1);
  expect(endpoint.timeoutSeconds).toBe(60); expect(endpoint.availableMemoryMb).toBe(256);
 });

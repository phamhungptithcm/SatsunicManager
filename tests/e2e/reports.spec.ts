import {test,expect,type Page} from '@playwright/test';

test.beforeEach(async({context})=>{
 await context.route('https://unpkg.com/material-components-web@10/**',route=>route.fulfill({body:'',contentType:route.request().url().endsWith('.css')?'text/css':'application/javascript'}));
 await context.route('https://fonts.googleapis.com/**',route=>route.fulfill({body:'',contentType:'text/css'}));
});
async function login(page:Page){
 await page.goto('/');const pending=page.waitForEvent('popup');
 await page.getByRole('button',{name:'Đăng nhập bằng Google',exact:true}).click();const popup=await pending;
 await popup.waitForFunction(()=>typeof(window as unknown as {toggleForm?:unknown}).toggleForm==='function');
 await popup.getByRole('button',{name:'Add new account'}).click();await popup.locator('#email-input').fill('hunpeo97@gmail.com');await popup.getByRole('button',{name:/Sign in/i}).click();
 await expect(page.getByRole('heading',{name:'Tổng quan',exact:true,level:1})).toBeVisible();
}
async function settled(page:Page){
 await page.locator('.workspace').evaluate(async element=>{
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  await Promise.all(element.getAnimations({subtree:true}).filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));
 });
}
test('reports persist new versions, preserve unknown totals and export exact saved CSV bytes',async({page})=>{
 test.setTimeout(120000);
 const {initializeApp,deleteApp}=await import('firebase-admin/app');const {getFirestore,Timestamp}=await import('firebase-admin/firestore');const {createHash}=await import('node:crypto');
 if(process.env.GCLOUD_PROJECT!=='demo-satsunicmanager'||process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:28080')throw Error('Dedicated demo emulator only');
 const admin=initializeApp({projectId:'demo-satsunicmanager'},'reports-browser-fixture'),db=getFirestore(admin),now=Date.now();
 const firstId=createHash('sha256').update(`reports-e2e-first-${now}`).digest('hex'),secondId=createHash('sha256').update(`reports-e2e-next-${now}`).digest('hex');
 const checkpoint=db.doc('connectorCheckpoints/operations_metrics_v1_satsunicplan'),priorCheckpoint=await checkpoint.get();
 const saved:Array<{id:string;scope:unknown;ownerUid:string;key:string}>=[];
 const historicalPaths:string[]=[];
 const reportSnapshot=(id:string,end:number,requests:number)=>({id,scope:{appId:'satsunicplan',environment:'production',timezone:'America/Chicago',from:new Date(end-3600000).toISOString(),to:new Date(end).toISOString()},status:'complete',fixture:true,queryVersion:'collector-v1',createdAt:Timestamp.fromMillis(now-1000),data:[{appId:'satsunicplan',projectId:'satsunicplan',services:['emulator-report-service'],metrics:{status:'available',requestCount:requests,serverErrorCount:2,errorRate:2/requests,points:[{at:new Date(end).toISOString(),requests,errors:2}],reason:null},provenance:{provider:'Google Cloud',resourceRef:'projects/satsunicplan',queryVersion:'operations-v1',metricDefinitionVersion:'cloud-run-requests-v1'},freshness:{fetchedAt:new Date(now-1000).toISOString(),observedThrough:new Date(end).toISOString()}}]});
 const createVersion=async(label:string)=>{
  const generated=page.waitForResponse(response=>response.url().endsWith('/generateOperationsReport'));
  const read=page.waitForResponse(response=>response.url().endsWith('/getOperationsReport'));
  await page.getByRole('button',{name:label,exact:true}).click();const response=await generated;expect(response.status(),await response.text()).toBe(200);
  const body=await response.json();const value=body.result as {id:string;version:number;scope:unknown};
  const owner=(await db.collection('ownerAccess').where('email','==','hunpeo97@gmail.com').get()).docs[0];if(!owner)throw Error('Demo owner unavailable');
  saved.push({id:value.id,scope:value.scope,ownerUid:owner.id,key:response.request().postDataJSON().data.idempotencyKey});
  expect((await db.doc(`owners/${owner.id}/operationReports/${value.id}`).get()).exists).toBe(true);
  expect((await read).status()).toBe(200);
  await expect(page.getByTestId('report-version').getByRole('heading',{name:`Phiên bản ${value.version}`,exact:true})).toBeVisible();return value;
 };
 const downloadVersion=async()=>{
  const responsePromise=page.waitForResponse(response=>response.url().endsWith('/exportOperationsReportCsv'));
  const downloadPromise=page.waitForEvent('download');await page.getByTestId('report-version').getByRole('button',{name:'Tải CSV',exact:true}).click();
  const response=await responsePromise;expect(response.status(),await response.text()).toBe(200);const result=(await response.json()).result as {id:string;version:number;csv:string;filename:string};
  const download=await downloadPromise,path=await download.path();if(!path)throw Error('Download unavailable');const {readFile}=await import('node:fs/promises');
  expect(await readFile(path)).toEqual(Buffer.from(result.csv,'utf8'));expect(download.suggestedFilename()).toBe(result.filename);return result;
 };
 try{
  await db.doc(`operationsSnapshots/${firstId}`).set(reportSnapshot(firstId,now-2*3600000,120));await checkpoint.set({cursor:new Date(now-2*3600000).toISOString()});
  await login(page);await page.getByRole('link',{name:'Báo cáo',exact:true}).click();await expect(page.getByRole('heading',{name:'Báo cáo',exact:true,level:1})).toBeVisible();
  await page.getByRole('combobox',{name:'Ứng dụng',exact:true}).selectOption('satsunicplan');
  await expect(page.getByText('Chưa có báo cáo cho phạm vi này.',{exact:true})).toBeVisible();
  const first=await createVersion('Tạo báo cáo');const view=page.getByTestId('report-version');
  await expect(view).toContainText('Chưa đủ dữ liệu');await expect(view).toContainText('SatsunicPlan');
  await expect(view).toContainText('Nguồn đã đọc:');await expect(view).toContainText('Đã đo:');
  await expect(view).toContainText('Số lượt được gộp theo giờ; không phải tổng chính xác cho từng khoảng đọc nguồn.');
  await expect(view.locator('.metrics strong')).toHaveText(['—','—','—']);
  await view.locator('details').filter({has:page.getByText('Các khoảng nguồn · 1',{exact:true})}).locator('summary').click();
  await expect(view.locator('tbody')).toContainText('120');await expect(view.locator('tbody')).toContainText(firstId.slice(0,12));
  await view.getByText('Phạm vi báo cáo',{exact:true}).click();await expect(view).toContainText(first.id);
  await expect(view).toContainText('Tài chính · Lượt sử dụng · Sự cố · Gửi email · PDF');
  const original=await downloadVersion();expect(original.id).toBe(first.id);expect(original.version).toBe(first.version);
  expect(original.csv).toContain(`"${firstId}"`);expect(original.csv).toContain('"120"');
  await db.doc(`operationsSnapshots/${secondId}`).set(reportSnapshot(secondId,now-3600000,60));await checkpoint.set({cursor:new Date(now-3600000).toISOString()});
  const uncertain:{value:{id:string;version:number}|null;lostKey:string|null;retryKey:string|null}={value:null,lostKey:null,retryKey:null};
  await page.route('**/generateOperationsReport',async route=>{
   uncertain.lostKey=route.request().postDataJSON().data.idempotencyKey;
   const response=await route.fetch();expect(response.status()).toBe(200);const generated=(await response.json()).result as {id:string;version:number;scope:unknown};uncertain.value=generated;
   saved.push({id:generated.id,scope:generated.scope,ownerUid:saved[0]!.ownerUid,key:uncertain.lostKey!});
   await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{status:'UNAVAILABLE',message:'Demo response lost after durable creation'}})});
  });
  await page.getByRole('button',{name:'Tạo phiên bản mới',exact:true}).click();
  await expect(page.getByTestId('operations-reports').getByRole('alert')).toContainText('Chưa xác nhận được báo cáo. Thử lại để kiểm tra cùng yêu cầu.');
  await page.unroute('**/generateOperationsReport');
  page.on('request',request=>{if(request.url().endsWith('/generateOperationsReport'))uncertain.retryKey=request.postDataJSON().data.idempotencyKey;});
  const second=await createVersion('Thử lại');expect(second.id).not.toBe(first.id);expect(second.version).toBe(first.version+1);
  expect(second.id).toBe(uncertain.value?.id);expect(uncertain.retryKey).toBe(uncertain.lostKey);
  await expect(view.locator('.metrics strong')).toHaveText(['—','—','—']);
  await view.getByText('Các khoảng nguồn · 2',{exact:true}).click();await expect(view.locator('tbody')).toContainText(secondId.slice(0,12));
  const updated=await downloadVersion();expect(updated.id).toBe(second.id);expect(updated.csv).not.toBe(original.csv);expect(updated.csv).toContain(`"${secondId}"`);expect(updated.csv).toContain('"60"');
  await page.getByRole('button',{name:`Xem · Phiên bản ${first.version} · ${first.id.slice(0,12)}`,exact:true}).click();await expect(view.getByRole('heading',{name:`Phiên bản ${first.version}`,exact:true})).toBeVisible();
  expect((await downloadVersion()).csv).toBe(original.csv);
  // Only this transport-failure state is mocked; creation/read/export above use
  // actual demo callables and durable immutable report documents.
  await page.route('**/exportOperationsReportCsv',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{status:'UNAVAILABLE',message:'Demo report transport fixture'}})}));
  await view.getByRole('button',{name:'Tải CSV',exact:true}).click();await expect(view.getByRole('alert')).toContainText('Chưa tải được CSV. Thử lại với phiên bản đã chọn.');
  await page.unroute('**/exportOperationsReportCsv');const retried=page.waitForEvent('download');await view.getByRole('button',{name:'Thử lại',exact:true}).click();await retried;
  await expect(view.getByRole('alert')).toHaveCount(0);
  const dismiss=page.getByRole('button',{name:'Ẩn thông báo',exact:true});if(await dismiss.isVisible())await dismiss.click();
  await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>window.scrollTo(0,0));await settled(page);await page.screenshot({path:'docs/evidence/reports-version-desktop-demo.png'});
  await page.getByLabel('Ngôn ngữ').selectOption('en');await expect(page.getByRole('heading',{name:'Reports',exact:true,level:1})).toBeVisible();await expect(view.getByRole('button',{name:'Download CSV',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await settled(page);await expect.poll(()=>page.locator('.sidebar').evaluate(element=>element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>window.scrollTo(0,0));await settled(page);await page.screenshot({path:'docs/evidence/reports-version-mobile-demo.png'});
  // A matching older report exists but lies beyond the bounded recent scan.
  // Real demo persistence/reader must describe unread history, not assert absence.
  const ownerUid=saved[0]!.ownerUid,base=(await db.doc(`owners/${ownerUid}/operationReports/${first.id}`).get()).data()!,historySeedAt=Date.now();
  const batch=db.batch();
  for(let i=0;i<51;i++){
   const id=createHash('sha256').update(`report-history-recent-${now}-${i}`).digest('hex'),path=`owners/${ownerUid}/operationReports/${id}`;historicalPaths.push(path);
   batch.set(db.doc(path),{...base,id,createdAt:Timestamp.fromMillis(historySeedAt-i)});
  }
  const oldId=createHash('sha256').update(`report-history-befam-${now}`).digest('hex'),oldPath=`owners/${ownerUid}/operationReports/${oldId}`;historicalPaths.push(oldPath);
  batch.set(db.doc(oldPath),{...base,id:oldId,scope:{...base.scope,appId:'befam'},coverage:{status:'missing',truncated:false,snapshotLimit:200},sources:[{appId:'befam',name:'BeFam',status:'not_configured',watermark:null,coveredMs:0,measurementCoveredMs:0,requestedMs:base.sources[0].requestedMs,totals:{requestCount:null,serverErrorCount:null,errorRate:null},intervals:[],excludedOverlaps:0,excludedAlignment:0}],createdAt:Timestamp.fromMillis(historySeedAt-10000)});
  await batch.commit();expect((await db.doc(oldPath).get()).exists).toBe(true);
  await page.getByRole('combobox',{name:'Applications',exact:true}).selectOption('befam');
  const reports=page.getByTestId('operations-reports');
  await expect(reports).toContainText('Only the most recent versions are shown.');
  await expect(reports).toContainText('No reports in the loaded history for this scope.');
  await expect(reports.getByText('No reports for this scope yet.',{exact:true})).toHaveCount(0);
  await page.evaluate(()=>window.scrollTo(0,0));await settled(page);await page.screenshot({path:'docs/evidence/reports-history-bounded-empty-demo.png'});
 }finally{
  const ownedPaths=new Set(saved.flatMap(value=>[
   `owners/${value.ownerUid}/operationReports/${value.id}`,
   `owners/${value.ownerUid}/operationReportScopes/${createHash('sha256').update(JSON.stringify(value.scope)).digest('hex')}`,
   `idempotencyRecords/${createHash('sha256').update(`${value.ownerUid}:reports.generate:${value.key}`).digest('hex')}`,
  ]));
  const cleanup=db.batch();for(const path of new Set([`operationsSnapshots/${firstId}`,`operationsSnapshots/${secondId}`,...ownedPaths,...historicalPaths]))cleanup.delete(db.doc(path));await cleanup.commit();
  if(priorCheckpoint.exists)await checkpoint.set(priorCheckpoint.data()!);else await checkpoint.delete();
  await deleteApp(admin);
 }
});

import { test, expect, type Page } from '@playwright/test';
// Auth emulator's optional Material CDN can block its own event handlers when offline.
// Skip only emulator cosmetic assets; no app/API/Auth response is mocked.
test.beforeEach(async ({context}) => {
  await context.route('https://unpkg.com/material-components-web@10/**', route => route.fulfill({body:'',contentType:route.request().url().endsWith('.css')?'text/css':'application/javascript'}));
  await context.route('https://fonts.googleapis.com/**', route => route.fulfill({body:'',contentType:'text/css'}));
});
async function login(page:Page,email='hunpeo97@gmail.com') {
  await page.goto('/');
  const popupPromise=page.waitForEvent('popup');
  await page.getByRole('button',{name:'Đăng nhập bằng Google'}).click();
  const popup=await popupPromise;
  await popup.waitForFunction(() => typeof (window as unknown as {toggleForm?:unknown}).toggleForm === 'function');
  await popup.getByRole('button',{name:'Add new account'}).click();
  await popup.locator('#email-input').fill(email);
  await popup.getByRole('button',{name:/Sign in/i}).click();
  await expect(page.getByRole('heading',{name:/^(Tổng quan|Overview)$/})).toBeVisible();
}
test('real emulator auth, registry, filters, navigation, layout and logout',async({page})=>{
  await login(page);
  await expect(page.getByText('EMULATOR — danh tính kiểm thử, không phải phiên production')).toBeVisible();
  for(const app of ['HunpeoLabs','SatsunicSEO','SatsunicCode','SatsunicPlan','BeFam','SatsunicGo','SatsunicMec']) await expect(page.getByRole('heading',{name:app,exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:'Ứng dụng',exact:true}).selectOption('satsuniccode');
  await expect(page).toHaveURL(/app=satsuniccode/);
  await expect(page.getByRole('heading',{name:'HunpeoLabs',exact:true})).toHaveCount(0);
  await page.getByLabel('Múi giờ').selectOption('Asia/Ho_Chi_Minh');
  await page.getByRole('link',{name:'Tích hợp',exact:true}).click();
  await expect(page).toHaveURL(/integrations.*timezone=Asia/);
  await page.goBack(); await expect(page).toHaveURL(/timezone=Asia/);
  await page.getByLabel('Ngôn ngữ').selectOption('en');
  await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
  await page.getByLabel('Switch light/dark theme').click();
  await expect(page.locator('.workspace')).toHaveClass(/dark/);
  await page.getByRole('combobox',{name:'Applications',exact:true}).selectOption('all');
  const pilot=page.locator('.app-row').filter({has:page.getByRole('heading',{name:'HunpeoLabs',exact:true})});
  const responsePromise=page.waitForResponse(response=>response.url().endsWith('/checkConnection'));
  await pilot.getByRole('button',{name:'Test connection',exact:true}).click();
  const response=await responsePromise;
  expect(response.status(),await response.text()).toBe(200);
  await expect(page.locator('.blog-toast')).toContainText('Check results saved.',{timeout:15000});
  await page.locator('.blog-toast').hover();
  await expect(page.locator('.blog-toast')).toHaveAttribute('data-paused','true');
  await page.getByRole('button',{name:'Dismiss notification'}).focus();
  await page.mouse.move(0,0);
  await expect(page.locator('.blog-toast')).toHaveAttribute('data-paused','true');
  await page.getByRole('button',{name:'Dismiss notification'}).click();
  await expect(page.locator('.blog-toast')).toHaveCount(0);
  await expect(pilot.getByText('Partial check',{exact:true})).toBeVisible({timeout:15000});
  await expect(pilot.getByText('Checks passed · HTTP 200',{exact:true})).toBeVisible();
  await expect(pilot.getByText('Check failed · HTTP 404',{exact:true})).toBeVisible();
  await page.locator('main').evaluate(el=>el.scrollIntoView());
  const sidebar=await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).position);
  const topbar=await page.locator('.topbar').evaluate(el=>getComputedStyle(el).position);
  expect(sidebar).toBe('fixed'); expect(topbar).toBe('fixed');
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  const finalRow=await page.locator('.app-row').last().boundingBox();
  const composer=await page.getByRole('complementary',{name:'Ask SatsunicManager',exact:true}).boundingBox();
  expect(finalRow!.y+finalRow!.height).toBeLessThan(composer!.y);
  await page.getByLabel('Switch light/dark theme').click();
  await page.locator('#main').focus(); await page.evaluate(()=>window.scrollTo(0,0));
  const inset=await page.getByRole('complementary',{name:'Ask SatsunicManager',exact:true}).locator('form').evaluate(el=>innerHeight-el.getBoundingClientRect().bottom);expect(inset).toBeCloseTo(20,0);await page.screenshot({path:'docs/evidence/shell-desktop.png'});
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.locator('.registry').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.getByLabel('Sign out',{exact:true}).click();
  await expect(page.getByRole('button',{name:'Sign in with Google'})).toBeVisible();
  await expect(page.locator('.app-row')).toHaveCount(0);
});
test('owner settings persist through a new authenticated session',async({page})=>{
 await login(page,'phamhung.pitit@gmail.com');
 await page.getByRole('link',{name:'Cài đặt',exact:true}).click();
 const form=page.locator('form').filter({has:page.getByRole('button',{name:'Lưu thiết lập',exact:true})});
 await form.getByRole('combobox',{name:'Ngôn ngữ',exact:true}).selectOption('en');
 await form.getByRole('combobox',{name:'Giao diện',exact:true}).selectOption('dark');
 await form.getByRole('combobox',{name:'Múi giờ mặc định',exact:true}).selectOption('Asia/Ho_Chi_Minh');
 const saved=page.waitForResponse(response=>response.url().endsWith('/saveOwnerPreferences'));
 await form.getByRole('button',{name:'Lưu thiết lập',exact:true}).click();expect((await saved).status()).toBe(200);
 await expect(page.locator('.workspace')).toHaveClass(/dark/);
 await expect(page.getByRole('heading',{name:'Settings & Audit',exact:true})).toBeVisible();
 await expect(page.getByLabel('Timezone',{exact:true})).toHaveValue('Asia/Ho_Chi_Minh');
 await page.reload();await login(page,'phamhung.pitit@gmail.com');
 await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 await expect(page.locator('.workspace')).toHaveClass(/dark/);
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.getByRole('link',{name:'Settings & Audit',exact:true}).click();
 const restored=page.locator('form').filter({has:page.getByRole('button',{name:'Save preferences',exact:true})});
 await expect(restored.getByRole('combobox',{name:'Default timezone',exact:true})).toHaveValue('Asia/Ho_Chi_Minh');
 await expect.poll(()=>restored.evaluate(element=>getComputedStyle(element).opacity)).toBe('1');
 await page.screenshot({path:'docs/evidence/settings-persisted-demo.png'});
 await restored.getByRole('combobox',{name:'Language',exact:true}).selectOption('vi');
 await restored.getByRole('combobox',{name:'Appearance',exact:true}).selectOption('light');
 await restored.getByRole('combobox',{name:'Default timezone',exact:true}).selectOption('America/Chicago');
 await restored.getByRole('button',{name:'Save preferences',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Cài đặt',exact:true})).toBeVisible();
});
test('mobile shell has no horizontal overflow and drawer works',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await login(page,'phamhung.pitit@gmail.com');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Mở điều hướng',exact:true}).click();
  await page.getByRole('link',{name:'Ứng dụng',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Ứng dụng',exact:true,level:1})).toBeVisible();
  await expect(page.locator('.scrim')).toHaveCount(0);
  await expect.poll(()=>page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await expect(page.locator('.product-footer')).toContainText('Product by HunpeoLabs');
  await page.screenshot({path:'docs/evidence/shell-mobile-bottom.png'});
  await page.locator('#main').focus(); await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'docs/evidence/shell-mobile.png'});
});
test('outsider sees no private data',async({page})=>{
  await page.goto('/'); const popupPromise=page.waitForEvent('popup');
  await page.getByRole('button',{name:'Đăng nhập bằng Google'}).click(); const popup=await popupPromise;
  await popup.waitForFunction(() => typeof (window as unknown as {toggleForm?:unknown}).toggleForm === 'function');
  await popup.getByRole('button',{name:'Add new account'}).click(); await popup.locator('#email-input').fill('outsider@example.test'); await popup.getByRole('button',{name:/Sign in/i}).click();
  await expect(page.getByRole('alert')).toBeVisible(); await expect(page.locator('.app-row')).toHaveCount(0);
});

test('composer keeps questions local and restores keyboard focus',async({page})=>{
 await login(page);
 await page.emulateMedia({reducedMotion:'reduce'});
 const sent:string[]=[];
 page.on('request',request=>{if(request.method()==='POST')sent.push(request.url());});
 const idle=page.getByRole('complementary',{name:'Hỏi SatsunicManager',exact:true});
 const input=idle.getByRole('textbox',{name:'Hỏi SatsunicManager',exact:true});
 await input.fill('Tình trạng hệ thống hôm nay?');
 await input.press('Enter');
 const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('status')).toHaveText('Chưa kết nối AI. Câu hỏi chưa được gửi.');
 await expect(dialog.getByRole('textbox')).toBeFocused();await page.screenshot({path:'docs/evidence/composer-dialog-demo.png'});
 await page.keyboard.press('Escape');
 await expect(dialog).not.toBeVisible();
 await expect(input).toBeFocused();
 await idle.getByRole('button',{name:'Ẩn khung hỏi',exact:true}).click();
 const launcher=page.getByRole('button',{name:'Hỏi SatsunicManager',exact:true});
 await expect(launcher).toBeFocused();await page.screenshot({path:'docs/evidence/composer-hidden-demo.png'});
 await launcher.click();
 await expect(dialog).toBeVisible();
 await expect(dialog.getByText('Tình trạng hệ thống hôm nay?',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Đóng hội thoại',exact:true}).click();
 await expect(input).toBeFocused();
 expect(sent.filter(url=>!/listApps|bootstrapOwner/.test(url))).toEqual([]);
});

test('incident source signal and workflow stay separate, inbox read persists',async({page})=>{
 const {initializeApp,deleteApp}=await import('firebase-admin/app');
 const {getFirestore}=await import('firebase-admin/firestore');
 if(process.env.FIRESTORE_EMULATOR_HOST&&process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:28080')throw Error('Dedicated emulator only');
 process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:28080';
 const app=initializeApp({projectId:'demo-satsunicmanager'},'browser-incident-fixture');const db=getFirestore(app);
 const {createHash}=await import('node:crypto');const id=createHash('sha256').update(`browser-${Date.now()}`).digest('hex');const now=new Date().toISOString();
 try{
 await db.doc(`incidents/${id}`).set({id,appId:'hunpeolabs',environment:'production',sourceId:'browser-fixture',sourceVersion:1,sourceState:'firing',workflow:'open',severity:'P2',title:'EMULATOR BROWSER INCIDENT',occurredAt:now,updatedAt:now,revision:1,evidence:[]});
 await db.doc(`notifications/${id}`).set({id,incidentId:id,appId:'hunpeolabs',environment:'production',severity:'P2',title:'EMULATOR BROWSER INCIDENT',occurredAt:now});
 await login(page);await page.getByRole('link',{name:'Sự cố',exact:true}).click();
 const row=page.locator('.incident-row').filter({has:page.getByRole('heading',{name:'EMULATOR BROWSER INCIDENT',exact:true})});
 await expect(row).toContainText('Đang lỗi');await row.getByRole('button',{name:'Xử lý',exact:true}).click();await page.getByLabel('Ghi chú',{exact:true}).fill('EMULATOR acknowledgement');await page.getByRole('button',{name:'Lưu xử lý',exact:true}).click();await expect(row).toContainText('Đã nhận');await expect(row).toContainText('Đang lỗi');
 await page.getByRole('link',{name:'Thông báo',exact:true}).first().click();const notification=page.locator('.incident-row').filter({has:page.getByRole('heading',{name:'EMULATOR BROWSER INCIDENT',exact:true})});await notification.getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).click();await expect(notification.getByRole('button',{name:'Đã đọc',exact:true})).toBeDisabled();
 await page.reload();await expect(page.getByRole('button',{name:'Đăng nhập bằng Google',exact:true})).toBeVisible();await login(page);await page.getByRole('link',{name:'Thông báo',exact:true}).first().click();await expect(notification.getByRole('button',{name:'Đã đọc',exact:true})).toBeDisabled();await page.screenshot({path:'docs/evidence/inbox-workflow.png'});
 }finally{await db.doc(`incidents/${id}`).delete();await db.doc(`notifications/${id}`).delete();await deleteApp(app);}
});

test('operations and finance show missing official sources without manual entry',async({page})=>{
 await login(page);await page.getByRole('link',{name:'Vận hành',exact:true}).click();await expect(page.getByRole('heading',{name:'Vận hành',exact:true,level:1})).toBeVisible();const responsePromise=page.waitForResponse(response=>response.url().endsWith('/getOperations')&&response.request().postDataJSON()?.data?.scope?.appId==='befam',{timeout:30000});await page.getByRole('combobox',{name:'Ứng dụng',exact:true}).selectOption('befam');await expect(page).toHaveURL(/\/operations\?app=befam/);const response=await responsePromise;expect(response.status(),await response.text()).toBe(200);const manualCard=page.locator('.operation-section').filter({has:page.getByRole('heading',{name:'BeFam',exact:true,level:2})});await expect(manualCard).toHaveCount(1);await expect(manualCard).toContainText('Chưa kết nối',{timeout:15000});
 await page.getByRole('link',{name:'Tài chính',exact:true}).click();await expect(page.getByRole('heading',{name:'Chưa kết nối nguồn tài chính',exact:true})).toBeVisible();await expect(page.getByRole('textbox',{name:'CSV',exact:true})).toHaveCount(0);await page.screenshot({path:'docs/evidence/finance-unconfigured.png'});
});

// Actual callable and Firestore persistence; only the dedicated demo is allowed.
test('owner adds an app, sees it after refresh, and its source remains unverified',async({page})=>{
 const {initializeApp,deleteApp}=await import('firebase-admin/app');
 const {getFirestore}=await import('firebase-admin/firestore');
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:28080'||process.env.GCLOUD_PROJECT!=='demo-satsunicmanager')throw Error('Dedicated emulator only');
 const app=initializeApp({projectId:'demo-satsunicmanager'},'browser-app-fixture');const db=getFirestore(app);
 const name=`Emulator app ${Date.now()}`,id=name.toLowerCase().replaceAll(' ','-');
 try{
  await login(page);await page.getByRole('link',{name:'Ứng dụng',exact:true}).click();
  await page.getByRole('button',{name:'Thêm ứng dụng',exact:true}).click();
  await page.getByLabel('Tên ứng dụng',{exact:true}).fill(name);
  await page.getByLabel('Dự án Google Cloud (nếu có)',{exact:true}).fill('unverified-project');
  const responsePromise=page.waitForResponse(response=>response.url().endsWith('/addApp'));
  await page.getByRole('button',{name:'Thêm',exact:true}).click();
  const response=await responsePromise;expect(response.status(),await response.text()).toBe(200);
  await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  expect((await db.doc(`appDefinitions/${id}`).get()).get('mappingVerified')).toBe(false);
  await page.getByRole('combobox',{name:'Ứng dụng',exact:true}).selectOption(id);
  await page.getByRole('button',{name:'Làm mới',exact:true}).click();
  await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  const row=page.locator('.app-row').filter({has:page.getByRole('heading',{name,exact:true})});
  await expect(row.getByRole('button',{name:'Kiểm tra kết nối',exact:true})).toBeDisabled();
 }finally{await db.doc(`appDefinitions/${id}`).delete();await deleteApp(app);}
});

test('composer IME, backdrop pairing and mobile capsule remain usable',async({page})=>{
 await login(page);await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'reduce'});
 const idle=page.getByRole('complementary',{name:'Hỏi SatsunicManager',exact:true});
 const input=idle.getByRole('textbox');
 await input.fill('Câu hỏi thử nghiệm');
 await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,bubbles:true,cancelable:true});
 const dialog=page.getByRole('dialog');await expect(dialog).not.toBeVisible();
 await input.press('Enter');await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('textbox')).toBeFocused();
 await page.screenshot({path:'docs/evidence/composer-mobile-dialog-demo.png'});
 const box=await dialog.boundingBox();
 expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.width).toBeLessThanOrEqual(390);
 // A drag starting inside the panel and ending on backdrop must not collapse.
 await page.mouse.move(box!.x+30,box!.y+30);await page.mouse.down();
 await page.mouse.move(1,1);await page.mouse.up();await expect(dialog).toBeVisible();
 await page.mouse.click(1,1);await expect(dialog).not.toBeVisible();
 await expect(input).toBeFocused();
 expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('automatic history keeps partial attempts separate from older successful metrics',async({page})=>{
 const {initializeApp,deleteApp}=await import('firebase-admin/app');
 const {getFirestore,Timestamp}=await import('firebase-admin/firestore');
 const {createHash}=await import('node:crypto');
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:28080'||process.env.GCLOUD_PROJECT!=='demo-satsunicmanager')throw Error('Dedicated emulator only');
 const app=initializeApp({projectId:'demo-satsunicmanager'},'browser-monitoring-fixture');const db=getFirestore(app);
 const job='operations_metrics_v1_satsunicplan',now=Date.now();
 const successId=createHash('sha256').update(`browser-monitor-success-${now}`).digest('hex');
 const failedId=createHash('sha256').update(`browser-monitor-partial-${now}`).digest('hex');
 const olderIds=Array.from({length:5},(_,i)=>createHash('sha256').update(`browser-monitor-older-${now}-${i}`).digest('hex'));
 const statusRef=db.doc(`connectorStatuses/${job}`),checkpointRef=db.doc(`connectorCheckpoints/${job}`);
 const priorStatus=await statusRef.get(),priorCheckpoint=await checkpointRef.get();
 const end=new Date(now-2*3600000).toISOString(),failedEnd=new Date(now-3600000).toISOString();
 const makeReport=(id:string,to:string,partial:boolean)=>({id,scope:{appId:'satsunicplan',environment:'production',timezone:'America/Chicago',from:new Date(Date.parse(to)-3600000).toISOString(),to},status:partial?'failed':'complete',fixture:true,queryVersion:'collector-v1',createdAt:Timestamp.fromDate(new Date(to)),data:[{appId:'satsunicplan',projectId:'satsunicplan',services:['emulator-service'],metrics:{status:partial?'partial':'available',requestCount:partial?null:321,serverErrorCount:partial?null:3,errorRate:partial?null:3/321,points:[],reason:partial?'incomplete_or_invalid_series':null},provenance:{provider:'Google Cloud',resourceRef:'projects/satsunicplan',queryVersion:'operations-v1',metricDefinitionVersion:'cloud-run-requests-v1'},freshness:{fetchedAt:to,observedThrough:partial?null:to}}]});
 try{
  await db.doc(`operationsCollectionRuns/${successId}`).set(makeReport(successId,end,false));
  await db.doc(`operationsSnapshots/${successId}`).set({...makeReport(successId,end,false),queriedThrough:end});
  await db.doc(`operationsCollectionRuns/${failedId}`).set(makeReport(failedId,failedEnd,true));
  await Promise.all(olderIds.map((id,i)=>{const to=new Date(Date.parse(end)-(i+1)*900000).toISOString();return db.doc(`operationsSnapshots/${id}`).set({...makeReport(id,to,false),queriedThrough:to});}));
  await statusRef.set({status:'failed',runId:failedId,lastSuccessfulSnapshotId:successId,attemptedThrough:failedEnd});
  await checkpointRef.set({cursor:end});
  await login(page);await page.getByRole('link',{name:'Vận hành',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Vận hành',exact:true,level:1})).toBeVisible();
  await page.getByRole('combobox',{name:'Ứng dụng',exact:true}).selectOption('satsunicplan');
  const history=page.getByTestId('monitoring-history');
  await expect(history.getByRole('heading',{name:'Lịch sử theo dõi tự động',exact:true})).toBeVisible();
  await expect(page.getByText('EMULATOR — danh tính kiểm thử, không phải phiên production',{exact:true})).toBeVisible();
  await expect(history.getByText('Dữ liệu kiểm thử trên emulator.',{exact:true})).toHaveCount(0);
  await expect(history).toContainText('Một phần lịch sử chưa được tải.');
  await expect(history).toContainText('Dữ liệu thành công gần nhất đã hơn 30 phút.');
  const latest=history.locator('details').filter({has:page.getByText('Lần thử gần nhất',{exact:true})});
  await expect(latest).toContainText('Dữ liệu chưa đầy đủ');
  await expect(latest.locator('.metrics strong')).toHaveText(['—','—','—']);
  await expect(latest).toContainText('projects/satsunicplan');
  await expect(latest.getByText('Lần thử này ngoài khoảng đang chọn.',{exact:true})).toHaveCount(0);
  const successful=history.locator('details').filter({has:page.getByText('Các lần thành công · 5',{exact:true})});
  await successful.locator('summary').click();
  await expect(successful.getByText('Lịch sử gần đây trong khoảng đã chọn; chưa phải toàn bộ lịch sử.',{exact:true})).toBeVisible();
  await expect(successful.locator('.metrics')).toHaveCount(5);
  await expect(successful.locator('.metrics').first().locator('strong')).toHaveText(['321','3',new Intl.NumberFormat('vi',{style:'percent',maximumFractionDigits:2}).format(3/321)]);
  await page.setViewportSize({width:1280,height:960});
  await page.evaluate(()=>window.scrollTo(0,0));
  const workspace=page.locator('.workspace');
  const settleWorkspace=async()=>{await workspace.evaluate(async element=>{
   await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
   await Promise.all(element.getAnimations({subtree:true}).filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));
  });await expect.poll(()=>workspace.evaluate(element=>getComputedStyle(element).opacity==='1'&&Array.from(element.querySelectorAll('.registry')).every(section=>getComputedStyle(section).opacity==='1'))).toBe(true);};
  await settleWorkspace();
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
  await page.screenshot({path:'docs/evidence/monitoring-history-desktop-demo.png'});
  // Reader and durable fixtures are real demo paths; an explicit transport fixture
  // then exercises recoverable error presentation without inventing zero totals.
  await page.route('**/listMonitoringSnapshots',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{status:'UNAVAILABLE',message:'Emulator transport fixture'}})}));
  await page.getByRole('button',{name:'Làm mới',exact:true}).click();
  await expect(history.getByRole('alert')).toContainText('Chưa tải được lịch sử theo dõi.');
  await expect(history.getByRole('button',{name:'Thử lại',exact:true})).toBeVisible();
  await page.unroute('**/listMonitoringSnapshots');await history.getByRole('button',{name:'Thử lại',exact:true}).click();
  await expect(history.getByRole('alert')).toHaveCount(0);
  await expect(history).toContainText('Dữ liệu chưa đầy đủ');
  await page.getByRole('combobox',{name:'Ứng dụng',exact:true}).selectOption('befam');
  await expect(history).toContainText('Chưa kết nối');
  await expect(history.getByText('Chưa có lần theo dõi.',{exact:true})).toHaveCount(1);
  await expect(history.getByText('Chưa có lần thành công trong phần lịch sử được tải của khoảng này.',{exact:true})).toHaveCount(0);
  await expect(history).not.toContainText('Lần thử: Chưa có');
  await expect(history).not.toContainText('Lần thành công: Chưa có');
  await expect(history.locator('.metrics strong')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});
  const closeNavigation=page.getByRole('button',{name:'Đóng điều hướng',exact:true});
  if(await closeNavigation.isVisible())await closeNavigation.click();
  await page.evaluate(()=>window.scrollTo(0,0));
  await settleWorkspace();
  await expect.poll(()=>page.locator('.sidebar').evaluate(element=>element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await expect.poll(()=>page.locator('.sidebar').evaluate(element=>element.getBoundingClientRect().width)).toBe(240);
  await expect.poll(()=>page.evaluate(()=>innerWidth)).toBe(390);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'docs/evidence/monitoring-history-empty-mobile-demo.png'});
 }finally{
  await Promise.all([db.doc(`operationsCollectionRuns/${successId}`).delete(),db.doc(`operationsSnapshots/${successId}`).delete(),db.doc(`operationsCollectionRuns/${failedId}`).delete(),...olderIds.map(id=>db.doc(`operationsSnapshots/${id}`).delete())]);
  if(priorStatus.exists)await statusRef.set(priorStatus.data()!);else await statusRef.delete();
  if(priorCheckpoint.exists)await checkpointRef.set(priorCheckpoint.data()!);else await checkpointRef.delete();
  await deleteApp(app);
 }
});

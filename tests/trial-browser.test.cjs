const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
let browser,server,origin;
before(async()=>{server=http.createServer(async(req,res)=>{const p=path.resolve(__dirname,'..','.'+req.url.split('?')[0]+(req.url.split('?')[0].endsWith('/')?'index.html':''));try{const b=await fs.readFile(p);res.setHeader('content-type',p.endsWith('.mjs')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(b);}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.CHROME_PATH});});
after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});
const rid='11111111-aaaa-4111-8111-111111111111';
test('cancel before login clears trial continuation without sending or approving anything',async()=>{
 const {page,actions,errors}=await setup(390,true);page.setDefaultTimeout(2000);
 await page.goto(origin+'/account/#trial_request='+rid);
 await page.locator('#trial-cancel').click();
 await page.locator('#notice').getByText(/承認を中止/).waitFor();
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('zasu.trial.request.v1')),null);
 await page.reload();await page.locator('#auth').waitFor({state:'visible'});
 assert.ok(!actions.some(x=>['request','inspect','approve','exchange'].includes(x.action)));
 assert.deepEqual(errors,[]);await page.close();
});
test('cancel while inspect is pending prevents a late approval panel and survives reload',async()=>{
 const {page,actions,errors}=await setup(390,true);page.setDefaultTimeout(2000);let held;
 const waiting=new Promise(resolve=>held=resolve);let response;
 await page.route('https://siwmzradvrtetotakkbi.supabase.co/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fallback();const b=route.request().postDataJSON();
  if(b.action!=='inspect')return route.fallback();response=route;held();
 });
 await page.addInitScript(()=>sessionStorage.setItem('zasu.account.session.v1',JSON.stringify({access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600})));
 await page.goto(origin+'/account/#trial_request='+rid);await waiting;
 await page.locator('#trial-cancel').click();
 await response.fulfill({status:200,headers:{'access-control-allow-origin':origin,'content-type':'application/json'},body:JSON.stringify({name:'ZASU VOCAL',released:true,purchased:false})});
 assert.equal(await page.locator('#trial-approve').isVisible(),false);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('zasu.trial.request.v1')),null);
 assert.ok(!actions.some(x=>x.action==='approve'));assert.deepEqual(errors,[]);await page.close();
});
async function setup(width=390,privatePreview=false,context=null){const page=context?await context.newPage():await browser.newPage({viewport:{width,height:844}});const actions=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://siwmzradvrtetotakkbi.supabase.co/**',async route=>{if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'authorization, content-type','access-control-allow-methods':'POST, OPTIONS'}});const b=route.request().postDataJSON();actions.push(b);const trial=route.request().url().endsWith('zasu-trial');let result={ok:true};if(b.action==='me')result={user:{id:rid,email:'test@example.invalid'},profile:{display_name:'Trial user',locale:'ja',created_at:'2026-10-15T00:00:00Z'},purchasesIntegrated:false};if(trial&&b.action==='inspect')result={name:'ZASU VOCAL',product:'vocal',released:!privatePreview,validationAllowed:privatePreview,purchased:false};if(trial&&b.action==='catalog')result={products:[{product_key:'vocal',name:'ZASU VOCAL',released:false}]};if(trial&&b.action==='list')result={serverTime:'2026-10-15T00:00:00Z',trials:[{name:'ZASU VOCAL',product:'vocal',state:'active',startedAt:'2026-10-15T00:00:00Z',expiresAt:'2026-10-22T00:00:00Z',released:false}]};await route.fulfill({status:200,headers:{'access-control-allow-origin':origin,'content-type':'application/json'},body:JSON.stringify(result)});});return {page,actions,errors};}
test('account approval is explicit and trial management uses server time',async()=>{const {page,actions,errors}=await setup(320);await page.addInitScript(()=>sessionStorage.setItem('zasu.account.session.v1',JSON.stringify({access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600})));await page.goto(origin+'/account/#trial_request='+rid);await page.locator('#trial-approval').waitFor({state:'visible'});assert.ok(!actions.some(x=>x.action==='approve'||x.action==='exchange'));assert.ok(!page.url().includes(rid));await page.locator('#trial-approve').click();await page.locator('#trial-approve').waitFor({state:'hidden'});assert.equal(actions.filter(x=>x.action==='approve').length,1);await page.locator('[data-view=trials]').click();await page.getByText('残り 168 時間（取得時点）').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await page.close();});
for(const width of [320,390,1440])test('trial overview hides unverified downloads at '+width,async()=>{const {page,actions,errors}=await setup(width);await page.goto(origin+'/trial/');await page.getByText('体験版は準備中です。公開後、ここから取得できます。').waitFor();assert.equal(await page.getByRole('link',{name:'Mac版ダウンロード'}).count(),0);assert.ok(!actions.some(x=>x.action==='begin'||x.action==='approve'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await page.close();});
async function loginB(page){await page.locator('#email').fill('b@example.invalid');await page.locator('#email-form button[type=submit]').click();await page.locator('#code').fill('123456');await page.locator('#code-form button[type=submit]').click();await page.locator('#dashboard').waitFor({state:'visible'});}
for(const kind of ['refresh','stale401'])test('old '+kind+' response cannot replace a newer account session',async()=>{
 const {page}=await setup();let release,held;const hold=new Promise(r=>held=r);
 await page.route('https://siwmzradvrtetotakkbi.supabase.co/**',async route=>{
  const req=route.request();if(req.method()==='OPTIONS')return route.fallback();const b=req.postDataJSON();let data;
  if((kind==='refresh'&&req.url().includes('/auth/v1/token'))||(kind==='stale401'&&b.action==='me'&&req.headers().authorization==='Bearer token-A')){release=route;held();return;}
  if(b.action==='request')data={challengeId:rid};else if(b.action==='verify')data={session:{access_token:'token-B',refresh_token:'refresh-B',expires_at:Date.now()/1000+3600}};else return route.fallback();
  await route.fulfill({status:200,headers:{'access-control-allow-origin':origin,'content-type':'application/json'},body:JSON.stringify(data)});
 });
 await page.addInitScript(kind=>sessionStorage.setItem('zasu.account.session.v1',JSON.stringify({access_token:'token-A',refresh_token:'refresh-A',expires_at:kind==='refresh'?1:Date.now()/1000+3600})),kind);
 await page.goto(origin+'/account/');await hold;
 await page.evaluate(()=>{const c=new BroadcastChannel('zasu-account');c.postMessage('global-logout');c.close();});await page.locator('#auth').waitFor({state:'visible'});await loginB(page);
 await release.fulfill({status:kind==='refresh'?200:401,headers:{'access-control-allow-origin':origin,'content-type':'application/json'},body:JSON.stringify(kind==='refresh'?{access_token:'token-A-new',refresh_token:'refresh-A-new',expires_at:Date.now()/1000+3600}:{error:'authentication_required'})});
 await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('zasu.account.session.v1')).access_token),'token-B');assert.equal(await page.locator('#dashboard').isVisible(),true);await page.close();
});

test('unpublished private validation requires explicit approval and never sends an exchange from browser',async()=>{const {page,actions,errors}=await setup(390,true);await page.addInitScript(()=>sessionStorage.setItem('zasu.account.session.v1',JSON.stringify({access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600})));await page.goto(origin+'/account/#trial_request='+rid);await page.locator('#trial-approve').waitFor({state:'visible'});assert.ok(!actions.some(x=>x.action==='approve'));await page.locator('#trial-approve').click();await page.locator('#trial-approve').waitFor({state:'hidden'});assert.ok(actions.some(x=>x.action==='approve'));assert.ok(!actions.some(x=>x.action==='exchange'));assert.deepEqual(errors,[]);await page.close();});

test('JUCE escaped fragment survives email login and shows private trial approval',async()=>{
 const {page,actions,errors}=await setup(390,true);
 await page.route('https://siwmzradvrtetotakkbi.supabase.co/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fallback();
  const b=route.request().postDataJSON();let result;
  if(b.action==='request')result={challengeId:rid};
  else if(b.action==='verify')result={session:{access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600}};
  else return route.fallback();
  await route.fulfill({status:200,headers:{'access-control-allow-origin':origin,'content-type':'application/json'},body:JSON.stringify(result)});
 });
 await page.goto(origin+'/account/#trial_request%3D'+rid);
 await loginB(page);
 await page.locator('#trial-approve').waitFor({state:'visible',timeout:3000});
 assert.ok(actions.some(x=>x.action==='inspect'&&x.requestId===rid));
 assert.ok(!actions.some(x=>x.action==='approve'||x.action==='exchange'));
 assert.deepEqual(errors,[]);await page.close();
});

async function loginRoutes(page,actions,delayResend=false){
 await page.route('https://siwmzradvrtetotakkbi.supabase.co/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fallback();const b=route.request().postDataJSON();let result;
  if(b.action==='request'){actions.push(b);if(delayResend&&actions.filter(x=>x.action==='request').length>1)await new Promise(resolve=>setTimeout(resolve,150));if(b.purpose==='signup'&&b.consent!==true)return route.fulfill({status:400,headers:{'access-control-allow-origin':origin,'content-type':'application/json'},body:JSON.stringify({error:'consent_required'})});result={challengeId:rid,expiresIn:600,resendAfter:60};}
  else if(b.action==='verify'){actions.push(b);result={session:{access_token:'ONLY_THIS_TAB_ACCESS',refresh_token:'ONLY_THIS_TAB_REFRESH',expires_at:Date.now()/1000+3600}};}
  else return route.fallback();
  await route.fulfill({status:200,headers:{'access-control-allow-origin':origin,'content-type':'application/json'},body:JSON.stringify(result)});
 });
}
for(const signup of [false,true])test('trial request survives reload then '+(signup?'new signup':'new-tab login')+' without URL copying',async()=>{
 const {page,actions,errors}=await setup(320,true);page.setDefaultTimeout(2500);await loginRoutes(page,actions);
 await page.goto(origin+'/account/#trial_request%3D'+rid);await page.reload();
 if(signup){await page.locator('#signup-tab').click();await page.locator('#consent').check();}
 await loginB(page);await page.locator('#trial-approve').waitFor({state:'visible'});
 assert.ok(actions.some(x=>x.action==='inspect'&&x.requestId===rid));assert.equal(actions.filter(x=>x.action==='request').length,1);
 if(signup)assert.equal(actions.find(x=>x.action==='request').consent,true);
 assert.ok(!actions.some(x=>x.action==='approve'||x.action==='exchange'));
 const box=await page.locator('#trial-approve').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=844,'approval must be brought into view');
 await page.locator('#trial-approve').click();await page.locator('#trial-approve').waitFor({state:'hidden'});assert.equal(actions.filter(x=>x.action==='approve').length,1);assert.deepEqual(errors,[]);await page.close();
});
test('reload during OTP entry preserves challenge and cooldown without resending a code',async()=>{
 const {page,actions,errors}=await setup(390,true);page.setDefaultTimeout(2500);await loginRoutes(page,actions);
 await page.goto(origin+'/account/#trial_request='+rid);await page.locator('#email').fill('new@example.invalid');await page.locator('#email-form button[type=submit]').click();await page.locator('#code-form').waitFor({state:'visible'});
 await page.locator('#code').fill('123456');await page.reload();await page.locator('#code-form').waitFor({state:'visible'});
 assert.equal(await page.locator('#code').inputValue(),'','OTP itself must not be persisted');assert.equal(await page.locator('#resend').isDisabled(),true);
 await page.locator('#code').fill('123456');await page.locator('#code-form button[type=submit]').click();await page.locator('#trial-approve').waitFor({state:'visible'});
 assert.equal(actions.filter(x=>x.action==='request').length,1);assert.equal(actions.find(x=>x.action==='verify').challengeId,rid);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('zasu.account.auth-attempt.v1')),null);
 assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);await page.close();
});
test('already logged-in request survives refresh and approval is never automatic',async()=>{
 const {page,actions,errors}=await setup();page.setDefaultTimeout(2500);
 await page.addInitScript(()=>sessionStorage.setItem('zasu.account.session.v1',JSON.stringify({access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600})));
 await page.goto(origin+'/account/#trial_request='+rid);await page.locator('#trial-approve').waitFor({state:'visible'});await page.reload();await page.locator('#trial-approve').waitFor({state:'visible'});
 assert.equal(actions.filter(x=>x.action==='inspect'&&x.requestId===rid).length,2);assert.ok(!actions.some(x=>x.action==='approve'));assert.deepEqual(errors,[]);await page.close();
});
test('new tab hands only request ID to an authenticated tab without OTP or URL copying',async()=>{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 try{
  await context.addInitScript(()=>{window.handoffMessages=[];const c=new BroadcastChannel('zasu-account');c.onmessage=e=>{if(e.data&&typeof e.data==='object')window.handoffMessages.push(e.data);};});
  const existing=await setup(390,true,context);existing.page.setDefaultTimeout(3000);
  await existing.page.goto(origin+'/account/');await existing.page.evaluate(()=>sessionStorage.setItem('zasu.account.session.v1',JSON.stringify({access_token:'ONLY_EXISTING_TAB_ACCESS',refresh_token:'ONLY_EXISTING_TAB_REFRESH',expires_at:Date.now()/1000+3600})));
  await existing.page.reload();await existing.page.locator('#dashboard').waitFor({state:'visible'});
  const fresh=await setup(390,true,context);fresh.page.setDefaultTimeout(3000);await fresh.page.goto(origin+'/account/#trial_request%3D'+rid);
  await fresh.page.locator('#trial-use-tab').click();await existing.page.locator('#trial-approve').waitFor({state:'visible'});
  assert.equal(await fresh.page.evaluate(()=>sessionStorage.getItem('zasu.account.session.v1')),null);
  assert.equal(existing.actions.filter(x=>x.action==='request'||x.action==='approve').length,0);
  assert.equal(fresh.actions.filter(x=>x.action==='request'||x.action==='inspect'||x.action==='approve').length,0);
  assert.ok(existing.actions.some(x=>x.action==='inspect'&&x.requestId===rid));
  const messages=await fresh.page.evaluate(()=>JSON.stringify(window.handoffMessages));assert.ok(!messages.includes('ONLY_EXISTING_TAB')&&!messages.includes('access_token')&&!messages.includes('refresh_token'));
  await existing.page.locator('#trial-approve').click();await fresh.page.locator('#trial-auth-note').getByText(/承認しました/).waitFor();
  assert.equal(existing.actions.filter(x=>x.action==='approve').length,1);assert.equal(await fresh.page.evaluate(()=>sessionStorage.getItem('zasu.trial.request.v1')),null);
  assert.deepEqual(await fresh.page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual([...existing.errors,...fresh.errors],[]);
 }finally{await context.close();}
});
test('temporary inspect failure can retry the same request without login or OTP',async()=>{
 const {page,actions,errors}=await setup(390,true);page.setDefaultTimeout(2500);let failed=false;
 await page.route('https://siwmzradvrtetotakkbi.supabase.co/**',async route=>{if(route.request().method()==='OPTIONS')return route.fallback();const b=route.request().postDataJSON();if(b.action!=='inspect'||failed)return route.fallback();failed=true;actions.push(b);await route.fulfill({status:503,headers:{'access-control-allow-origin':origin,'content-type':'application/json'},body:'{"error":"temporarily_unavailable"}'});});
 await page.addInitScript(()=>sessionStorage.setItem('zasu.account.session.v1',JSON.stringify({access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600})));
 await page.goto(origin+'/account/#trial_request='+rid);await page.locator('#trial-inspect-retry').click();await page.locator('#trial-approve').waitFor({state:'visible'});
 assert.equal(actions.filter(x=>x.action==='inspect'&&x.requestId===rid).length,2);assert.ok(!actions.some(x=>x.action==='request'||x.action==='approve'));assert.deepEqual(errors,[]);await page.close();
});
for(const value of ['bad-request','11111111-aaaa-0111-0111-111111111111'])test('invalid incoming request is not inspected: '+value,async()=>{
 const {page,actions,errors}=await setup();await page.addInitScript(()=>sessionStorage.setItem('zasu.account.session.v1',JSON.stringify({access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600})));
 await page.goto(origin+'/account/#trial_request='+value);await page.locator('#dashboard').waitFor({state:'visible'});assert.ok(!actions.some(x=>x.action==='inspect'||x.action==='approve'));assert.deepEqual(errors,[]);await page.close();
});
test('server-expired request is cleared instead of being replayed on refresh',async()=>{
 const {page,actions,errors}=await setup();page.setDefaultTimeout(2500);
 await page.route('https://siwmzradvrtetotakkbi.supabase.co/**',async route=>{if(route.request().method()==='OPTIONS')return route.fallback();const b=route.request().postDataJSON();if(b.action!=='inspect')return route.fallback();actions.push(b);await route.fulfill({status:410,headers:{'access-control-allow-origin':origin,'content-type':'application/json'},body:'{"error":"expired_request"}'});});
 await page.addInitScript(()=>sessionStorage.setItem('zasu.account.session.v1',JSON.stringify({access_token:'test',refresh_token:'test',expires_at:Date.now()/1000+3600})));
 await page.goto(origin+'/account/#trial_request='+rid);await page.locator('#trial-approval-note').getByText(/期限切れ/).waitFor();assert.equal(await page.locator('#trial-approve').isVisible(),false);
 await page.reload();await page.locator('#dashboard').waitFor({state:'visible'});assert.equal(actions.filter(x=>x.action==='inspect').length,1);assert.equal(await page.evaluate(()=>sessionStorage.getItem('zasu.trial.request.v1')),null);assert.deepEqual(errors,[]);await page.close();
});
test('explicit logout clears pending trial and cannot approve under the next account',async()=>{
 const {page,actions,errors}=await setup();page.setDefaultTimeout(2500);await loginRoutes(page,actions);
 await page.goto(origin+'/account/');await page.evaluate(()=>sessionStorage.setItem('zasu.account.session.v1',JSON.stringify({access_token:'token-A',refresh_token:'refresh-A',expires_at:Date.now()/1000+3600})));await page.reload();await page.locator('#dashboard').waitFor({state:'visible'});
 await page.goto(origin+'/account/#trial_request='+rid);await page.locator('#trial-approve').waitFor({state:'visible'});
 await page.locator('[data-view=settings]').click();await page.locator('#logout-local').click();await loginB(page);
 assert.equal(await page.locator('#trial-approval').isVisible(),false);assert.equal(await page.evaluate(()=>sessionStorage.getItem('zasu.trial.request.v1')),null);assert.ok(!actions.some(x=>x.action==='approve'));assert.deepEqual(errors,[]);await page.close();
});
test('expired account session resumes the same trial after normal login',async()=>{
 const {page,actions,errors}=await setup();page.setDefaultTimeout(2500);await loginRoutes(page,actions);let first=true;
 await page.route('https://siwmzradvrtetotakkbi.supabase.co/**',async route=>{if(route.request().method()==='OPTIONS')return route.fallback();const b=route.request().postDataJSON();if(b.action!=='me'||!first)return route.fallback();first=false;await route.fulfill({status:401,headers:{'access-control-allow-origin':origin,'content-type':'application/json'},body:'{"error":"authentication_required"}'});});
 await page.goto(origin+'/account/');await page.evaluate(()=>sessionStorage.setItem('zasu.account.session.v1',JSON.stringify({access_token:'revoked',refresh_token:'revoked',expires_at:Date.now()/1000+3600})));
 await page.goto(origin+'/account/#trial_request='+rid);await page.reload();await page.locator('#auth').waitFor({state:'visible'});await loginB(page);await page.locator('#trial-approve').waitFor({state:'visible'});
 assert.ok(actions.some(x=>x.action==='inspect'&&x.requestId===rid));assert.ok(!actions.some(x=>x.action==='approve'));assert.deepEqual(errors,[]);await page.close();
});
test('no BroadcastChannel falls back to login in the originating tab',async()=>{
 const {page,actions,errors}=await setup();page.setDefaultTimeout(2500);await page.addInitScript(()=>{window.BroadcastChannel=undefined;});await loginRoutes(page,actions);
 await page.goto(origin+'/account/#trial_request='+rid);assert.equal(await page.locator('#trial-use-tab').isVisible(),false);await loginB(page);await page.locator('#trial-approve').waitFor({state:'visible'});assert.deepEqual(errors,[]);await page.close();
});

test('signup OTP reload preserves explicit consent for resend after cooldown',async()=>{
 const {page,actions,errors}=await setup(390,true);page.setDefaultTimeout(2500);await loginRoutes(page,actions,true);
 await page.goto(origin+'/account/#trial_request='+rid);await page.locator('#signup-tab').click();await page.locator('#consent').check();await page.locator('#email').fill('new@example.invalid');await page.locator('#email-form button[type=submit]').click();await page.locator('#code-form').waitFor({state:'visible'});
 // Isolated fixture: only the dummy OTP cooldown has elapsed; real wall clock and trial expiry stay unchanged.
 await page.evaluate(()=>{const key='zasu.account.auth-attempt.v1',saved=JSON.parse(sessionStorage.getItem(key));saved.resendAt=Date.now()-1;sessionStorage.setItem(key,JSON.stringify(saved));});
 await page.reload();await page.locator('#code-form').waitFor({state:'visible'});const priorResend=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('zasu.account.auth-attempt.v1')).resendAt);await page.locator('#resend').click();
 await page.waitForFunction(prior=>JSON.parse(sessionStorage.getItem('zasu.account.auth-attempt.v1')).resendAt>prior&&!document.querySelector('#code-form button[type=submit]').disabled,priorResend);assert.equal(actions.filter(x=>x.action==='request').length,2);assert.equal(actions.filter(x=>x.action==='request')[1].consent,true);
 await page.locator('#code').fill('123456');await page.locator('#code-form button[type=submit]').click();await page.locator('#trial-approve').waitFor({state:'visible'});assert.deepEqual(errors,[]);await page.close();
});

'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('builder exists for generated pages and public route inventory',()=>assert.ok(fs.existsSync(path.join(root,'tools/build-analytics.cjs'))));
test('public pages receive exactly one loader; protected pages are excluded; build is idempotent',()=>{
 const {build}=require('../tools/build-analytics.cjs');const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'zw-analytics-build-'));const fixture=path.join(temp,'site');
 try{
 fs.cpSync(root,fixture,{recursive:true,filter:source=>!source.split(path.sep).includes('.git')});
 const a=build(fixture);const config=fs.readFileSync(path.join(fixture,'assets/analytics-config.js'),'utf8');const context={window:{}};vm.runInNewContext(config,context);const c=context.window.ZASU_ANALYTICS_CONFIG;
 assert.ok(c.publicPaths.includes('/zasu-vocal/'));assert.equal(c.products['/zasu-vocal/'].id,'vocal');assert.equal(c.products['/zasu-vocal-editor/'].id,'vocal-editor');assert.ok(c.products['/media/']);
 for(const route of c.publicPaths){const file=path.join(fixture,route.endsWith('/')?route+'index.html':route);const html=fs.readFileSync(file,'utf8');assert.equal((html.match(/src="\/assets\/analytics\.js\?/g)||[]).length,1,route);}
 assert.ok(!c.publicPaths.some(p=>/\/(?:account|admin|download|thanks|client)\//.test(p)));assert.ok(a.pages>20);
 const first=fs.readFileSync(path.join(fixture,'zasu-vocal/index.html'),'utf8');build(fixture);assert.equal(fs.readFileSync(path.join(fixture,'zasu-vocal/index.html'),'utf8'),first);assert.equal(fs.readFileSync(path.join(fixture,'assets/analytics-config.js'),'utf8'),config);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

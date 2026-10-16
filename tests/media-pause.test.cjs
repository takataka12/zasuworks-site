'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');
const read=p=>fs.readFileSync(root+'/'+p,'utf8');
test('paused media has notice and no application controls, even without JS',()=>{
 const html=read('media/index.html');
 assert.ok(html.includes('ZASU MEDIAは現在、運営を一時休止しております。'));
 assert.ok(!/<form|id="send-mail"|id="maker"|事前相談受付中/.test(html));
});
test('old form markup cannot use the current script to create mail or send requests',()=>{
 const handlers={}; const form={addEventListener:(name,fn)=>handlers[name]=fn,querySelectorAll:()=>[]};
 const context={document:{getElementById:id=>id==='review-form'?form:null,addEventListener:()=>{}},FormData:()=>{throw Error('must not read application')},fetch:()=>{throw Error('must not send application')}};
 vm.runInNewContext(read('media/media.js'),context);
 if(handlers.submit) handlers.submit({preventDefault(){}});
});
test('generated pages do not offer applications and carry the pause notice',()=>{
 const {renderArchive}=require('../tools/build-media.cjs');const html=renderArchive([]);
 assert.ok(html.includes('新規作品の応募受付およびレビュー掲載は停止中です。'));
 assert.ok(!html.includes('無料レビューを相談する'));
});

test('generated policy and creator note do not advertise an active intake or November launch',()=>{
 const source=read('tools/build-media.cjs');
 assert.ok(!source.includes('作品の事前相談は、今も受け付けています'));
 assert.ok(!source.includes('レビュー活動は2026年11月から順次開始予定です'));
});

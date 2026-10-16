'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const builder=path.join(__dirname,'../tools/build-media.cjs');
test('review publishing builder exists',()=>{assert.ok(fs.existsSync(builder),'missing review publishing builder');});
test('empty catalog stays zero and does not invent cards',()=>{
 assert.ok(fs.existsSync(builder),'missing builder');
 const {renderArchive,validateReviews}=require(builder);
 assert.equal(validateReviews([]).length,0);
 const html=renderArchive([]);
 assert.ok(html.includes('レビューは、これから。'));
 assert.ok(!html.includes('data-review-card'));
});
test('incomplete reviews and hostile URLs are rejected',()=>{
 assert.ok(fs.existsSync(builder),'missing builder');
 const {validateReviews}=require(builder);
 assert.throws(()=>validateReviews([{slug:'unfinished'}]));
});
function fixture(overrides={}){return {slug:'test-only',title:'テスト専用タイトル',summary:'テストだけに使う書式データです。',product:'テスト作品',maker:'架空のテスト作者',officialUrl:'https://example.com/',category:'web',topic:'create',testedAt:'2026-10-12',publishedAt:'2026-10-13',version:'test',environment:'テスト環境',disclosure:'テスト用データ',task:'テストの課題',result:'これは実績ではないテスト文',good:'テスト文',limits:'テスト文',unknown:'テスト文',approved:true,actualUseConfirmed:true,evidence:[{caption:'テストの記録',url:'https://example.com/evidence'}],...overrides};}
test('known category values only; inherited object properties are not categories',()=>{
 const {validateReviews}=require(builder);
 assert.throws(()=>validateReviews([fixture({category:'constructor'})]));
 assert.throws(()=>validateReviews([fixture({topic:'__proto__'})]));
});
test('only complete, approved public trial records publish',()=>{
 const {validateReviews}=require(builder);
 assert.equal(validateReviews([fixture()]).length,1);
 for(const patch of [{approved:false},{actualUseConfirmed:false},{evidence:[]},{officialUrl:'javascript:alert(1)'},{officialUrl:'https://user:password@example.com'},{slug:'../../index'},{testedAt:'2026-02-30'},{privateNotes:'must not publish'},{publishedAt:'2026-10-01'}])assert.throws(()=>validateReviews([fixture(patch)]));
 assert.throws(()=>validateReviews([fixture(),fixture()]));
});
test('article text, evidence labels and titles are escaped',()=>{
 const {validateReviews,renderArticle}=require(builder);
 const [r]=validateReviews([fixture({title:'$&<script>window.injected=1</script>',result:'<img src=x onerror=alert(1)>',creatorNote:'<b>public text</b>'})]);
 const html=renderArticle(r);
 assert.ok(!html.includes('<script>window.injected'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<img src=x'));
 assert.ok(html.includes('&lt;b&gt;public text&lt;/b&gt;'));
 assert.ok(html.includes('今回は試していないこと'));
});
test('update observations preserve initial trial and distinguish author changes',()=>{
 const {validateReviews,renderArticle}=require(builder);
 const [r]=validateReviews([fixture({updates:[{date:'2026-10-13',version:'test2',change:'作者の変更説明',checked:'再試用の記録'}]})]);
 const html=renderArticle(r);
 assert.ok(html.includes('2026-10-12'));assert.ok(html.includes('2026-10-13'));
 assert.ok(html.includes('作者による変更内容'));assert.ok(html.includes('実際に再試用して確認したこと'));
});
test('build output is current and matches the public manifest',()=>{
 const {build}=require(builder);
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../media/reviews.json'),'utf8'));
 assert.deepEqual(build(path.join(__dirname,'..'),true),{reviews:manifest.reviews.length,pages:5+manifest.reviews.length});
});
test('paused publisher rejects even an otherwise approved new review',()=>{
 const root=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'media-paused-build-'));
 try{
  fs.mkdirSync(path.join(root,'media'));
  fs.writeFileSync(path.join(root,'media/reviews.json'),JSON.stringify({schemaVersion:1,reviews:[fixture()]}));
  assert.throws(()=>require(builder).build(root),/ZASU MEDIA is paused/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

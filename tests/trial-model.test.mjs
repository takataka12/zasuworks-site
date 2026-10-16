import {test} from 'node:test';import assert from 'node:assert/strict';import {remaining,safeDownloads,productPages} from '../trial/model.mjs';
for(const product of Object.keys(productPages))test(product+' requires explicit boolean public release approval',()=>{
 const candidate={product_key:product,mac_url:'https://example.invalid/trial.dmg',mac_sha256:'a'.repeat(64)};
 for(const released of [false,undefined,null,'false','true',1,{},[]])assert.deepEqual(safeDownloads({...candidate,released}),[]);
 assert.equal(safeDownloads({...candidate,released:true}).length,1);
});
test('remaining hours uses server time and exact expiry',()=>{assert.equal(remaining('2026-10-22T00:00:00Z','2026-10-15T00:00:00Z'),168);assert.equal(remaining('2026-10-22T00:00:00Z','2026-10-22T00:00:00Z'),0);assert.equal(remaining('bad','bad'),0);});
test('no download for unapproved packages or unsafe links',()=>{const p={released:false,mac_url:'https://example.invalid/test.dmg',mac_sha256:'a'.repeat(64)};assert.deepEqual(safeDownloads(p),[]);assert.equal(safeDownloads({...p,released:true}).length,1);for(const u of ['javascript:alert(1)','http://example.invalid','https://user:pass@example.invalid'])assert.deepEqual(safeDownloads({...p,released:true,mac_url:u}),[]);});

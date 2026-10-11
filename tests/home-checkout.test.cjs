const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
test('studio homepage retains the approved live bundle checkout and buyer download',()=>{
 const tag=html.match(/<a\b[^>]*id="bundle-checkout"[^>]*>/)[0];
 assert.match(tag,/href="https:\/\/checkout\.square\.site\/merchant\/ML4WFCYYG84WZ\/checkout\/KCX5YJTJVCYOP6RC4AFYRQ5X"/);
 assert.doesNotMatch(tag,/aria-disabled="true"/);
 assert.match(html,/href="\/vocal-loud-set\/download\/"/);
});

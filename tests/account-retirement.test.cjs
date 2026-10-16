const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {renderNavigation}=require('../tools/navigation/render.cjs');
test('public navigation has no membership routes',()=>assert.doesNotMatch(renderNavigation('/'),/href="\/account\//));
test('retirement page preserves product routes with no sign-in',()=>{const h=fs.readFileSync('account/index.html','utf8');for(const p of ['vocal','loud','daw','finish','vocal-editor'])assert.ok(h.includes(`/zasu-${p}/download/`));assert.doesNotMatch(h,/type="email"|account\.mjs|id="login"/)});
test('new products use a guest purchase form without signup',()=>{for(const p of ['finish','vocal-editor']){const h=fs.readFileSync(`zasu-${p}/download/index.html`,'utf8');assert.match(h,/id="guest-purchase"/);assert.match(h,/会員登録・ログインは不要/);assert.doesNotMatch(h,/href="\/account\/"/);}});
test('refund conditions preserve old contracts and receipt time',()=>{const h=fs.readFileSync('zasu-loud/terms.html','utf8');assert.match(h,/具体的かつ合理的/);assert.match(h,/返信が8日目以降/);assert.match(h,/遡及/);assert.match(h,/refund-guarantee-20261017-current/);});

test('refund amendment is not enforced before checkout disclosure verification',()=>{for(const path of ['zasu-loud/terms.html','zasu-loud/tokushoho.html','zasu-loud/index.html','zasu-vocal/index.html']){const h=fs.readFileSync(path,'utf8');assert.match(h,/適用開始日は未定で、まだ適用しません/);assert.match(h,/現在は従来の7日間返金保証を継続/);assert.doesNotMatch(h,/2026年10月18日0:00/);}});

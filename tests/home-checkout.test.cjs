const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
// Evaluate the real checkout activation, with only the browser DOM boundary replaced.
const activation=html.slice(html.indexOf('const bundleCheckoutUrl'),html.indexOf('const menu='));
const canonical='https://checkout.square.site/merchant/ML4WFCYYG84WZ/checkout/KCX5YJTJVCYOP6RC4AFYRQ5X';
function run(url){
 const checkout={textContent:'セット販売準備中',attributes:{'aria-disabled':'true'},removeAttribute(key){delete this.attributes[key]}};
 const status={textContent:'販売開始までお待ちください。'},label={textContent:'セット価格'};
 vm.runInNewContext(activation.replace(/const bundleCheckoutUrl = '[^']*';/,`const bundleCheckoutUrl = ${JSON.stringify(url)};`),{document:{getElementById(id){return id==='bundle-checkout'?checkout:status},querySelector(){return label}}});
 return checkout;
}
test('approved checkout enables the existing purchase button with the exact destination',()=>{
 const button=run(canonical);
 assert.equal(button.href,canonical);
 assert.equal(button.attributes['aria-disabled'],undefined);
 assert.equal(button.textContent,'制作セットを購入');
});
for(const url of ['', 'https://square.link/u/nVlHbpUy', 'https://checkout.square.site/merchant/OTHER/checkout/KCX5YJTJVCYOP6RC4AFYRQ5X', canonical.replace('KCX5YJTJVCYOP6RC4AFYRQ5X','OTHER'), canonical.replace('https:','http:'), 'javascript:alert(1)']){
 test(`unapproved destination leaves sales disabled: ${url||'(empty)'}`,()=>{
  const button=run(url);assert.equal(button.href,undefined);assert.equal(button.attributes['aria-disabled'],'true');assert.equal(button.textContent,'セット販売準備中');
 });
}

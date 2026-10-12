const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function run(active){
 const nodes=['shop','vocal','loud','daw','finish','vocal-editor'].map(key=>({dataset:{boothChannel:key},hidden:true}));
 const context={window:{ZASU_BOOTH:{shopOpen:active,products:{vocal:active,loud:false,daw:false,finish:false,'vocal-editor':false}}},document:{querySelectorAll:()=>nodes}};
 vm.runInNewContext(fs.existsSync(path.join(root,'assets/booth-channel.js'))?fs.readFileSync(path.join(root,'assets/booth-channel.js'),'utf8'):'',context);
 return nodes;
}
test('closed shop exposes no purchase links',()=>assert.ok(run(false).every(n=>n.hidden)));
test('only confirmed public products are shown',()=>assert.deepEqual(run(true).map(n=>n.hidden),[false,false,true,true,true,true]));
test('shipped configuration keeps the BOOTH shop disabled',()=>{const c={window:{}}; vm.runInNewContext(fs.readFileSync(path.join(root,'assets/booth-config.js'),'utf8'),c);assert.equal(c.window.ZASU_BOOTH.shopOpen,false);});

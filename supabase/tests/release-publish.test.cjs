const {test}=require('node:test');
const assert=require('node:assert/strict');
const {publishRelease}=require('../release/publish-work.js');
function fixture(fail='') {
  const events=[], live={name:'download',status:'ACTIVE',verify_jwt:false,files:[{name:'index.ts',content:'old'}]};
  let head='base',commits=0; const deployments={download:live};
  const plan={project:'p',repository:'r',base_commit:'base',function:'download',helper:'transfer',function_files:['index.ts'],marketing_files:['product.html'],version:'0.0.14',build:'0.0.15',old:[]};
  const request={plan,frontend:[{path:'download.js',content:'allow'}],marketing:[{path:'product.html',content:'new'}],functionFiles:[{name:'index.ts',content:'new'}],helperFiles:[{name:'index.ts',content:'auth'}],manifests:[]};
  const ok=o=>({structuredContent:o});
  const tools={
    exec_command:async ({cmd})=>{const action=['prepare','read-request','upload','retrieve','public-check','site-check'].find(a=>cmd.includes("'"+a+"'"));events.push(action);return {exit_code:fail===action?1:0,output:JSON.stringify(action==='read-request'?request:{ready:true})}},
    mcp__codex_apps__github_fetch:async({url})=>ok(url.includes('/git/ref/')?{object:{sha:head}}:{tree:{sha:'tree'}}),
    mcp__codex_apps__github_fetch_file:async()=>ok({content:'old'}),
    mcp__codex_apps__supabase_get_edge_function:async({function_slug})=>ok(deployments[function_slug]),
    mcp__codex_apps__supabase_deploy_edge_function:async({name,files,verify_jwt})=>{events.push('deploy:'+name+':'+files[0].content);deployments[name]={status:'ACTIVE',verify_jwt,files};return ok({})},
    mcp__codex_apps__github_create_tree:async()=>ok({sha:'tree'}),
    mcp__codex_apps__github_create_commit:async()=>ok({sha:'commit'+(++commits)}),
    mcp__codex_apps__github_update_ref:async({sha,force})=>{assert.equal(force,false);head=sha;events.push('commit');return ok({})},
  };
  return {tools,events,deployments,config:{root:'/repo',job:'/job',mac:'/m.zip',windows:'/w.zip'}};
}
test('native gate failure prevents every remote write',async()=>{const f=fixture('prepare');await assert.rejects(publishRelease(f.tools,f.config));assert.deepEqual(f.events,['prepare'])});
test('upload/hash failure prevents distribution cutover and shuts helper down',async()=>{const f=fixture('upload');await assert.rejects(publishRelease(f.tools,f.config));assert(!f.events.includes('commit'));assert.equal(f.deployments.download.files[0].content,'old');assert.equal(f.deployments.transfer.verify_jwt,true)});
test('happy path verifies before cutover and retrieves after commit',async()=>{const f=fixture();const result=await publishRelease(f.tools,f.config);assert.equal(result.status,'PUBLISHED');assert(f.events.indexOf('upload')<f.events.indexOf('deploy:download:new'));assert(f.events.lastIndexOf('retrieve')>f.events.lastIndexOf('commit'));assert.equal(f.deployments.transfer.verify_jwt,true)});
test('post-deploy byte mismatch restores old API and disables helper',async()=>{const f=fixture('retrieve');await assert.rejects(publishRelease(f.tools,f.config));assert.equal(f.deployments.download.files[0].content,'old');assert.equal(f.deployments.transfer.verify_jwt,true)});

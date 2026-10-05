/* Execute in Work with the authenticated GitHub/Supabase tools.
 * This expression evaluates to an async function. No tokens are copied out of
 * connected apps. All production mutations occur AFTER native/hashing gates.
 */
const publishRelease = async (tools, config, progress = () => {}) => {
  const quote = s => "'" + String(s).replaceAll("'", "'\"'\"'") + "'";
  const unpack = r => {
    if (r.isError) throw new Error('Connected-app request failed');
    let data = r.structuredContent;
    if (!data) {
      const block = r.content?.find(c => c.type === 'text');
      if (!block) throw new Error('Missing connector response');
      data = JSON.parse(block.text);
    }
    if (typeof data.content === 'string' && /^[\[{]/.test(data.content)) return JSON.parse(data.content);
    return data;
  };
  const io = async (action, extra = []) => {
    const args = [...(config.sevenZip ? ['env','ZASU_7ZIP='+config.sevenZip] : []), 'python3', config.root + '/supabase/release/work_io.py', action, '--job', config.job, ...extra];
    const limit = action === 'read-request' ? 80000 : 5000;
    let r = await tools.exec_command({cmd:args.map(quote).join(' '),yield_time_ms:1000,max_output_tokens:limit});
    let output = r.output;
    while (r.session_id) {
      r = await tools.write_stdin({session_id:r.session_id,chars:'',yield_time_ms:1000,max_output_tokens:limit});
      output += r.output;
    }
    if (r.exit_code !== 0) throw new Error('Release I/O stopped at ' + action);
    const result = JSON.parse(output);
    if (result.error) throw new Error('Release gate failed at ' + action);
    return result;
  };
  await io('prepare', ['--mac',config.mac,'--windows',config.windows]);
  const request = await io('read-request'), p = request.plan;
  const gh = async suffix => unpack(await tools.mcp__codex_apps__github_fetch({url:`https://api.github.com/repos/${p.repository}/${suffix}`}));
  const head = async () => (await gh('git/ref/heads/main')).object.sha;
  const initial = await head();
  if (initial !== p.base_commit) throw new Error('Live main changed. Rebase the release plan without overwriting newer work.');
  const live = unpack(await tools.mcp__codex_apps__supabase_get_edge_function({project_id:p.project,function_slug:p.function}));
  const baseline = [];
  for (const file of p.function_files) {
    const r = unpack(await tools.mcp__codex_apps__github_fetch_file({repository_full_name:p.repository,path:'supabase/functions/' + p.function + '/' + file,ref:initial}));
    if (live.files.find(f => f.name.split('/').at(-1) === file)?.content !== r.content)
      throw new Error('Deployed function differs from baseline. Stop before upload.');
    baseline.push({name:file,content:r.content});
  }
  const deploy = async (name,files,verify_jwt) => {
    const r = await tools.mcp__codex_apps__supabase_deploy_edge_function({project_id:p.project,name,files,verify_jwt,entrypoint_path:'index.ts'});
    if (r.isError) throw new Error('Edge deployment failed');
    const readback = unpack(await tools.mcp__codex_apps__supabase_get_edge_function({project_id:p.project,function_slug:name}));
    if (readback.verify_jwt !== verify_jwt || readback.status !== 'ACTIVE' || files.some(f => readback.files.find(x=>x.name.split('/').at(-1)===f.name)?.content !== f.content))
      throw new Error('Edge readback mismatch');
  };
  let latest = initial, changedFunction = false, marketingCommit = false, helperStarted = false;
  const commit = async (entries,message) => {
    if (await head() !== latest) throw new Error('Concurrent main update; stopped without force push');
    const current = await gh('git/commits/' + latest);
    const tree = unpack(await tools.mcp__codex_apps__github_create_tree({repository_full_name:p.repository,base_tree_sha:current.tree.sha,tree_elements:entries}));
    const created = unpack(await tools.mcp__codex_apps__github_create_commit({repository_full_name:p.repository,parent_sha:latest,tree_sha:tree.sha,message}));
    const r = await tools.mcp__codex_apps__github_update_ref({repository_full_name:p.repository,branch_name:'main',sha:created.sha,force:false});
    if (r.isError) throw new Error('Main update failed');
    latest = created.sha;
  };
  const pages = async phase => {
    for (let attempt=0;attempt<60;attempt++) {
      if ((await io('site-check',['--phase',phase])).ready) return;
      if (attempt % 3 === 0) progress('Pages反映を確認中: ' + phase);
      await new Promise(resolve => setTimeout(resolve,10000));
    }
    throw new Error('Pages did not serve expected release content');
  };
  try {
    progress('実機記録・配布ファイルを検証済み。非公開ストレージへ配置します。');
    helperStarted = true;
    await deploy(p.helper, request.helperFiles, false); // Handler enforces per-run hashed capability and expiration.
    await io('upload'); // New and previous files must both have identical bytes.
    await io('public-check');
    await commit(request.frontend, 'Prepare download allowlist for verified ZASU DAW 0.0.14');
    await pages('frontend');
    progress('公開ページの許可リストを確認しました。配布APIを更新します。');
    changedFunction = true; // Also rollback if deployment succeeded but readback failed.
    await deploy(p.function, request.functionFiles, live.verify_jwt);
    await io('public-check');
    await io('retrieve');
    const catalog = {version:p.version,build:p.build,files:request.manifests,previous:p.old,
      verified_at:new Date().toISOString(),purchase_e2e:'NOT RUN: owner-specified test purchase not supplied',inspection:request.inspection};
    const records = [{path:'supabase/releases/zasu-daw-0.0.14.json',mode:'100644',type:'blob',content:JSON.stringify(catalog,null,2)+'\n'},
      ...request.functionFiles.map(f=>({path:'supabase/functions/'+p.function+'/'+f.name,mode:'100644',type:'blob',content:f.content}))];
    await commit([...request.marketing,...records], 'Release ZASU DAW 0.0.14 for Mac and Windows');
    marketingCommit = true;
    await pages('marketing');
    await io('retrieve');
    await io('public-check');
    progress('公開内容と新旧配布物のSHA-256を確認しました。転送機能を閉じます。');
    return {status:'PUBLISHED',commit:latest,version:p.version,build:p.build,files:request.manifests,
      download_verification:'Actual private delivery URLs fetched and SHA-256 matched',
      purchase_e2e:'NOT RUN (no supplied test purchase); existing authorization tests and public denial checks executed'};
  } catch (error) {
    const errors = [error.message];
    if (changedFunction) {
      try { await deploy(p.function,baseline,live.verify_jwt); }
      catch { errors.push('FUNCTION ROLLBACK FAILED: reconnect and restore saved baseline before continuing'); }
    }
    if (marketingCommit) {
      try {
        const paths = [...p.marketing_files,...p.function_files.map(f=>'supabase/functions/'+p.function+'/'+f)];
        const entries = [];
        for (const path of paths) {
          const r = unpack(await tools.mcp__codex_apps__github_fetch_file({repository_full_name:p.repository,path,ref:initial}));
          entries.push({path,mode:'100644',type:'blob',content:r.content});
        }
        entries.push({path:'supabase/releases/zasu-daw-0.0.14.json',mode:'100644',type:'blob',sha:null});
        await commit(entries,'Roll back incomplete ZASU DAW 0.0.14 publication');
      } catch { errors.push('SITE ROLLBACK FAILED: restore marketing from baseline after checking concurrent changes'); }
    }
    throw new Error(errors.join('; '));
  } finally {
    if (helperStarted) await deploy(p.helper,[{name:'index.ts',content:"Deno.serve(() => new Response('Release transfer closed', {status:410}));\n"}],true);
  }
};
if (typeof module !== 'undefined') module.exports = {publishRelease};
publishRelease;

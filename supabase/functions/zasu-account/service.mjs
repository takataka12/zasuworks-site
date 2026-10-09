async function equalSecret(a,b){if(typeof a!=='string'||typeof b!=='string'||!a||!b)return false;const digest=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [x,y]=await Promise.all([digest(a),digest(b)]);let delta=0;for(let i=0;i<x.length;i++)delta|=x[i]^y[i];return delta===0;}
export function createServiceRouter({key,accountHandler,processEvent,authorizeRecovery,replay,inventory,configureRefunds}){return async req=>{
 const recoveryKey=req.headers.get('x-zasu-commerce-key');
 const service=await equalSecret(req.headers.get('authorization'),'Bearer '+key);
 if(!recoveryKey&&!service)return accountHandler(req);
 const reply=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 try{
  if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
  if(!service&&(!recoveryKey||recoveryKey.length>128||!await authorizeRecovery(recoveryKey)))return reply(401,{error:'authentication_required'});
  const reader=req.body?.getReader();if(!reader)return reply(400,{error:'invalid_request'});let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply(413,{error:'request_too_large'})}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}let body;try{body=JSON.parse(new TextDecoder().decode(bytes))}catch{return reply(400,{error:'invalid_request'})}
  if(body.action==='commerce_event'&&service){await processEvent(body.event);return reply(200,{ok:true})}
  if(body.action==='commerce_replay'){return reply(200,await replay())}
  if(body.action==='commerce_configure_refunds'&&Object.keys(body).length===1)return reply(200,await configureRefunds());
  if(body.action==='commerce_inventory'){return reply(200,await inventory())}
  return reply(400,{error:'invalid_request'});
 }catch{return reply(503,{error:'temporarily_unavailable'})}
};}

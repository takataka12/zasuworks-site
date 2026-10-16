const origins=new Set(['https://zasuworks.jp','https://www.zasuworks.jp','https://zasumaster.com']);
// Public membership is retired. Commerce service routing stays in service.mjs.
export function createRetiredHandler(){return async req=>{
 const origin=req.headers.get('origin'),headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(!origins.has(origin))return new Response(JSON.stringify({error:'origin_denied'}),{status:403,headers});
 Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 return new Response(JSON.stringify({error:'account_retired',supportUrl:'https://zasuworks.jp/support.html#downloads'}),{status:410,headers});
};}

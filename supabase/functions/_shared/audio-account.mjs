// Optional connection layer. Guest requests always use the original handler unchanged.
export function withAudioAccount({name,legacy,authenticate,bind,authorizeSource=async(_context)=>true}){return async req=>{
 const headers={'Access-Control-Allow-Origin':'https://zasumaster.com','Access-Control-Allow-Headers':'authorization,content-type,apikey,x-client-info,x-zasu-account-connection','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const connection=req.headers.get('x-zasu-account-connection');
 if(req.method==='OPTIONS'&&req.headers.get('access-control-request-headers')?.toLowerCase().includes('x-zasu-account-connection')){if(req.headers.get('origin')!=='https://zasumaster.com')return new Response(null,{status:403});const original=await legacy(req);const existing=original.headers.get('Access-Control-Allow-Headers')||'';headers['Access-Control-Allow-Headers']=[...new Set((existing+','+headers['Access-Control-Allow-Headers']).split(',').map(x=>x.trim().toLowerCase()).filter(Boolean))].join(',');return new Response(null,{status:204,headers});}
 if(!connection)return legacy(req);
 if(req.headers.get('origin')!=='https://zasumaster.com')return Response.json({error:'origin_denied'},{status:403});
 const user=await authenticate(connection);if(!user)return Response.json({error:'account_connection_expired'},{status:401,headers});
 let body;try{body=await req.clone().json()}catch{return Response.json({error:'invalid_request'},{status:400,headers})}
 const creating=name==='zasu-mix-api'?body.action==='create_job':name==='convert-api'?['create_upload','create_from_master'].includes(body.action):true;
 if(!creating)return legacy(req);
 if(!await authorizeSource({name,user,body}))return Response.json({error:'account_source_not_owned'},{status:403,headers});
 const response=await legacy(req);if(!response.ok)return response;
 let result;try{result=await response.clone().json()}catch{return response}
 const master=['create-mix-upload','create-master-from-zasu-mix'].includes(name);
 const resource=master?result.upload_id:result.job_id;
 let linked=false;
 if(resource&&result.reused!==true){try{linked=!!await bind({user,kind:master?'master_upload':name==='convert-api'?'convert':'mix',resource,accessToken:result.access_token,body});}catch{console.error('audio_account_binding_incomplete')}}
 return Response.json({...result,account_linked:linked},{status:response.status,headers:new Headers(response.headers)});
};}

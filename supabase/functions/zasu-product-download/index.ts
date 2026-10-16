import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {createHandler} from './handler.mjs';
import {createSquare} from '../zasu-account/square.mjs';
import {RELEASES} from '../../../account/catalog.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const square=createSquare({token:Deno.env.get('SQUARE_ACCESS_TOKEN')});
Deno.serve(createHandler({...square,
 limit:async(req:Request)=>{
  const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,64);
  const {data,error}=await db.rpc('zasu_rate_limit_check',{p_ip:`product-download:${ip}`,p_user_agent:'',p_scope:'product_download',p_burst_limit:12,p_burst_seconds:60,p_hour_limit:60,p_global_burst_limit:30,p_global_burst_seconds:60});
  if(error)throw Error('rate_limit_unavailable');return data?.allowed===true;
 },
 signDownloads:async(product:keyof typeof RELEASES)=>{
  const release=RELEASES[product];
  return await Promise.all(release.files.map(async([os,filename]:string[])=>{
   const {data,error}=await db.storage.from(release.bucket).createSignedUrl(`${release.version}/${filename}`,600,{download:filename});
   if(error||!data?.signedUrl)throw Error('file_unavailable');return {os,filename,version:release.version,url:data.signedUrl};
  }));
 }
}));

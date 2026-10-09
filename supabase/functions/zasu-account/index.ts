import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {createHandler} from './handler.mjs';
import {createAdapter} from './adapter.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const createAuthClient=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const db=createAuthClient();
Deno.serve(createHandler(createAdapter({db,key,createAuthClient})));

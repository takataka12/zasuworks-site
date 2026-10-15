#!/usr/bin/env node
// Serves only a small allowlisted account preview. Never serves the repository or private key folder.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const url='https://giljyqaohutxoxlpkfjf.supabase.co';
const config=`export const SUPABASE_URL=${JSON.stringify(url)};\nexport const PUBLISHABLE_KEY="sb_publishable_znE-zypk331F36X945paoQ_h18eZNc8";\nexport const ACCOUNT_ENDPOINT=SUPABASE_URL+'/functions/v1/zasu-trial-account-validation';\n`;
const files=new Set(['account/index.html','account/account.mjs','account/account.css','account/catalog.mjs','account/trials.mjs','account/trial-auth-state.mjs','trial/model.mjs','assets/site-improvements.css','assets/navigation.css','assets/navigation.js','assets/favicon.svg','favicon.ico','apple-touch-icon.png']);
const types={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.ico':'image/x-icon','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 // Exact Host check also prevents DNS-rebinding sites from reading local session pages.
 if(req.headers.host!=='127.0.0.1:8765'||!['GET','HEAD'].includes(req.method)){res.writeHead(403).end();return;}
 try{
  const pathname=new URL(req.url,'http://127.0.0.1:8765').pathname;
  if(pathname==='/'){res.writeHead(302,{Location:'/account/'}).end();return;}
  const name=pathname==='/account/'?'account/index.html':pathname.slice(1);
  let data;
  if(name==='account/config.mjs')data=config;
  else if(files.has(name))data=await readFile(path.join(root,name));
  else{res.writeHead(404).end();return;}
  if(name==='account/index.html')data=data.toString().replaceAll('https://siwmzradvrtetotakkbi.supabase.co',url).replace(/(<body[^>]*>)/,'$1<p role="note">ZASU TRIAL — 非公開ステージング検証。本番の登録・購入情報には接続しません。初回は「新規登録」で検証環境への登録に同意してください。</p>');
  res.setHeader('Content-Type',(types[path.extname(name)]||'application/octet-stream')+'; charset=utf-8');
  res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404).end();}
});
server.on('error',()=>{console.error('検証ページを起動できません。8765番ポートを使用中のアプリがないか確認してください。');process.exitCode=1;});
server.listen(8765,'127.0.0.1',()=>console.log('検証ページ: http://127.0.0.1:8765/account/\nこのターミナルは起動したままにしてください。終了はControl+C。秘密鍵ファイルは読み取りません。'));

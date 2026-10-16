import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {STAGING_FILES} from './trial-staging-files.mjs';
const sourceDefault=fileURLToPath(new URL('../',import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function regularFile(file,boundary){
 let current=path.resolve(file);const root=boundary&&path.resolve(boundary);
 do {const stat=await fs.lstat(current);if(stat.isSymbolicLink())throw Error('Linked source is not allowed');current=path.dirname(current);}while(root&&current!==root&&current!==path.dirname(current));
 if(!(await fs.lstat(file)).isFile())throw Error('Expected regular source file');
 return fs.readFile(file);
}
export async function packageValidation({output,runtime,license,source:sourceRoot=sourceDefault,runtimeVersion='unverified'}){
 if(!output||!runtime||!license)throw Error('Output, Windows runtime and its license are required');
 const pe=await regularFile(runtime);const offset=pe.length>=64?pe.readUInt32LE(60):0;
 if(pe.length<256||pe.toString('ascii',0,2)!=='MZ'||offset<64||offset+24>pe.length||pe.readUInt32LE(offset)!==0x4550||pe.readUInt16LE(offset+4)!==0x8664)throw Error('Expected a Windows x64 Node runtime');
 const entries=[['runtime/node.exe',pe],['runtime/LICENSE',await regularFile(license)]];
 for(const relative of [...STAGING_FILES,'tools/serve-trial-staging.mjs','tools/trial-staging-files.mjs'])entries.push([relative,await regularFile(path.join(sourceRoot,relative),sourceRoot)]);
 entries.push(['Start-PRIVATE-Validation.cmd',Buffer.from('@echo off\r\ncd /d "%~dp0"\r\n"runtime\\node.exe" "tools\\serve-trial-staging.mjs"\r\npause\r\n')]);
 entries.push(['README-PRIVATE.txt',Buffer.from(`ZASU TRIAL — Windows検証用 / 一般配布禁止
Start-PRIVATE-Validation.cmd を開き、このコンソールを起動したままにしてください。
検証ページ: http://127.0.0.1:8765/account/
終了は Control+C。Nodeのインストールや管理者権限は不要です。
このツールはローカル127.0.0.1だけで待ち受け、秘密鍵ファイルを読みません。
ログイン・メール送信・体験承認・期限変更を自動実行しません。
既存有料製品、ライセンス、プリセット、プロジェクトを変更しません。
認証APIはステージング環境です。本番販売・購入者情報へ接続しません。
OSの保護機能を無効化しないでください。対話操作・音声は別途検証が必要です。
`)]);
 await fs.mkdir(output); // Existing output is never overwritten or deleted.
 const files=[];
 for(const [relative,bytes] of entries){const target=path.join(output,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes,{flag:'wx'});files.push({path:relative,size:bytes.length,sha256:digest(bytes)});}
 const report={schema:1,environment:'private-staging',publicRelease:false,sourceCommit:process.env.GITHUB_SHA||null,nodeArchitecture:'x64',runtimeVersion,files};
 const manifest=Buffer.from(JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(output,'MANIFEST.json'),manifest,{flag:'wx'});
 await fs.writeFile(path.join(output,'SHA256SUMS.txt'),[...files.map(f=>f.sha256+'  '+f.path),digest(manifest)+'  MANIFEST.json'].join('\n')+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const args=new Map();for(let i=2;i<process.argv.length;i+=2)args.set(process.argv[i],process.argv[i+1]);
 const report=await packageValidation({output:args.get('--output'),runtime:args.get('--node-runtime'),license:args.get('--node-license'),runtimeVersion:args.get('--runtime-version')||'unverified'});
 console.log(JSON.stringify({publicRelease:report.publicRelease,files:report.files.length,nodeArchitecture:report.nodeArchitecture}));
}

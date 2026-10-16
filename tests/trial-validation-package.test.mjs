import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
const load=()=>import('../tools/package-trial-validation.mjs');
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'trial-preview-package-'));
 const {STAGING_FILES}=await import('../tools/trial-staging-files.mjs');
 const source=path.join(root,'source');await fs.mkdir(source);
 for(const name of [...STAGING_FILES,'tools/serve-trial-staging.mjs','tools/trial-staging-files.mjs']){
  const file=path.join(source,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,'fixture '+name);
 }
 const pe=Buffer.alloc(512);pe.write('MZ');pe.writeUInt32LE(128,60);pe.writeUInt32LE(0x4550,128);pe.writeUInt16LE(0x8664,132);
 const runtime=path.join(root,'node.exe');await fs.writeFile(runtime,pe);
 const license=path.join(root,'LICENSE');await fs.writeFile(license,'fixture third-party license');
 return {root,source,runtime,license,output:path.join(root,'bundle')};
}
test('portable validation copies only allowlisted source and records exact file hashes',async()=>{
 const {packageValidation}=await load();const f=await fixture();
 try{
  await fs.writeFile(path.join(f.source,'trial.env'),'PRIVATE SENTINEL');
  await fs.writeFile(path.join(f.source,'account/config.mjs'),'PRODUCTION CONFIG SENTINEL');
  const report=await packageValidation(f);
  assert.equal(report.publicRelease,false);assert.equal(report.environment,'private-staging');assert.equal(report.nodeArchitecture,'x64');
  for(const file of report.files){const bytes=await fs.readFile(path.join(f.output,file.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}
  await assert.rejects(fs.access(path.join(f.output,'trial.env')));await assert.rejects(fs.access(path.join(f.output,'account/config.mjs')));
  assert.match(await fs.readFile(path.join(f.output,'Start-PRIVATE-Validation.cmd'),'utf8'),/runtime\\node.exe/);
  assert.match(await fs.readFile(path.join(f.output,'README-PRIVATE.txt'),'utf8'),/127\.0\.0\.1:8765/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('portable validation refuses non-x64 runtime and existing output',async()=>{
 const {packageValidation}=await load();const f=await fixture();
 try{
  const bytes=await fs.readFile(f.runtime);bytes.writeUInt16LE(0xaa64,132);await fs.writeFile(f.runtime,bytes);
  await assert.rejects(packageValidation(f),/x64/);
  bytes.writeUInt16LE(0x8664,132);await fs.writeFile(f.runtime,bytes);await fs.mkdir(f.output);await fs.writeFile(path.join(f.output,'foreign'),'keep');
  await assert.rejects(packageValidation(f),/exist/i);assert.equal(await fs.readFile(path.join(f.output,'foreign'),'utf8'),'keep');
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('portable validation refuses linked source directories instead of copying their contents',async()=>{
 const {packageValidation}=await load();const f=await fixture();
 try{
  const account=path.join(f.source,'account'),other=path.join(f.root,'other-account');await fs.rename(account,other);await fs.symlink(other,account,'junction');
  await assert.rejects(packageValidation(f),/link/i);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});

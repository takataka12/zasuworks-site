// Existing Linux JUCE module objects are reused solely to render release UI.
// node tests/capture-loud.cjs <DAW source> <JUCE source> <LOUD v1.1.2 source>
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path'),os=require('node:os');
if(process.argv.length!==5)throw Error('DAW, JUCE and LOUD source paths required');
const [daw,juce,loud]=process.argv.slice(2).map(x=>path.resolve(x));
const build=path.join(daw,'build/linux-feedback/apps/zasu_daw');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zasu-loud-capture-'));
const split=s=>(s.match(/"[^"]*"|\S+/g)||[]).map(x=>x.replace(/^"|"$/g,''));
const flags=fs.readFileSync(build+'/CMakeFiles/ZASUDAW.dir/flags.make','utf8');
const args=['CXX_DEFINES','CXX_INCLUDES','CXX_FLAGS'].flatMap(k=>split(flags.match(new RegExp('^'+k+' = (.*)$','m'))[1])).map(x=>x.replace('/tmp/zasu-juce-8.0.15',juce));
args.push('-DJucePlugin_Name="ZASU LOUD"','-I'+loud+'/Source','-w');
function run(exe,args,opts={}){const r=cp.spawnSync(exe,args,{stdio:'inherit',...opts});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
const sources=[loud+'/Source/PluginProcessor.cpp',loud+'/Source/PluginEditor.cpp',__dirname+'/capture-loud.cpp'];
sources.forEach((src,i)=>run('/usr/bin/c++',[...args,'-c',src,'-o',temp+'/'+i+'.o']));
const original=split(fs.readFileSync(build+'/CMakeFiles/ZASUDAW.dir/link.txt','utf8'));
const modules=original.filter(x=>x.includes('/modules/juce_')&&x.endsWith('.o'));
run('/usr/bin/c++',[...sources.map((_,i)=>temp+'/'+i+'.o'),...modules,'-o',temp+'/capture','/usr/lib/x86_64-linux-gnu/libasound.so.2','/usr/lib/x86_64-linux-gnu/libfontconfig.so.1','/usr/lib/x86_64-linux-gnu/libfreetype.so.6','-lrt','-ldl','-lpthread'],{cwd:build});
run(temp+'/capture',[path.resolve(__dirname,'../assets/zasu-loud-v112.png')]);

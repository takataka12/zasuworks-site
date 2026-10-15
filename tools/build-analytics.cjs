'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const skip=new Set(['.git','node_modules','tests','supabase','admin','account','client','audio-integration','download','thanks','release','docs']);
const versionPrefix='20261015-a3';
function pages(dir){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>skip.has(e.name)?[]:e.isDirectory()?pages(path.join(dir,e.name)):e.name.endsWith('.html')&&e.name!=='qa.html'?[path.join(dir,e.name)]:[]);}
function build(root){
 const files=pages(root),configPath=path.join(root,'assets/analytics-config.js');
 const context={window:{}};vm.runInNewContext(fs.readFileSync(configPath,'utf8'),context);const c=context.window.ZASU_ANALYTICS_CONFIG;
 if(c.measurementId&&!/^G-[A-Z0-9]{6,20}$/.test(c.measurementId))throw Error('Invalid GA4 measurement ID');
 const publicPaths=files.map(f=>'/'+path.relative(root,f).replaceAll(path.sep,'/').replace(/index\.html$/,''));const products={};
 for(const route of publicPaths){const m=route.match(/^\/zasu-([a-z0-9-]+)\/$/);if(m)products[route]={id:m[1],name:'ZASU '+m[1].replaceAll('-',' ').toUpperCase()};}
 if(publicPaths.includes('/media/'))products['/media/']={id:'media',name:'ZASU MEDIA'};
 if(c.clarityProjectId&&!/^[a-z0-9]{5,24}$/.test(c.clarityProjectId))throw Error('Invalid Clarity project ID');
 const version=versionPrefix+'-'+require('node:crypto').createHash('sha256').update(JSON.stringify({measurementId:c.measurementId,clarityProjectId:c.clarityProjectId||''})).digest('hex').slice(0,10);
 const serialized=JSON.stringify({campaigns:c.campaigns,publicPaths,products},null,2).slice(1,-1);
 fs.writeFileSync(configPath,`// Public configuration. Never put GA API secrets or account credentials here.\nwindow.ZASU_ANALYTICS_CONFIG = {\n  measurementId: '${c.measurementId}',\n  clarityProjectId: '${c.clarityProjectId||''}',${serialized}\n};\n`);
 const tags=`<!-- ZW_ANALYTICS_START --><link rel="stylesheet" href="/assets/analytics.css?v=${version}"><script defer src="/assets/analytics-config.js?v=${version}"></script><script defer src="/assets/analytics-core.js?v=${version}"></script><script defer src="/assets/analytics.js?v=${version}"></script><!-- ZW_ANALYTICS_END -->`;
 for(const file of files){let html=fs.readFileSync(file,'utf8');html=html.replace(/<!-- ZW_ANALYTICS_START -->[\s\S]*?<!-- ZW_ANALYTICS_END -->/g,'');html=html.replace(/<\/head>/i,tags+'</head>');fs.writeFileSync(file,html);}
 return {pages:files.length,products:Object.keys(products).length};
}
module.exports={build,pages};
if(require.main===module)console.log(build(path.resolve(__dirname,'..')));

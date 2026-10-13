'use strict';
const fs=require('node:fs'),path=require('node:path');
const {renderNavigation,config}=require('./navigation/render.cjs');
const root=path.resolve(__dirname,'..');
const excluded=new Set(['.git','tests','admin','audio-integration']);
function pages(dir=root){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>excluded.has(e.name)?[]:e.isDirectory()?pages(path.join(dir,e.name)):e.name.endsWith('.html')&&e.name!=='qa.html'?[path.join(dir,e.name)]:[]);}
let count=0;
for(const file of pages()){
 let html=fs.readFileSync(file,'utf8');const route='/'+path.relative(root,file).replaceAll(path.sep,'/').replace(/index\.html$/,'');
 const nav=renderNavigation(route);
 if(html.includes('<!-- ZW_NAV_START -->'))html=html.replace(/<!-- ZW_NAV_START -->[\s\S]*?<!-- ZW_NAV_END -->/,nav);
 else if(/<header\b(?![^>]*class="hero")/i.test(html))html=html.replace(/<header\b(?![^>]*class="hero")[\s\S]*?<\/header>/i,nav);
 else html=html.replace(/(<body\b[^>]*>)/i,'$1'+nav);
 // Keep page CSS intact; scoped shared styles always load last.
 html=html.replace(/<link rel="stylesheet" href="\/assets\/navigation\.css[^>]*>/g,'').replace(/<script src="\/assets\/navigation\.js[^>]*><\/script>/g,'');
 html=html.replace('</head>',`<link rel="stylesheet" href="/assets/navigation.css?v=${config.version}"><script src="/assets/navigation.js?v=${config.version}" defer></script></head>`);
 fs.writeFileSync(file,html);count++;
}
console.log(`Shared navigation built for ${count} public pages.`);

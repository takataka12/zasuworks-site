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
 // Older public pages retain their own footer layout; add the same official link at build time.
 const xLink='<a class="zw-x-link" href="https://x.com/zasuworks" target="_blank" rel="noopener noreferrer" aria-label="X（旧Twitter）｜@zasuworks（新しいタブで開きます）">X（旧Twitter）｜@zasuworks</a>';
 if(/<footer\b/i.test(html))html=html.replace(/<footer\b[\s\S]*?<\/footer>/gi,footer=>{
  if(footer.includes('href="https://x.com/zasuworks"'))return footer;
  const navEnd=footer.lastIndexOf('</nav>');
  if(navEnd!==-1)return footer.slice(0,navEnd)+xLink+footer.slice(navEnd);
  return footer.replace('</footer>',`<p class="zw-social-link">${xLink}</p></footer>`);
 });
 else html=html.replace('</body>',`<footer class="zw-social-footer">${xLink}</footer></body>`);
 fs.writeFileSync(file,html);count++;
}
console.log(`Shared navigation built for ${count} public pages.`);

// Verified shipped files, not marketing version labels. One registry reused by the server.
export const RELEASES=Object.freeze({
 vocal:{bucket:'zasu-vocal-releases',version:'1.0.0',files:[['mac','ZASU-VOCAL-v1.0.0-macOS-Universal.dmg'],['windows','ZASU-VOCAL-v1.0.0-Windows-Setup.exe']]},
 loud:{bucket:'zasu-loud-releases',version:'2.0.0',files:[['mac','ZASU-LOUD-v2.0.0-macOS-Universal.dmg'],['windows','ZASU-LOUD-v2.0.0-Windows-Setup.exe']]},
 daw:{bucket:'zasu-daw-releases',version:'0.0.14',files:[['mac','ZASUDAW-0.0.14-macOS-Universal.dmg'],['windows','ZASU-DAW-v0.0.14-Windows-Setup.exe']]},
});
export const CATALOG=Object.freeze({
 vocal:{name:'ZASU VOCAL',status:'available',offline:true,platforms:['macOS','Windows'],salesVersion:'1.0.0',page:'/zasu-vocal/',note:'配布版 1.0.0。既存のオフライン利用を継続できます。'},
 loud:{name:'ZASU LOUD',status:'available',offline:true,platforms:['macOS','Windows'],salesVersion:'2.0.0',page:'/zasu-loud/',note:'配布版 2.0.0。以前の購入も最新配布版を取得できます。'},
 daw:{name:'ZASU DAW',status:'available',offline:true,platforms:['macOS','Windows'],salesVersion:'1.4',page:'/zasu-daw/',note:'販売表記 1.4 / 配布ファイル 0.0.14。アカウントはオフライン利用に不要です。'},
 finish:{name:'ZASU FINISH',status:'unverified',offline:null,platforms:[],page:null,note:'正式販売・配布情報を確認後に追加します。'},
});
export function ownedUpdates(purchases){const keys=new Set(purchases.filter(p=>p.status==='paid').flatMap(p=>p.products.map(x=>x.key)));return [...keys].filter(key=>RELEASES[key]&&CATALOG[key]).map(key=>({key,...CATALOG[key],version:RELEASES[key].version}));}

// Explicit provider title/price aliases; unknown SKUs never issue entitlements.
export const PURCHASE_OFFERS=[
 ['ZASU VOCAL v1.0.0',[3980],['vocal'],'1.0.0'],
 ['ZASU LOUD v1.1.2 for macOS',[2980],['loud'],'1.1.2'],
 ['ZASU LOUD v2.0.0',[2980],['loud'],'2.0.0'],
 ['ZASU DAW Beta｜Mac・Windows対応',[1980,2980],['daw'],'Beta'],
 ['ZASU DAW v1.4 正式版｜FOUNDING USER｜Mac・Windows対応',[1980,2980],['daw'],'1.4'],
 ['ZASU 歌ってみた制作セット',[5980],['vocal','loud'],'VOCAL 1.0.0 / LOUD 2.0.0'],
];

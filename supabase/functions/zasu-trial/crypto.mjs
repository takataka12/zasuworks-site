const encoder=new TextEncoder();
export const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export function unbase64url(value){if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value)||value.length%4===1)throw Error('invalid_encoding');return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),x=>x.charCodeAt(0));}
export const sha256=async value=>base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
export async function createSigner(jwk){
 if(!jwk||jwk.kty!=='RSA'||!jwk.d||unbase64url(jwk.n).length!==256||jwk.e!=='AQAB')throw Error('signer_not_configured');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const header=base64url(encoder.encode(JSON.stringify({alg:'RS256',typ:'ZASU-TRIAL',kid:'zasu-trial-1'})));
 return async claims=>{const message=header+'.'+base64url(encoder.encode(JSON.stringify(claims)));return message+'.'+base64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,encoder.encode(message))));};
}
export async function verifyLicense(value,jwk,product,now){try{
 if(typeof value!=='string'||value.length>4096)return null;
 const parts=value.split('.');if(parts.length!==3)return null;
 const h=JSON.parse(new TextDecoder().decode(unbase64url(parts[0])));
 if(h.alg!=='RS256'||h.typ!=='ZASU-TRIAL'||h.kid!=='zasu-trial-1')return null;
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,unbase64url(parts[2]),encoder.encode(parts[0]+'.'+parts[1])))return null;
 const c=JSON.parse(new TextDecoder().decode(unbase64url(parts[1])));
 if(c.iss!=='zasu-trial'||c.aud!==product||c.kind!=='trial'||c.v!==1||! /^[0-9a-f-]{36}$/.test(c.jti)||![c.nbf,c.iat,c.exp].every(Number.isSafeInteger)||c.nbf>c.iat||c.exp<=c.nbf||c.iat>now||now<c.nbf||now>=c.exp)return null;
 return c;
 }catch{return null;}}

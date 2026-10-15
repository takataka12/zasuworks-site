// Tab-local, bounded continuation state. Never store OTPs or transfer account tokens.
export const REQUEST_STORE='zasu.trial.request.v1';
export const ATTEMPT_STORE='zasu.account.auth-attempt.v1';
export const requestIdValid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const ttl=600000;
function read(storage,key){try{return JSON.parse(storage?.getItem(key)||'null')}catch{return null;}}
function write(storage,key,value){try{if(value===null)storage?.removeItem(key);else storage?.setItem(key,JSON.stringify(value));}catch{/* In-memory continuation still works when storage is unavailable. */}}
export function trialRequestState(storage,params,now=Date.now){
 let current=read(storage,REQUEST_STORE),reason='';
 function clear(){current=null;write(storage,REQUEST_STORE,null);}
 function get(){if(!current)return null;if(!requestIdValid(current.requestId)||!Number.isFinite(current.expiresAt)||current.expiresAt<=now()||current.expiresAt>now()+ttl){reason='expired';clear();return null;}return {requestId:current.requestId,expiresAt:current.expiresAt};}
 function set(value){if(!requestIdValid(value?.requestId)||!Number.isFinite(value.expiresAt)||value.expiresAt<=now()||value.expiresAt>now()+ttl)return false;current={requestId:value.requestId,expiresAt:value.expiresAt};reason='';write(storage,REQUEST_STORE,current);return true;}
 function capture(incoming){if(!incoming.has('trial_request'))return false;const id=incoming.get('trial_request');if(get()?.requestId===id)return true;if(!set({requestId:id,expiresAt:now()+ttl})){clear();reason='invalid';}return true;}
 if(!capture(params))get();
 return {get,set,clear,capture,reason:()=>reason};
}
export function authAttemptState(storage,now=Date.now){
 function clear(){write(storage,ATTEMPT_STORE,null);}
 function valid(v){return v&&requestIdValid(v.challengeId)&&['login','signup'].includes(v.purpose)&&(v.purpose!=='signup'||v.consent===true)&&typeof v.email==='string'&&v.email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)&&Number.isFinite(v.expiresAt)&&v.expiresAt>now()&&v.expiresAt<=now()+ttl&&Number.isFinite(v.resendAt)&&v.resendAt<=v.expiresAt;}
 return {clear,get(){const v=read(storage,ATTEMPT_STORE);if(!valid(v)){clear();return null;}return v;},set(v){if(!valid(v))return;write(storage,ATTEMPT_STORE,{challengeId:v.challengeId,email:v.email,purpose:v.purpose,consent:v.purpose==='signup'&&v.consent===true,expiresAt:v.expiresAt,resendAt:v.resendAt});}};
}

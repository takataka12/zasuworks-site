import {AudioError} from './audio.mjs';
export async function sha256(value,encoding='hex'){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));return encoding==='base64url'?btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''):[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');}
const random=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
const invalid=()=>{throw new AudioError('authentication_required')};
export function createAudioConnection({rpc}){return {
 async prepare(user,{challenge}){if(!/^[A-Za-z0-9_-]{43}$/.test(challenge||''))invalid();const code=random();if(!await rpc('account_audio_prepare',{p_user:user.id,p_session:user.sessionId,p_hash:await sha256(code),p_challenge:challenge}))invalid();return {code,expiresIn:60};},
 async exchange({code,verifier}){if(!/^[a-f0-9]{64}$/.test(code||'')||!/^[A-Za-z0-9_-]{43,128}$/.test(verifier||''))invalid();const token='zaa_'+random();const user=await rpc('account_audio_exchange',{p_hash:await sha256(code),p_challenge:await sha256(verifier,'base64url'),p_token_hash:await sha256(token)});if(!user)invalid();return {token,expiresIn:86400};},
 async authenticate(token){if(!/^zaa_[a-f0-9]{64}$/.test(token||''))return null;return rpc('account_audio_identity',{p_hash:await sha256(token)});},
 async disconnect(token){if(!/^zaa_[a-f0-9]{64}$/.test(token||''))invalid();await rpc('account_audio_disconnect',{p_hash:await sha256(token)});return {ok:true};}
};}

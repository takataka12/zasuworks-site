import {sha256} from './crypto.mjs';
const fail=code=>{throw Object.assign(Error(code),{code});};
export function createTrialService({rpc,sign,catalog,admins=[]}){return {
 async catalog(){return {products:await catalog()};},
 async begin({product,platform,challenge}){const requestId=await rpc('trial_begin',{p_product:product,p_platform:platform,p_challenge:challenge});return {requestId,expiresIn:600,interval:5,authorizeUrl:'https://zasuworks.jp/account/#trial_request='+encodeURIComponent(requestId)};},
 async inspect({requestId},user){return rpc('trial_request_info',{p_request:requestId,p_user:user.id,p_session:user.sessionId});},
 async approve({requestId},user){if(!await rpc('trial_approve',{p_request:requestId,p_user:user.id,p_session:user.sessionId}))fail('expired_request');return {ok:true};},
 async exchange({requestId,verifier}){
  if(!sign)throw Error('signer_not_configured');
  const grant=await rpc('trial_exchange',{p_request:requestId,p_challenge:await sha256(verifier)});
  if(grant.state!=='active')return grant;
  const seconds=value=>Math.floor(Date.parse(value)/1000);
  const claims={iss:'zasu-trial',aud:grant.product,kind:'trial',v:1,jti:grant.id,nbf:seconds(grant.startedAt),iat:seconds(grant.serverTime),exp:seconds(grant.expiresAt)};
  return {...grant,license:await sign(claims)};
 },
 async list(_body,user){return {...await rpc('trial_list',{p_user:user.id,p_session:user.sessionId}),canAdmin:admins.includes(user.id)};},
 async stats(_body,user){if(!admins.includes(user.id))fail('forbidden');return rpc('trial_stats',{p_actor:user.id});}
};}

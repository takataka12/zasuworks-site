// Private validation is available only on the existing isolated staging project.
export const validationOrigin='http://127.0.0.1:8765';
export const validationProject=url=>url==='https://giljyqaohutxoxlpkfjf.supabase.co';
export function wrapValidationAccount(adapter,allowed){return {...adapter,
 async request(b){return await allowed(b.email)?adapter.request(b):null;},
 async authenticate(token){const user=await adapter.authenticate(token);return user&&await allowed(user.email)?user:null;},
 async verify(id,code){const session=await adapter.verify(id,code);if(!session)return null;if(await allowed(session.user.email))return session;await adapter.logout(null,'local',session.access_token);return null;}
};}

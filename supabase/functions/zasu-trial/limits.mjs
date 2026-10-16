export function limits(action,requestId){
 // Each native activation can poll for all 600s at 5s intervals (120 calls).
 // Per-request buckets avoid NAT/other product instances sharing that budget.
 return action==='exchange'&&/^[0-9a-f-]{36}$/i.test(requestId||'')?{bucket:'exchange:'+requestId,limit:30,window:60}:{bucket:action,limit:action==='begin'?10:100,window:600};
}

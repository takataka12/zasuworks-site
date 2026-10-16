create function public.trial_request_info(p_request uuid,p_user uuid,p_session uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.trial_browser_requests%rowtype; p public.trial_products%rowtype; begin
 if not public.account_session_active(p_user,p_session) then raise exception 'authentication_required';end if;
 select * into r from public.trial_browser_requests where id=p_request;
 if not found or r.expires_at<=clock_timestamp() or (r.user_id is not null and r.user_id<>p_user) then raise exception 'expired_request';end if;
 select * into p from public.trial_products where product_key=r.product_key;
 return jsonb_build_object('product',p.product_key,'name',p.name,'released',p.released,'platform',r.platform,'purchased',public.trial_owned(p_user,p.product_key),'durationSeconds',p.duration_seconds);
end $$;
revoke all on function public.trial_request_info(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.trial_request_info(uuid,uuid,uuid) to service_role;

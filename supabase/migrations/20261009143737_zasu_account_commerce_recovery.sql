-- Private recovery credential stays in Vault. No service-role key is copied into SQL/logs.
create function public.commerce_recovery_authorized(p_key text) returns boolean
language sql security definer set search_path='' as $$
 select p_key is not null and length(p_key)<=128 and exists(select 1 from vault.decrypted_secrets where name='zasu_account_commerce_recovery_key' and decrypted_secret=p_key)
$$;
create function public.commerce_dispatch_recovery(p_url text) returns bigint
language plpgsql security definer set search_path='' as $$
declare recovery_key text; request_id bigint; begin
 if p_url !~ '^https://[a-z]{20}\.supabase\.co/functions/v1/zasu-account$' then raise exception 'invalid_recovery_endpoint'; end if;
 if not exists(select 1 from public.commerce_event_tasks where state<>'done' and attempts<8 and (lease_until is null or lease_until<now())) then return null; end if;
 select decrypted_secret into recovery_key from vault.decrypted_secrets where name='zasu_account_commerce_recovery_key';
 if recovery_key is null then raise exception 'recovery_not_configured'; end if;
 select net.http_post(url:=p_url,headers:=jsonb_build_object('Content-Type','application/json','x-zasu-commerce-key',recovery_key),body:='{"action":"commerce_replay"}'::jsonb,timeout_milliseconds:=60000) into request_id;
 return request_id;
end $$;
create function public.commerce_setup_recovery(p_url text) returns boolean
language plpgsql security definer set search_path='' as $$
declare desired text; current_command text; begin
 if p_url !~ '^https://[a-z]{20}\.supabase\.co/functions/v1/zasu-account$' then raise exception 'invalid_recovery_endpoint'; end if;
 perform pg_advisory_xact_lock(9043100914);
 if not exists(select 1 from vault.secrets where name='zasu_account_commerce_recovery_key') then
  perform vault.create_secret(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'zasu_account_commerce_recovery_key','ZASU ACCOUNT commerce recovery, internal only');
 end if;
 desired:=format('select public.commerce_dispatch_recovery(%L);',p_url);
 select command into current_command from cron.job where jobname='zasu-account-commerce-recovery-15m';
 if current_command is distinct from desired then perform cron.schedule('zasu-account-commerce-recovery-15m','*/15 * * * *',desired); end if;
 return true;
end $$;
revoke all on function public.commerce_recovery_authorized(text),public.commerce_dispatch_recovery(text),public.commerce_setup_recovery(text) from public,anon,authenticated;
grant execute on function public.commerce_recovery_authorized(text),public.commerce_dispatch_recovery(text),public.commerce_setup_recovery(text) to service_role;

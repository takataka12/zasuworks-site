-- Already applied to production through named Supabase migrations. Do not re-run.
alter table public.commerce_entitlements drop constraint commerce_entitlements_product_key_check;
alter table public.commerce_entitlements add constraint commerce_entitlements_product_key_check check(product_key in ('vocal','loud','daw','finish','vocal_editor'));
do $body$ declare definition text; begin
 select pg_get_functiondef('public.commerce_sync_order(jsonb,text)'::regprocedure) into definition;
 if position('array[''vocal'',''loud'',''daw'']' in definition)=0 then raise exception 'unexpected_commerce_function'; end if;
 execute replace(definition,'array[''vocal'',''loud'',''daw'']','array[''vocal'',''loud'',''daw'',''finish'',''vocal_editor'']');
end $body$;
create or replace function public.zasu_duo_dispatch_regular_price() returns bigint language plpgsql security definer set search_path='' as $$
declare request_id bigint; begin
 if now()<timestamptz '2026-10-31 15:00:00+00' or now()>=timestamptz '2026-11-02 15:00:00+00' then return null; end if;
 select net.http_post(url:='https://siwmzradvrtetotakkbi.supabase.co/functions/v1/zasu-duo-pricing',headers:=jsonb_build_object('Content-Type','application/json','x-zasu-commerce-key',(select decrypted_secret from vault.decrypted_secrets where name='zasu_account_commerce_recovery_key')),body:='{"action":"regular_price"}'::jsonb,timeout_milliseconds:=60000) into request_id;
 return request_id; end $$;
revoke all on function public.zasu_duo_dispatch_regular_price() from public,anon,authenticated;
grant execute on function public.zasu_duo_dispatch_regular_price() to service_role;
select cron.schedule('zasu-duo-regular-price-20261101','* * * * *','select public.zasu_duo_dispatch_regular_price();');

create function public.zasu_duo_regular_price_complete() returns boolean language plpgsql security definer set search_path='' as $$
begin
 if now()<timestamptz '2026-10-31 15:00:00+00' then return false; end if;
 perform cron.unschedule(jobid) from cron.job where jobname='zasu-duo-regular-price-20261101';
 return true; end $$;
revoke all on function public.zasu_duo_regular_price_complete() from public,anon,authenticated;
grant execute on function public.zasu_duo_regular_price_complete() to service_role;

-- Apply only in giljyqaohutxoxlpkfjf SQL Editor. All changes are atomic.
begin;
-- STAGING ONLY. Not part of production migrations. Insert no tester by default.
create table public.trial_validation_access(
 email text primary key check(email=lower(email)),
 expires_at timestamptz not null,
 product_key text not null default 'vocal' check(product_key='vocal')
);
alter table public.trial_validation_access enable row level security;
revoke all on public.trial_validation_access from public,anon,authenticated;
grant all on public.trial_validation_access to service_role;
create function public.trial_validation_email_allowed(p_email text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.trial_validation_access where email=lower(p_email) and expires_at>now());
$$;
create function public.trial_validation_allowed(p_user uuid,p_product text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.trial_validation_access a where a.product_key=p_product and a.expires_at>now()
 and (p_user is null or exists(select 1 from auth.users u where u.id=p_user and lower(u.email)=a.email)));
$$;
revoke all on function public.trial_validation_email_allowed(text),public.trial_validation_allowed(uuid,text) from public,anon,authenticated;
grant execute on function public.trial_validation_email_allowed(text),public.trial_validation_allowed(uuid,text) to service_role;
create or replace function public.trial_begin(p_product text,p_platform text,p_challenge text) returns uuid
language plpgsql security definer set search_path='' as $$
declare rid uuid; begin
 if p_platform not in ('mac','win') or p_challenge !~ '^[A-Za-z0-9_-]{43}$' or p_challenge is null then raise exception 'invalid_request'; end if;
 if not exists(select 1 from public.trial_products where product_key=p_product and (released or public.trial_validation_allowed(null,p_product))) then raise exception 'not_available'; end if;
 delete from public.trial_browser_requests where expires_at<clock_timestamp()-interval '1 day';
 insert into public.trial_browser_requests(product_key,platform,challenge) values(p_product,p_platform,p_challenge) returning id into rid;
 return rid;
end $$;

create or replace function public.trial_approve(p_request uuid,p_user uuid,p_session uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare r public.trial_browser_requests%rowtype; begin
 if not public.account_session_active(p_user,p_session) then return false; end if;
 select * into r from public.trial_browser_requests where id=p_request for update;
 if not found or r.expires_at<=clock_timestamp() or (r.user_id is not null and r.user_id<>p_user) then return false; end if;
 if not exists(select 1 from public.trial_products where product_key=r.product_key and (released or public.trial_validation_allowed(p_user,r.product_key))) then return false; end if;
 update public.trial_browser_requests set user_id=p_user,session_id=p_session,approved_at=coalesce(approved_at,clock_timestamp()) where id=p_request;
 return true;
end $$;

create or replace function public.trial_exchange(p_request uuid,p_challenge text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.trial_browser_requests%rowtype; g public.trial_grants%rowtype; p public.trial_products%rowtype; t timestamptz; begin
 select * into r from public.trial_browser_requests where id=p_request for update;
 if not found or p_challenge is null or r.challenge<>p_challenge then raise exception 'invalid_request'; end if;
 t:=clock_timestamp();
 if r.expires_at<=t then raise exception 'expired_request'; end if;
 select * into p from public.trial_products where product_key=r.product_key;
 if not p.released and not public.trial_validation_allowed(r.user_id,r.product_key) then raise exception 'not_available'; end if;
 if r.user_id is null then return jsonb_build_object('state','pending'); end if;
 if not public.account_session_active(r.user_id,r.session_id) then raise exception 'authentication_required'; end if;
 if public.trial_owned(r.user_id,r.product_key) then return jsonb_build_object('state','purchased','product',r.product_key); end if;
 -- Serialize issuance for the same account/product across separate browser requests.
 perform pg_advisory_xact_lock(hashtextextended(r.user_id::text||':'||r.product_key,0));
 t:=clock_timestamp();
 insert into public.trial_grants(user_id,product_key,started_at,expires_at,last_authenticated_at)
 values(r.user_id,r.product_key,t,t+make_interval(secs=>p.duration_seconds),t)
 on conflict(user_id,product_key) do update set last_authenticated_at=excluded.last_authenticated_at returning * into g;
 update public.trial_browser_requests set grant_id=g.id where id=p_request;
 return jsonb_build_object('state',case when g.state='revoked' then 'revoked' when g.expires_at<=t then 'expired' else 'active' end,
 'product',g.product_key,'id',g.id,'startedAt',g.started_at,'expiresAt',g.expires_at,'serverTime',t);
end $$;
create or replace function public.trial_request_info(p_request uuid,p_user uuid,p_session uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.trial_browser_requests%rowtype; p public.trial_products%rowtype; begin
 if not public.account_session_active(p_user,p_session) then raise exception 'authentication_required';end if;
 select * into r from public.trial_browser_requests where id=p_request;
 if not found or r.expires_at<=clock_timestamp() or (r.user_id is not null and r.user_id<>p_user) then raise exception 'expired_request';end if;
 select * into p from public.trial_products where product_key=r.product_key;
 return jsonb_build_object('product',p.product_key,'name',p.name,'released',p.released,'validationAllowed',public.trial_validation_allowed(p_user,r.product_key),'platform',r.platform,'purchased',public.trial_owned(p_user,p.product_key),'durationSeconds',p.duration_seconds);
end $$;

commit;

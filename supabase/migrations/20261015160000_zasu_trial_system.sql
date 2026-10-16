-- Additive only. Never modify a paid product, entitlement or account session.
create table public.trial_products(
 product_key text primary key check(product_key ~ '^[a-z][a-z0-9_]{0,39}$'),
 name text not null, duration_seconds integer not null default 604800 check(duration_seconds between 3600 and 2678400),
 released boolean not null default false,
 mac_url text, mac_sha256 text, win_url text, win_sha256 text,
 check(not released or (mac_url ~ '^https://[^[:space:]]+$' and win_url ~ '^https://[^[:space:]]+$' and mac_sha256 ~ '^[a-f0-9]{64}$' and win_sha256 ~ '^[a-f0-9]{64}$' and mac_url is not null and win_url is not null and mac_sha256 is not null and win_sha256 is not null))
);
insert into public.trial_products(product_key,name) values ('vocal','ZASU VOCAL'),('loud','ZASU LOUD'),('finish','ZASU FINISH'),('vocal_editor','ZASU VOCAL EDITOR'),('daw','ZASU DAW');
create table public.trial_grants(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.account_profiles(user_id) on delete restrict,
 product_key text not null references public.trial_products(product_key),
 started_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
 state text not null default 'active' check(state in ('active','revoked')),
 last_authenticated_at timestamptz not null default clock_timestamp(),
 unique(user_id,product_key), check(expires_at>started_at)
);
create table public.trial_browser_requests(
 id uuid primary key default gen_random_uuid(), product_key text not null references public.trial_products(product_key),
 platform text not null check(platform in ('mac','win')), challenge text not null check(challenge ~ '^[A-Za-z0-9_-]{43}$'),
 created_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null default clock_timestamp()+interval '10 minutes',
 user_id uuid references public.account_profiles(user_id) on delete restrict,
 session_id uuid references auth.sessions(id) on delete cascade,
 grant_id uuid references public.trial_grants(id), approved_at timestamptz
);
create index trial_browser_requests_expiry on public.trial_browser_requests(expires_at);
create index trial_grants_product_time on public.trial_grants(product_key,expires_at);
create table public.trial_admin_audit(id uuid primary key default gen_random_uuid(), actor_id uuid not null references public.account_profiles(user_id), action text not null check(action='stats'), created_at timestamptz not null default clock_timestamp());
alter table public.trial_products enable row level security;
alter table public.trial_grants enable row level security;
alter table public.trial_browser_requests enable row level security;
alter table public.trial_admin_audit enable row level security;
revoke all on public.trial_products,public.trial_grants,public.trial_browser_requests,public.trial_admin_audit from public,anon,authenticated;
grant all on public.trial_products,public.trial_grants,public.trial_browser_requests,public.trial_admin_audit to service_role;
grant select on public.trial_grants to authenticated;
create policy trial_grants_self on public.trial_grants for select to authenticated using(user_id=(select auth.uid()) and (select public.account_self_active()));

create function public.trial_owned(p_user uuid,p_product text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.commerce_entitlements e join public.commerce_orders o on o.id=e.order_id
 where o.owner_user_id=p_user and e.product_key=p_product and e.state='active' and o.status='paid');
$$;
create function public.trial_begin(p_product text,p_platform text,p_challenge text) returns uuid
language plpgsql security definer set search_path='' as $$
declare rid uuid; begin
 if p_platform not in ('mac','win') or p_challenge !~ '^[A-Za-z0-9_-]{43}$' or p_challenge is null then raise exception 'invalid_request'; end if;
 if not exists(select 1 from public.trial_products where product_key=p_product and released) then raise exception 'not_available'; end if;
 delete from public.trial_browser_requests where expires_at<clock_timestamp()-interval '1 day';
 insert into public.trial_browser_requests(product_key,platform,challenge) values(p_product,p_platform,p_challenge) returning id into rid;
 return rid;
end $$;
create function public.trial_approve(p_request uuid,p_user uuid,p_session uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare r public.trial_browser_requests%rowtype; begin
 if not public.account_session_active(p_user,p_session) then return false; end if;
 select * into r from public.trial_browser_requests where id=p_request for update;
 if not found or r.expires_at<=clock_timestamp() or (r.user_id is not null and r.user_id<>p_user) then return false; end if;
 if not exists(select 1 from public.trial_products where product_key=r.product_key and released) then return false; end if;
 update public.trial_browser_requests set user_id=p_user,session_id=p_session,approved_at=coalesce(approved_at,clock_timestamp()) where id=p_request;
 return true;
end $$;
create function public.trial_exchange(p_request uuid,p_challenge text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.trial_browser_requests%rowtype; g public.trial_grants%rowtype; p public.trial_products%rowtype; t timestamptz; begin
 select * into r from public.trial_browser_requests where id=p_request for update;
 if not found or p_challenge is null or r.challenge<>p_challenge then raise exception 'invalid_request'; end if;
 t:=clock_timestamp();
 if r.expires_at<=t then raise exception 'expired_request'; end if;
 select * into p from public.trial_products where product_key=r.product_key;
 if not p.released then raise exception 'not_available'; end if;
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
create function public.trial_list(p_user uuid,p_session uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not public.account_session_active(p_user,p_session) then raise exception 'authentication_required'; end if;
 return jsonb_build_object('serverTime',clock_timestamp(),'trials',coalesce((select jsonb_agg(jsonb_build_object('product',p.product_key,'name',p.name,'released',p.released,'startedAt',g.started_at,'expiresAt',g.expires_at,'purchased',public.trial_owned(p_user,p.product_key),'state',case when public.trial_owned(p_user,p.product_key) then 'purchased' when g.state='revoked' then 'revoked' when g.expires_at<=clock_timestamp() then 'expired' when g.id is not null then 'active' else 'not_started' end)) from public.trial_products p left join public.trial_grants g on g.product_key=p.product_key and g.user_id=p_user),'[]'::jsonb));
end $$;
create function public.trial_stats(p_actor uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 insert into public.trial_admin_audit(actor_id,action) values(p_actor,'stats');
 return (select jsonb_build_object('products',jsonb_agg(to_jsonb(s))) from (
 select p.product_key,count(g.id) as started,count(g.id) filter(where g.state='active' and g.expires_at>clock_timestamp()) as active,
 count(g.id) filter(where g.expires_at<=clock_timestamp()) as expired,count(g.id) filter(where g.state='revoked') as revoked,
 count(c.purchased_at) as converted,avg(extract(epoch from c.purchased_at-g.started_at)/86400.0) as average_days_to_purchase
 from public.trial_products p left join public.trial_grants g on g.product_key=p.product_key
 left join lateral(select min(o.purchased_at) as purchased_at from public.commerce_orders o join public.commerce_entitlements e on e.order_id=o.id
 where o.owner_user_id=g.user_id and e.product_key=p.product_key and o.status='paid' and e.state='active' and o.purchased_at>=g.started_at) c on true group by p.product_key) s);
end $$;
revoke all on function public.trial_owned(uuid,text),public.trial_begin(text,text,text),public.trial_approve(uuid,uuid,uuid),public.trial_exchange(uuid,text),public.trial_list(uuid,uuid),public.trial_stats(uuid) from public,anon,authenticated;
grant execute on function public.trial_owned(uuid,text),public.trial_begin(text,text,text),public.trial_approve(uuid,uuid,uuid),public.trial_exchange(uuid,text),public.trial_list(uuid,uuid),public.trial_stats(uuid) to service_role;

-- Additive account-only schema. Existing purchases, grants and functions are untouched.
create table public.account_profiles (
 user_id uuid primary key references auth.users(id) on delete restrict,
 display_name text not null default '' check (length(display_name)<=80),
 locale text not null default 'ja' check (locale in ('ja','en')),
 status text not null default 'active' check (status in ('active','closed')),
 privacy_version text not null,
 consented_at timestamptz not null default now(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), closed_at timestamptz
);
create table public.account_challenges (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 purpose text not null check(purpose in ('signup','login','close')),
 otp_digest text not null, token_hash text not null,
 consent_version text, expires_at timestamptz not null default now()+interval '10 minutes',
 attempts integer not null default 0 check(attempts between 0 and 5),
 consumed_at timestamptz, created_at timestamptz not null default now()
);
create index account_challenges_expiry on public.account_challenges(expires_at);
create table public.account_rate_limits (
 key text primary key, count integer not null, expires_at timestamptz not null
);
alter table public.account_profiles enable row level security;
alter table public.account_challenges enable row level security;
alter table public.account_rate_limits enable row level security;
revoke all on public.account_profiles,public.account_challenges,public.account_rate_limits from public,anon,authenticated;
grant all on public.account_profiles,public.account_challenges,public.account_rate_limits to service_role;

create function public.account_session_active(p_user_id uuid,p_session_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s join public.account_profiles p on p.user_id=s.user_id
 where s.id=p_session_id and s.user_id=p_user_id and p.status='active'
 and s.created_at>now()-interval '24 hours' and (s.not_after is null or s.not_after>now()));
$$;
revoke all on function public.account_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.account_session_active(uuid,uuid) to service_role;
-- Narrow client self-read uses a no-argument wrapper, never arbitrary identity/session IDs.
create function public.account_self_active()
returns boolean language sql stable security definer set search_path='' as $$
 select public.account_session_active(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid);
$$;
revoke all on function public.account_self_active() from public,anon;
grant execute on function public.account_self_active() to authenticated,service_role;
grant select on public.account_profiles to authenticated;
create policy account_profiles_self_read on public.account_profiles for select to authenticated
 using (user_id=(select auth.uid()) and (select public.account_self_active()));

create function public.account_find_identity(p_email text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',u.id,'status',p.status) from auth.users u
 left join public.account_profiles p on p.user_id=u.id where lower(u.email)=lower(p_email)
 and u.deleted_at is null limit 1;
$$;
create function public.account_consume_challenge(p_id uuid,p_digest text,p_purpose text,p_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.account_challenges%rowtype;
begin
 select * into c from public.account_challenges where id=p_id for update;
 if not found or c.consumed_at is not null or c.expires_at<=now() or c.attempts>=5 then return null; end if;
 if (p_purpose='authenticate' and c.purpose not in ('signup','login'))
 or (p_purpose='close' and (c.purpose<>'close' or c.user_id is distinct from p_user_id))
 or p_purpose not in ('authenticate','close') then return null; end if;
 update public.account_challenges set attempts=attempts+1 where id=p_id;
 if c.otp_digest<>p_digest then return null; end if;
 update public.account_challenges set consumed_at=now() where id=p_id;
 return jsonb_build_object('user_id',c.user_id,'purpose',c.purpose,'token_hash',c.token_hash,'consent_version',c.consent_version);
end;
$$;
create function public.account_rate_check(p_key text,p_limit integer,p_window integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if length(p_key)>180 or p_limit<1 or p_limit>100 or p_window<60 or p_window>3600 then return false; end if;
 insert into public.account_rate_limits(key,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_window))
 on conflict(key) do update set count=case when account_rate_limits.expires_at<=now() then 1 else least(account_rate_limits.count+1,101) end,
 expires_at=case when account_rate_limits.expires_at<=now() then now()+make_interval(secs=>p_window) else account_rate_limits.expires_at end returning count into n;
 delete from public.account_rate_limits where expires_at<now()-interval '1 day';
 delete from public.account_challenges where expires_at<now()-interval '1 day';
 return n<=p_limit;
end;
$$;
revoke all on function public.account_find_identity(text),public.account_consume_challenge(uuid,text,text,uuid),public.account_rate_check(text,integer,integer) from public,anon,authenticated;
grant execute on function public.account_find_identity(text),public.account_consume_challenge(uuid,text,text,uuid),public.account_rate_check(text,integer,integer) to service_role;

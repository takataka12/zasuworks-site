-- Bind access to challenges verified by ZASU ACCOUNT, not any native Auth session.
create table public.account_session_proofs (
 session_id uuid primary key references auth.sessions(id) on delete cascade,
 user_id uuid not null references public.account_profiles(user_id) on delete cascade,
 verified_at timestamptz not null default now()
);
create index account_session_proofs_user_id on public.account_session_proofs(user_id);
alter table public.account_session_proofs enable row level security;
revoke all on public.account_session_proofs from public,anon,authenticated;
grant all on public.account_session_proofs to service_role;
create or replace function public.account_session_active(p_user_id uuid,p_session_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s
 join public.account_profiles p on p.user_id=s.user_id
 join public.account_session_proofs v on v.session_id=s.id and v.user_id=s.user_id
 where s.id=p_session_id and s.user_id=p_user_id and p.status='active'
 and s.created_at>now()-interval '24 hours' and (s.not_after is null or s.not_after>now()));
$$;
create or replace function public.account_rate_check(p_key text,p_limit integer,p_window integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if length(p_key)>180 or p_limit<1 or p_limit>10000 or p_window<60 or p_window>86400 then return false; end if;
 insert into public.account_rate_limits(key,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_window))
 on conflict(key) do update set count=case when account_rate_limits.expires_at<=now() then 1 else least(account_rate_limits.count+1,10001) end,
 expires_at=case when account_rate_limits.expires_at<=now() then now()+make_interval(secs=>p_window) else account_rate_limits.expires_at end returning count into n;
 delete from public.account_rate_limits where expires_at<now()-interval '1 day';
 delete from public.account_challenges where expires_at<now()-interval '1 day';
 return n<=p_limit;
end;
$$;

-- Additive ownership projection. No existing AUDIO rows or entitlements are changed.
create table public.account_audio_links(
 kind text not null check(kind in ('mix','convert','master')),
 resource_id uuid not null,
 user_id uuid not null references public.account_profiles(user_id),
 evidence text not null check(evidence in ('job_capability','authenticated_creation')),
 created_at timestamptz not null default now(),
 primary key(kind,resource_id)
);
create index account_audio_links_user on public.account_audio_links(user_id,created_at desc);
alter table public.account_audio_links enable row level security;
revoke all on public.account_audio_links from public,anon,authenticated;
grant all on public.account_audio_links to service_role;
create function public.account_audio_claim(p_user uuid,p_session uuid,p_kind text,p_resource uuid,p_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare valid boolean; owner uuid;
begin
 if not public.account_session_active(p_user,p_session) or p_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 -- Lock canonical rows so token rotation/expiry cannot race the initial projection.
 if p_kind='mix' then
  select true into valid from public.vocal_mix_jobs where id=p_resource and access_token_hash=p_hash and expires_at>now() for update;
 elsif p_kind='convert' then
  select true into valid from public.convert_jobs where id=p_resource and access_token_hash=p_hash and expires_at>now() and source_type='upload' for update;
 else return false; end if;
 if valid is distinct from true or not public.account_session_active(p_user,p_session) then return false; end if;
 insert into public.account_audio_links(kind,resource_id,user_id,evidence) values(p_kind,p_resource,p_user,'job_capability') on conflict(kind,resource_id) do nothing;
 select user_id into owner from public.account_audio_links where kind=p_kind and resource_id=p_resource;
 return owner=p_user;
end;
$$;
revoke all on function public.account_audio_claim(uuid,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.account_audio_claim(uuid,uuid,text,uuid,text) to service_role;

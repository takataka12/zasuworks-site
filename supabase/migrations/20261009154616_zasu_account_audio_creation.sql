create table public.account_audio_uploads(
 upload_id uuid primary key references public.mix_uploads(id),
 user_id uuid not null references public.account_profiles(user_id),
 created_at timestamptz not null default now()
);
create index account_audio_uploads_user on public.account_audio_uploads(user_id);
alter table public.account_audio_uploads enable row level security;
revoke all on public.account_audio_uploads from public,anon,authenticated;
grant all on public.account_audio_uploads to service_role;
create function public.account_audio_bind_created(p_user uuid,p_session uuid,p_kind text,p_resource uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare valid boolean; owner uuid;
begin
 if not public.account_session_active(p_user,p_session) then return false; end if;
 if p_kind='master_upload' then
  select true into valid from public.mix_uploads where id=p_resource and created_at>now()-interval '2 minutes' for update;
  if valid is distinct from true then return false; end if;
  insert into public.account_audio_uploads(upload_id,user_id) values(p_resource,p_user) on conflict(upload_id) do nothing;
  select user_id into owner from public.account_audio_uploads where upload_id=p_resource;
 elsif p_kind='mix' then
  select true into valid from public.vocal_mix_jobs where id=p_resource and created_at>now()-interval '2 minutes' for update;
 elsif p_kind='convert' then
  select true into valid from public.convert_jobs where id=p_resource and created_at>now()-interval '2 minutes' and
  (source_type='upload' or (source_type='master_result' and exists(select 1 from public.master_jobs m join public.account_audio_uploads u on u.upload_id=m.upload_id where m.id=source_master_job_id and u.user_id=p_user))) for update;
 else return false; end if;
 if p_kind<>'master_upload' then
  if valid is distinct from true then return false; end if;
  insert into public.account_audio_links(kind,resource_id,user_id,evidence) values(p_kind,p_resource,p_user,'authenticated_creation') on conflict(kind,resource_id) do nothing;
  select user_id into owner from public.account_audio_links where kind=p_kind and resource_id=p_resource;
 end if;
 return owner=p_user and public.account_session_active(p_user,p_session);
end;
$$;
revoke all on function public.account_audio_bind_created(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.account_audio_bind_created(uuid,uuid,text,uuid) to service_role;

-- Query owned jobs directly: truncating upload IDs first can lose newer jobs.
create function public.account_audio_master_history(p_user uuid,p_session uuid)
returns setof public.master_jobs language sql stable security definer set search_path='' as $$
 select m.* from public.master_jobs m join public.account_audio_uploads u on u.upload_id=m.upload_id
 where u.user_id=p_user and public.account_session_active(p_user,p_session)
 order by m.created_at desc,m.id desc limit 100;
$$;
revoke all on function public.account_audio_master_history(uuid,uuid) from public,anon,authenticated;
grant execute on function public.account_audio_master_history(uuid,uuid) to service_role;

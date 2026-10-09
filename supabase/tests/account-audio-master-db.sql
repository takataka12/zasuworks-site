-- Synthetic transaction: never sends mail and leaves no users, sessions, profiles or challenges.
begin;
insert into auth.users(id,email,aud,role) values
 ('11111111-cccc-4111-8111-111111111111','phase3-master-db-test-a@example.invalid','authenticated','authenticated'),
 ('22222222-cccc-4222-8222-222222222222','phase3-master-db-test-b@example.invalid','authenticated','authenticated');
insert into auth.sessions(id,user_id,created_at) values
 ('33333333-cccc-4333-8333-333333333333','11111111-cccc-4111-8111-111111111111',now()),
 ('44444444-cccc-4444-8444-444444444444','22222222-cccc-4222-8222-222222222222',now());
insert into public.account_profiles(user_id,display_name,privacy_version) values
 ('11111111-cccc-4111-8111-111111111111','First','2026-10-09'),
 ('22222222-cccc-4222-8222-222222222222','Second','2026-10-09');
do $$ begin
 if public.account_session_active('11111111-cccc-4111-8111-111111111111','33333333-cccc-4333-8333-333333333333') then raise exception 'native_session_without_proof'; end if;
end $$;
insert into public.account_session_proofs(session_id,user_id) values
 ('33333333-cccc-4333-8333-333333333333','11111111-cccc-4111-8111-111111111111'),
 ('44444444-cccc-4444-8444-444444444444','22222222-cccc-4222-8222-222222222222');


do $$ declare app uuid:=gen_random_uuid();n bigint;upload uuid;j uuid;latest uuid;u uuid:='11111111-cccc-4111-8111-111111111111';s uuid:='33333333-cccc-4333-8333-333333333333';i int;c int;begin
 select coalesce(max(application_no),0)+10000 into n from public.beta_applications;
 insert into public.beta_applications(id,name,email,application_no) values(app,'Synthetic MASTER test','phase3-master@example.invalid',n);
 for i in 1..110 loop
  upload:=gen_random_uuid();j:=gen_random_uuid();
  insert into public.mix_uploads(id,application_id,application_no,email,original_name,object_path,bytes,status) values(upload,app,n,'phase3-master@example.invalid','synthetic.wav','synthetic/'||upload,3,'completed');
  if i=1 then
   if not public.account_audio_bind_created(u,s,'master_upload',upload) then raise exception 'new_master_binding_denied';end if;
   if public.account_audio_bind_created('22222222-cccc-4222-8222-222222222222','44444444-cccc-4444-8444-444444444444','master_upload',upload) then raise exception 'master_owner_stolen';end if;
  else insert into public.account_audio_uploads(upload_id,user_id) values(upload,u);end if;
  update public.mix_uploads set created_at=now()-make_interval(mins=>i) where id=upload;
  insert into public.master_jobs(id,upload_id,application_id,application_no,status,created_at) values(j,upload,app,n,'completed',now()-make_interval(secs=>case when i=110 then 0 else i end));
  if i=110 then latest:=j;end if;
 end loop;
 select count(*) into c from public.account_audio_master_history(u,s);if c<>100 then raise exception 'history_limit_wrong';end if;
 if not exists(select 1 from public.account_audio_master_history(u,s) where id=latest) then raise exception 'latest_job_omitted';end if;
 if exists(select 1 from public.account_audio_master_history('22222222-cccc-4222-8222-222222222222','44444444-cccc-4444-8444-444444444444')) then raise exception 'foreign_master_history';end if;
 update public.account_profiles set status='closed' where user_id=u;
 if exists(select 1 from public.account_audio_master_history(u,s)) then raise exception 'closed_master_history';end if;
end $$;
rollback;
select 'PASS: authenticated MASTER creation ownership, denied reassignment, newest of 110 uploads, history limit, foreign and closed-account access; fixtures rolled back' result;

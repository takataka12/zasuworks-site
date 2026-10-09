-- Synthetic transaction: never sends mail and leaves no users, sessions, profiles or challenges.
begin;
insert into auth.users(id,email,aud,role) values
 ('11111111-aaaa-4111-8111-111111111111','account-db-test-a@example.invalid','authenticated','authenticated'),
 ('22222222-aaaa-4222-8222-222222222222','account-db-test-b@example.invalid','authenticated','authenticated');
insert into auth.sessions(id,user_id,created_at) values
 ('33333333-aaaa-4333-8333-333333333333','11111111-aaaa-4111-8111-111111111111',now()),
 ('44444444-aaaa-4444-8444-444444444444','22222222-aaaa-4222-8222-222222222222',now());
insert into public.account_profiles(user_id,display_name,privacy_version) values
 ('11111111-aaaa-4111-8111-111111111111','First','2026-10-09'),
 ('22222222-aaaa-4222-8222-222222222222','Second','2026-10-09');
do $$ begin
 if public.account_session_active('11111111-aaaa-4111-8111-111111111111','33333333-aaaa-4333-8333-333333333333') then raise exception 'native_session_without_proof'; end if;
end $$;
insert into public.account_session_proofs(session_id,user_id) values
 ('33333333-aaaa-4333-8333-333333333333','11111111-aaaa-4111-8111-111111111111'),
 ('44444444-aaaa-4444-8444-444444444444','22222222-aaaa-4222-8222-222222222222');

insert into public.vocal_mix_jobs(id,access_token_hash,vocal_name,vocal_size_bytes,instrumental_name,instrumental_size_bytes,status) values('88888888-aaaa-4888-8888-888888888888',repeat('a',64),'synthetic.wav',1,'synthetic.wav',1,'completed');
insert into public.convert_jobs(id,access_token_hash,original_name,input_ext,input_size_bytes,output_format,status,source_type) values('99999999-aaaa-4999-8999-999999999999',repeat('b',64),'synthetic.wav','.wav',1,'wav','completed','upload');
do $$ declare u uuid:='11111111-aaaa-4111-8111-111111111111';s uuid:='33333333-aaaa-4333-8333-333333333333';j uuid:='88888888-aaaa-4888-8888-888888888888';v jsonb; begin
 if public.account_audio_claim(u,s,'mix',j,repeat('c',64)) then raise exception 'wrong_capability'; end if;
 if not public.account_audio_claim(u,s,'mix',j,repeat('a',64)) then raise exception 'valid_claim_denied'; end if;
 if not public.account_audio_claim(u,s,'mix',j,repeat('a',64)) then raise exception 'idempotent_claim_denied'; end if;
 if public.account_audio_claim('22222222-aaaa-4222-8222-222222222222','44444444-aaaa-4444-8444-444444444444','mix',j,repeat('a',64)) then raise exception 'ownership_stolen'; end if;
 if public.account_audio_claim(u,s,'master',j,repeat('a',64)) then raise exception 'weak_master_claim'; end if;
 update public.convert_jobs set expires_at=now()-interval '1 second' where id='99999999-aaaa-4999-8999-999999999999';
 if public.account_audio_claim(u,s,'convert','99999999-aaaa-4999-8999-999999999999',repeat('b',64)) then raise exception 'expired_claim'; end if;
 if not public.account_audio_prepare(u,s,repeat('c',64),repeat('d',43)) then raise exception 'prepare_failed'; end if;
 if public.account_audio_exchange(repeat('c',64),repeat('e',43),repeat('f',64)) is not null then raise exception 'wrong_pkce'; end if;
 v:=public.account_audio_exchange(repeat('c',64),repeat('d',43),repeat('f',64));
 if v->>'id' is distinct from u::text then raise exception 'wrong_identity'; end if;
 if public.account_audio_exchange(repeat('c',64),repeat('d',43),repeat('e',64)) is not null then raise exception 'code_replay'; end if;
 if public.account_audio_identity(repeat('f',64))->>'id' is distinct from u::text then raise exception 'connection_missing'; end if;
 perform public.account_audio_disconnect(repeat('f',64));
 if public.account_audio_identity(repeat('f',64)) is not null then raise exception 'disconnect_ignored'; end if;
 perform public.account_audio_prepare(u,s,repeat('a',64),repeat('d',43));
 perform public.account_audio_exchange(repeat('a',64),repeat('d',43),repeat('a',64));
 update public.account_profiles set status='closed' where user_id=u;
 if public.account_audio_identity(repeat('a',64)) is not null then raise exception 'closed_access'; end if;
 if public.account_audio_bind_created(u,s,'mix',j) then raise exception 'closed_bind'; end if;
end $$;
set local role authenticated;
do $$ begin
 begin perform count(*) from public.account_audio_links;raise exception 'direct_links_read';exception when insufficient_privilege then null;end;
 begin perform count(*) from public.account_audio_connections;raise exception 'direct_token_hash_read';exception when insufficient_privilege then null;end;
 begin perform public.account_audio_bind_created(gen_random_uuid(),gen_random_uuid(),'mix',gen_random_uuid());raise exception 'browser_bind';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: capability, unique ownership, replay, PKCE, expiry, disconnect, closure and private access; all fixtures rolled back' as result;

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
select set_config('request.jwt.claims','{"sub":"11111111-aaaa-4111-8111-111111111111","role":"authenticated","session_id":"33333333-aaaa-4333-8333-333333333333"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.account_profiles)<>1 then raise exception 'cross_user_read'; end if;
 if (select display_name from public.account_profiles)<>'First' then raise exception 'wrong_owner'; end if;
 begin insert into public.account_profiles(user_id,privacy_version) values(gen_random_uuid(),'bypass'); raise exception 'client_insert_allowed'; exception when insufficient_privilege then null; end;
 begin update public.account_profiles set status='closed'; raise exception 'client_update_allowed'; exception when insufficient_privilege then null; end;
 begin truncate public.account_profiles; raise exception 'client_truncate_allowed'; exception when insufficient_privilege then null; end;
 begin perform public.account_find_identity('account-db-test-b@example.invalid'); raise exception 'identity_rpc_allowed'; exception when insufficient_privilege then null; end;
 begin perform count(*) from public.account_session_proofs; raise exception 'proof_read_allowed'; exception when insufficient_privilege then null; end;
 begin perform count(*) from public.account_challenges; raise exception 'challenge_read_allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin begin perform count(*) from public.account_profiles; raise exception 'anonymous_profile_allowed'; exception when insufficient_privilege then null; end; end $$;
reset role;
insert into public.account_challenges(id,user_id,purpose,otp_digest,token_hash,consent_version) values
 ('55555555-aaaa-4555-8555-555555555555','11111111-aaaa-4111-8111-111111111111','signup','correct','synthetic','2026-10-09'),
 ('66666666-aaaa-4666-8666-666666666666','11111111-aaaa-4111-8111-111111111111','login','correct','synthetic',null),
 ('77777777-aaaa-4777-8777-777777777777','11111111-aaaa-4111-8111-111111111111','close','correct','synthetic',null);
do $$ declare r jsonb; i integer; begin
 if not public.account_session_active('11111111-aaaa-4111-8111-111111111111','33333333-aaaa-4333-8333-333333333333') then raise exception 'valid_session_rejected'; end if;
 if public.account_session_active('22222222-aaaa-4222-8222-222222222222','33333333-aaaa-4333-8333-333333333333') then raise exception 'foreign_session_accepted'; end if;
 r:=public.account_consume_challenge('55555555-aaaa-4555-8555-555555555555','correct','authenticate');
 if r->>'user_id'<>'11111111-aaaa-4111-8111-111111111111' or r->>'consent_version'<>'2026-10-09' then raise exception 'challenge_wrong_binding'; end if;
 if public.account_consume_challenge('55555555-aaaa-4555-8555-555555555555','correct','authenticate') is not null then raise exception 'otp_replay'; end if;
 for i in 1..5 loop if public.account_consume_challenge('66666666-aaaa-4666-8666-666666666666','wrong','authenticate') is not null then raise exception 'wrong_otp'; end if; end loop;
 if public.account_consume_challenge('66666666-aaaa-4666-8666-666666666666','correct','authenticate') is not null then raise exception 'attempt_limit'; end if;
 if public.account_consume_challenge('77777777-aaaa-4777-8777-777777777777','correct','authenticate') is not null then raise exception 'close_as_login'; end if;
 if public.account_consume_challenge('77777777-aaaa-4777-8777-777777777777','correct','close','22222222-aaaa-4222-8222-222222222222') is not null then raise exception 'close_foreign_user'; end if;
 update public.account_challenges set expires_at=now()-interval '1 second' where id='77777777-aaaa-4777-8777-777777777777';
 if public.account_consume_challenge('77777777-aaaa-4777-8777-777777777777','correct','close','11111111-aaaa-4111-8111-111111111111') is not null then raise exception 'expired_otp'; end if;
 if not public.account_rate_check('mail-day-test-rollback-only',1,86400) then raise exception 'mail_budget_first_denied'; end if;
 if public.account_rate_check('mail-day-test-rollback-only',1,86400) then raise exception 'mail_budget_bypass'; end if;
 if not public.account_rate_check('test-rollback-only',1,60) then raise exception 'first_rate_denied'; end if;
 if public.account_rate_check('test-rollback-only',1,60) then raise exception 'rate_limit_bypass'; end if;
 update auth.sessions set created_at=now()-interval '25 hours' where id='33333333-aaaa-4333-8333-333333333333';
 if public.account_session_active('11111111-aaaa-4111-8111-111111111111','33333333-aaaa-4333-8333-333333333333') then raise exception 'old_session_accepted'; end if;
 update auth.sessions set created_at=now() where id='33333333-aaaa-4333-8333-333333333333';
 update public.account_profiles set status='closed' where user_id='11111111-aaaa-4111-8111-111111111111';
 if public.account_session_active('11111111-aaaa-4111-8111-111111111111','33333333-aaaa-4333-8333-333333333333') then raise exception 'closed_account_accepted'; end if;
 update public.account_profiles set status='active' where user_id='11111111-aaaa-4111-8111-111111111111';
 delete from auth.sessions where id='33333333-aaaa-4333-8333-333333333333';
 if public.account_session_active('11111111-aaaa-4111-8111-111111111111','33333333-aaaa-4333-8333-333333333333') then raise exception 'revoked_session_accepted'; end if;
end $$;
set local role authenticated;
do $$ begin if (select count(*) from public.account_profiles)<>0 then raise exception 'revoked_token_rls_read'; end if; end $$;
reset role;
rollback;
select 'PASS: own-profile RLS, denied DML/TRUNCATE/RPC, OTP binding/replay/attempts/expiry, independent rate limit, old/closed/revoked session; all fixtures rolled back' as result;

begin;
insert into auth.users(id,email,aud,role) values ('11111111-aaaa-4111-8111-111111111111','trial-test-a@example.invalid','authenticated','authenticated'),('22222222-aaaa-4222-8222-222222222222','trial-test-b@example.invalid','authenticated','authenticated');
insert into auth.sessions(id,user_id,created_at) values('33333333-aaaa-4333-8333-333333333333','11111111-aaaa-4111-8111-111111111111',now()),('44444444-aaaa-4444-8444-444444444444','22222222-aaaa-4222-8222-222222222222',now());
insert into public.account_profiles(user_id,privacy_version) values('11111111-aaaa-4111-8111-111111111111','2026-10-09'),('22222222-aaaa-4222-8222-222222222222','2026-10-09');
insert into public.account_session_proofs(session_id,user_id) values('33333333-aaaa-4333-8333-333333333333','11111111-aaaa-4111-8111-111111111111'),('44444444-aaaa-4444-8444-444444444444','22222222-aaaa-4222-8222-222222222222');
delete from public.trial_validation_access;
do $$ begin
 begin perform public.trial_begin('vocal','mac',repeat('a',43));raise exception 'no_test_access_allowed';exception when raise_exception then if sqlerrm<>'not_available' then raise;end if;end;
end $$;
insert into public.trial_validation_access(email,expires_at) values('trial-test-a@example.invalid',clock_timestamp()+interval '1 hour');
do $$ declare u uuid:='11111111-aaaa-4111-8111-111111111111';s uuid:='33333333-aaaa-4333-8333-333333333333';r uuid;g jsonb;h jsonb;begin
 if exists(select 1 from public.trial_products where released) then raise exception 'public_release_changed';end if;
 if public.trial_validation_email_allowed('trial-test-b@example.invalid') then raise exception 'wrong_email_allowed';end if;
 r:=public.trial_begin('vocal','mac',repeat('a',43));
 if public.trial_exchange(r,repeat('a',43))->>'state'<>'pending' then raise exception 'not_pending';end if;
 if public.trial_approve(r,'22222222-aaaa-4222-8222-222222222222','44444444-aaaa-4444-8444-444444444444') then raise exception 'wrong_tester_approved';end if;
 if not (public.trial_request_info(r,u,s)->>'validationAllowed')::boolean then raise exception 'private_preview_denied';end if;
 if (public.trial_request_info(r,u,s)->>'released')::boolean then raise exception 'preview_claims_public_release';end if;
 if not public.trial_approve(r,u,s) then raise exception 'allowed_tester_denied';end if;
 g:=public.trial_exchange(r,repeat('a',43));h:=public.trial_exchange(r,repeat('a',43));
 if g->>'state'<>'active' or extract(epoch from (g->>'expiresAt')::timestamptz-(g->>'startedAt')::timestamptz)<>604800 then raise exception 'invalid_168h';end if;
 if g->>'id'<>h->>'id' or g->>'expiresAt'<>h->>'expiresAt' then raise exception 'retry_extends_trial';end if;
 begin perform public.trial_begin('loud','win',repeat('b',43));raise exception 'unapproved_product_allowed';exception when raise_exception then if sqlerrm<>'not_available' then raise;end if;end;
 update public.trial_validation_access set expires_at=clock_timestamp()-interval '1 second';
 if public.trial_validation_email_allowed('trial-test-a@example.invalid') then raise exception 'expired_access_allowed';end if;
 begin perform public.trial_exchange(r,repeat('a',43));raise exception 'expired_test_access_issued';exception when raise_exception then if sqlerrm<>'not_available' then raise;end if;end;
end $$;
set local role authenticated;
do $$ begin
 begin perform count(*) from public.trial_validation_access;raise exception 'tester_table_exposed';exception when insufficient_privilege then null;end;
 begin perform public.trial_validation_email_allowed('trial-test-a@example.invalid');raise exception 'tester_rpc_exposed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: private tester gate, unpublished flag, exact 168h, idempotency, other product denied, expiry, private table/RPC. Fixtures rolled back.' as result;

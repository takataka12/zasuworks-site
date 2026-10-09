begin;
insert into auth.users(id,email,aud,role) values
 ('11111111-bbbb-4111-8111-111111111111','commerce-db-a@example.invalid','authenticated','authenticated'),
 ('22222222-bbbb-4222-8222-222222222222','commerce-db-b@example.invalid','authenticated','authenticated');
insert into auth.sessions(id,user_id,created_at) values
 ('33333333-bbbb-4333-8333-333333333333','11111111-bbbb-4111-8111-111111111111',now()),
 ('44444444-bbbb-4444-8444-444444444444','22222222-bbbb-4222-8222-222222222222',now());
insert into public.account_profiles(user_id,privacy_version) values
 ('11111111-bbbb-4111-8111-111111111111','2026-10-09'),('22222222-bbbb-4222-8222-222222222222','2026-10-09');
insert into public.account_session_proofs(session_id,user_id) values
 ('33333333-bbbb-4333-8333-333333333333','11111111-bbbb-4111-8111-111111111111'),
 ('44444444-bbbb-4444-8444-444444444444','22222222-bbbb-4222-8222-222222222222');
-- This behavioral contract is intentionally written before the migration.
do $$ declare oid uuid; r jsonb; i int; a uuid:='11111111-bbbb-4111-8111-111111111111'; b uuid:='22222222-bbbb-4222-8222-222222222222'; sa uuid:='33333333-bbbb-4333-8333-333333333333'; sb uuid:='44444444-bbbb-4444-8444-444444444444'; c uuid:='55555555-bbbb-4555-8555-555555555555'; begin
 oid:=public.commerce_sync_order('{"orderId":"CommerceTestOrder123456789","offer":{"title":"ZASU 歌ってみた制作セット","version":"VOCAL 1.0.0 / LOUD 2.0.0"},"products":["vocal","loud"],"amount":5980,"status":"paid","currency":"JPY","purchasedAt":"2026-10-09T00:00:00Z","verifiedAt":"2026-10-09T00:01:00Z","payments":[{"id":"CommerceTestPayment123456789","amount":5980,"status":"COMPLETED"}]}','buyer-hash');
 if (select count(*) from public.commerce_entitlements where order_id=oid)<>0 then raise exception 'unclaimed_grant'; end if;
 if not public.commerce_begin_claim(c,oid,a,sa,'correct','buyer-hash') then raise exception 'begin_failed'; end if;
 if public.commerce_finish_claim(c,b,sb,'correct','buyer-hash') then raise exception 'foreign_claim'; end if;
 if not public.commerce_finish_claim(c,a,sa,'correct','buyer-hash') then raise exception 'valid_claim_failed'; end if;
 if public.commerce_finish_claim(c,a,sa,'correct','buyer-hash') then raise exception 'claim_replay'; end if;
 if (select count(*) from public.commerce_entitlements where order_id=oid and state='active')<>2 then raise exception 'bundle_not_atomic'; end if;
 if public.commerce_begin_claim(gen_random_uuid(),oid,b,sb,'correct','buyer-hash') then raise exception 'owner_theft'; end if;
 if (select owner_user_id from public.commerce_orders where id=oid)<>a then raise exception 'wrong_owner'; end if;
 -- Definitive refund never returns to active following an older/inconsistent event.
 perform public.commerce_sync_order('{"orderId":"CommerceTestOrder123456789","offer":{"title":"ZASU 歌ってみた制作セット","version":"VOCAL 1.0.0 / LOUD 2.0.0"},"products":["vocal","loud"],"amount":5980,"status":"refunded","currency":"JPY","purchasedAt":"2026-10-09T00:00:00Z","verifiedAt":"2026-10-09T00:02:00Z","payments":[{"id":"CommerceTestPayment123456789","amount":5980,"status":"COMPLETED"}]}','buyer-hash');
 perform public.commerce_sync_order('{"orderId":"CommerceTestOrder123456789","offer":{"title":"ZASU 歌ってみた制作セット","version":"VOCAL 1.0.0 / LOUD 2.0.0"},"products":["vocal","loud"],"amount":5980,"status":"paid","currency":"JPY","purchasedAt":"2026-10-09T00:00:00Z","verifiedAt":"2026-10-09T00:03:00Z","payments":[{"id":"CommerceTestPayment123456789","amount":5980,"status":"COMPLETED"}]}','buyer-hash');
 if (select count(*) from public.commerce_entitlements where order_id=oid and state='active')<>0 then raise exception 'refund_reactivated'; end if;
 -- Even a later pending refund followed by paid cannot erase a definitive refund.
 update public.commerce_orders set verified_at='2026-10-09T00:02:00Z' where id=oid;
 perform public.commerce_sync_order('{"orderId":"CommerceTestOrder123456789","offer":{"title":"ZASU 歌ってみた制作セット","version":"VOCAL 1.0.0 / LOUD 2.0.0"},"products":["vocal","loud"],"amount":5980,"status":"refund_pending","currency":"JPY","purchasedAt":"2026-10-09T00:00:00Z","verifiedAt":"2026-10-09T00:04:00Z","payments":[]}','buyer-hash');
 if (select status from public.commerce_orders where id=oid)<>'refunded' then raise exception 'definitive_refund_downgraded'; end if;


 -- Separate synthetic order for expiry/resend/attempt and temporary refund recovery.
 oid:=public.commerce_sync_order('{"orderId":"CommerceSecondOrder123456789","offer":{"title":"ZASU VOCAL v1.0.0","version":"1.0.0"},"products":["vocal"],"amount":3980,"status":"paid","currency":"JPY","purchasedAt":"2026-10-09T00:00:00Z","verifiedAt":"2026-10-09T00:01:00Z","payments":[{"id":"CommerceSecondPayment123456789","amount":3980,"status":"COMPLETED"}]}','buyer-hash');
 c:='66666666-bbbb-4666-8666-666666666666';
 if not public.commerce_begin_claim(c,oid,a,sa,'correct','buyer-hash') then raise exception 'expiry_begin'; end if;
 update public.purchase_claims set expires_at=now()-interval '1 second',created_at=now()-interval '61 seconds' where id=c;
 if public.commerce_finish_claim(c,a,sa,'correct','buyer-hash') then raise exception 'expired_claim'; end if;
 c:='77777777-bbbb-4777-8777-777777777777';
 if not public.commerce_begin_claim(c,oid,a,sa,'correct','buyer-hash') then raise exception 'attempt_begin'; end if;
 for i in 1..5 loop if public.commerce_finish_claim(c,a,sa,'wrong','buyer-hash') then raise exception 'wrong_claim_code'; end if; end loop;
 if public.commerce_finish_claim(c,a,sa,'correct','buyer-hash') then raise exception 'attempts_exhausted_bypass'; end if;
 update public.purchase_claims set created_at=now()-interval '61 seconds' where id=c;
 c:='88888888-bbbb-4888-8888-888888888888';
 if not public.commerce_begin_claim(c,oid,a,sa,'correct','buyer-hash') then raise exception 'resend_begin'; end if;
 if public.commerce_begin_claim(gen_random_uuid(),oid,a,sa,'correct','buyer-hash') then raise exception 'resend_too_soon'; end if;
 update public.purchase_claims set created_at=now()-interval '61 seconds' where id=c;
 if not public.commerce_begin_claim('99999999-bbbb-4999-8999-999999999999',oid,a,sa,'new','buyer-hash') then raise exception 'resend_new'; end if;
 if public.commerce_finish_claim(c,a,sa,'correct','buyer-hash') then raise exception 'invalidated_old_claim'; end if;
 update public.account_profiles set status='closed' where user_id=a;
 if public.commerce_finish_claim('99999999-bbbb-4999-8999-999999999999',a,sa,'new','buyer-hash') then raise exception 'closed_claim'; end if;
 update public.account_profiles set status='active' where user_id=a;
 if not public.commerce_finish_claim('99999999-bbbb-4999-8999-999999999999',a,sa,'new','buyer-hash') then raise exception 'resend_finish'; end if;
 perform public.commerce_sync_order('{"orderId":"CommerceSecondOrder123456789","offer":{"title":"ZASU VOCAL v1.0.0","version":"1.0.0"},"products":["vocal"],"amount":3980,"status":"refund_pending","currency":"JPY","purchasedAt":"2026-10-09T00:00:00Z","verifiedAt":"2026-10-09T00:02:00Z","payments":[]}','buyer-hash');
 if (select state from public.commerce_entitlements where order_id=oid)<>'suspended' then raise exception 'pending_refund_active'; end if;
 perform public.commerce_sync_order('{"orderId":"CommerceSecondOrder123456789","offer":{"title":"ZASU VOCAL v1.0.0","version":"1.0.0"},"products":["vocal"],"amount":3980,"status":"paid","currency":"JPY","purchasedAt":"2026-10-09T00:00:00Z","verifiedAt":"2026-10-09T00:03:00Z","payments":[]}','buyer-hash');
 if (select state from public.commerce_entitlements where order_id=oid)<>'active' then raise exception 'failed_refund_not_restored'; end if;
 r:=public.commerce_lease_event('commerce-fixture-event','payment.updated','CommerceSecondPayment123456789');
 if r->>'token' is null then raise exception 'event_lease'; end if;
 if public.commerce_lease_event('commerce-fixture-event','payment.updated','CommerceSecondPayment123456789')->>'busy'<>'true' then raise exception 'duplicate_lease'; end if;
 if not public.commerce_finish_event('commerce-fixture-event',(r->>'token')::uuid,false) then raise exception 'fail_event'; end if;
 r:=public.commerce_lease_event('commerce-fixture-event','payment.updated','CommerceSecondPayment123456789');
 if not public.commerce_finish_event('commerce-fixture-event',(r->>'token')::uuid,true) then raise exception 'retry_event'; end if;
 if public.commerce_lease_event('commerce-fixture-event','payment.updated','CommerceSecondPayment123456789')->>'done'<>'true' then raise exception 'done_event_replay'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"11111111-bbbb-4111-8111-111111111111","role":"authenticated","session_id":"33333333-bbbb-4333-8333-333333333333"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.commerce_orders)<>2 then raise exception 'own_history_missing'; end if;
 if (select count(*) from public.commerce_payments)<>2 then raise exception 'own_payment_missing'; end if;
 if (select count(*) from public.commerce_entitlements)<>3 then raise exception 'own_grants_missing'; end if;
 begin update public.commerce_orders set status='paid'; raise exception 'client_dml'; exception when insufficient_privilege then null; end;
 begin truncate public.commerce_entitlements; raise exception 'client_truncate'; exception when insufficient_privilege then null; end;
 begin perform count(*) from public.purchase_claims; raise exception 'claim_leak'; exception when insufficient_privilege then null; end;
 begin perform public.commerce_finish_claim(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'x','x'); raise exception 'client_claim_rpc'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"22222222-bbbb-4222-8222-222222222222","role":"authenticated","session_id":"44444444-bbbb-4444-8444-444444444444"}',true);
set local role authenticated;
do $$ begin if (select count(*) from public.commerce_orders)<>0 or (select count(*) from public.commerce_payments)<>0 or (select count(*) from public.commerce_entitlements)<>0 then raise exception 'cross_user_history'; end if; end $$;
reset role;
rollback;
select 'PASS: purchase claim binding, replay, ownership lock, bundle transaction, sticky/temporary refund, expiry/resend/attempt cap, closed session, event retry/lease, RLS and role denial; fixtures rolled back' as result;

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
do $$ declare oid uuid; snap jsonb; key text; begin
 for key in select unnest(array['finish','vocal_editor']) loop
  snap:=jsonb_build_object('orderId','DuoFixtureOrder123456789_'||key,'offer',jsonb_build_object('title',case when key='finish' then 'ZASU FINISH v1.0.0' else 'ZASU VOCAL EDITOR v0.3.0' end,'version',case when key='finish' then '1.0.0' else '0.3.0' end),'products',jsonb_build_array(key),'amount',case when key='finish' then 1980 else 2980 end,'currency','JPY','status','paid','purchasedAt','2026-10-13T00:00:00Z','verifiedAt','2026-10-13T00:01:00Z','payments',jsonb_build_array(jsonb_build_object('id','DuoFixturePayment123456789_'||key,'amount',case when key='finish' then 1980 else 2980 end,'status','COMPLETED')));
  oid:=public.commerce_sync_order(snap,'duo-fixture-email');
  if not public.commerce_begin_claim('55555555-bbbb-4555-8555-555555555555',oid,'11111111-bbbb-4111-8111-111111111111','33333333-bbbb-4333-8333-333333333333','fixture-code','duo-fixture-email') then raise exception 'claim_start_failed'; end if;
  if not public.commerce_finish_claim('55555555-bbbb-4555-8555-555555555555','11111111-bbbb-4111-8111-111111111111','33333333-bbbb-4333-8333-333333333333','fixture-code','duo-fixture-email') then raise exception 'claim_finish_failed'; end if;
  perform public.commerce_sync_order(snap,'duo-fixture-email');perform public.commerce_sync_order(snap,'duo-fixture-email');
  if (select count(*) from public.commerce_entitlements where order_id=oid and product_key=key and state='active')<>1 then raise exception 'duplicate_or_missing_grant'; end if;
  delete from public.purchase_claims where id='55555555-bbbb-4555-8555-555555555555';
 end loop;
end $$;
rollback;
select 'PASS: both products claim correctly; repeated order sync creates one grant; fixtures rolled back' as result;

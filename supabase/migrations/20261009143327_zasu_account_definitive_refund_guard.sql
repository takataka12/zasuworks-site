create or replace function public.commerce_sync_order(p_snapshot jsonb,p_email_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare o public.commerce_orders; keys text[]; p jsonb; next_status text; begin
 if p_snapshot->>'orderId' !~ '^[A-Za-z0-9_-]{16,192}$' or p_snapshot->>'currency'<>'JPY' or p_snapshot->>'status' not in ('paid','pending','refund_pending','refunded','review','void') then raise exception 'invalid_snapshot'; end if;
 select array_agg(value order by value) into keys from jsonb_array_elements_text(p_snapshot->'products');
 if keys is null or cardinality(keys)<1 or cardinality(keys)>2 or not keys <@ array['vocal','loud','daw'] or (select count(distinct x) from unnest(keys) x)<>cardinality(keys) then raise exception 'invalid_products'; end if;
 insert into public.commerce_orders(external_order_id,title,purchased_version,product_keys,amount_minor,currency,status,buyer_email_hash,purchased_at,verified_at)
 values(p_snapshot->>'orderId',p_snapshot->'offer'->>'title',p_snapshot->'offer'->>'version',keys,(p_snapshot->>'amount')::bigint,'JPY',p_snapshot->>'status',p_email_hash,(p_snapshot->>'purchasedAt')::timestamptz,(p_snapshot->>'verifiedAt')::timestamptz)
 on conflict(external_order_id) do nothing;
 select * into o from public.commerce_orders where external_order_id=p_snapshot->>'orderId' for update;
 if o.verified_at>(p_snapshot->>'verifiedAt')::timestamptz then return o.id; end if;
 next_status:=p_snapshot->>'status';
 if o.title<>p_snapshot->'offer'->>'title' or o.amount_minor<>(p_snapshot->>'amount')::bigint or o.product_keys<>keys or o.purchased_version<>p_snapshot->'offer'->>'version' then next_status:='review'; end if;
 -- A completed or ambiguous refund requires audited support to restore; never a later paid event.
 if o.status in ('refunded','void') then next_status:=o.status;
 elsif o.status='review' and next_status not in ('refunded','void') then next_status:='review'; end if;
 update public.commerce_orders set status=next_status,buyer_email_hash=p_email_hash,verified_at=(p_snapshot->>'verifiedAt')::timestamptz,updated_at=now() where id=o.id;
 for p in select value from jsonb_array_elements(p_snapshot->'payments') loop
  insert into public.commerce_payments(external_payment_id,order_id,amount_minor,status)
  values(p->>'id',o.id,(p->>'amount')::bigint,p->>'status')
  on conflict(external_payment_id) do update set status=excluded.status where public.commerce_payments.order_id=excluded.order_id;
  if not found then raise exception 'payment_owner_conflict'; end if;
 end loop;
 if o.owner_user_id is not null then
  insert into public.commerce_entitlements(order_id,product_key,state)
  select o.id,k,case when next_status='paid' then 'active' when next_status in ('refunded','void') then 'revoked' else 'suspended' end from unnest(o.product_keys) k
  on conflict(order_id,product_key) do update set state=excluded.state,updated_at=now();
 end if;
 return o.id;
end $$;


-- Invalid or structurally changed provider order: suspend only its own account grants.
create function public.commerce_quarantine_order(p_external_order text) returns void
language plpgsql security definer set search_path='' as $$
declare oid uuid; begin
 select id into oid from public.commerce_orders where external_order_id=p_external_order for update;
 if not found then return; end if;
 update public.commerce_orders set status=case when status in ('refunded','void') then status else 'review' end,updated_at=now() where id=oid;
 update public.commerce_entitlements set state=case when state='revoked' then state else 'suspended' end,updated_at=now() where order_id=oid;
end $$;
revoke all on function public.commerce_quarantine_order(text) from public,anon,authenticated;
grant execute on function public.commerce_quarantine_order(text) to service_role;

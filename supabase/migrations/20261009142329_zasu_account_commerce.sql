-- Additive commerce foundation. Existing fulfillment/guest rights are untouched.
create table public.commerce_orders(
 id uuid primary key default gen_random_uuid(), provider text not null default 'square' check(provider='square'),
 external_order_id text not null unique, owner_user_id uuid references public.account_profiles(user_id) on delete set null,
 title text not null, purchased_version text not null, product_keys text[] not null,
 amount_minor bigint not null check(amount_minor>=0), currency text not null check(currency='JPY'),
 status text not null check(status in ('paid','pending','refund_pending','refunded','review','void')),
 buyer_email_hash text, purchased_at timestamptz not null, verified_at timestamptz not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index commerce_orders_owner on public.commerce_orders(owner_user_id,purchased_at desc);
create table public.commerce_payments(
 external_payment_id text primary key,order_id uuid not null references public.commerce_orders(id) on delete restrict,
 amount_minor bigint not null check(amount_minor>=0),status text not null
);
create index commerce_payments_order on public.commerce_payments(order_id);
create table public.commerce_entitlements(
 order_id uuid not null references public.commerce_orders(id) on delete restrict,
 product_key text not null check(product_key in ('vocal','loud','daw')),
 state text not null check(state in ('active','suspended','revoked')),updated_at timestamptz not null default now(),
 primary key(order_id,product_key)
);
create table public.purchase_claims(
 id uuid primary key, order_id uuid not null references public.commerce_orders(id) on delete restrict,
 user_id uuid not null references public.account_profiles(user_id) on delete restrict,
 session_id uuid not null references auth.sessions(id) on delete cascade,
 code_hash text not null, buyer_email_hash text not null, attempts int not null default 0 check(attempts between 0 and 5),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '10 minutes',
 consumed_at timestamptz,invalidated_at timestamptz
);
create index purchase_claims_order_user on public.purchase_claims(order_id,user_id,created_at desc);
create index purchase_claims_session on public.purchase_claims(session_id);
create index purchase_claims_user on public.purchase_claims(user_id);
create table public.commerce_event_tasks(
 event_id text primary key,event_type text not null,payment_id text not null,
 state text not null default 'pending' check(state in ('pending','working','done','failed')),
 attempts int not null default 0, lease_until timestamptz, lease_token uuid,
 error_code text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index commerce_event_tasks_pending on public.commerce_event_tasks(state,lease_until);

alter table public.commerce_orders enable row level security;
alter table public.commerce_payments enable row level security;
alter table public.commerce_entitlements enable row level security;
alter table public.purchase_claims enable row level security;
alter table public.commerce_event_tasks enable row level security;
revoke all on public.commerce_orders,public.commerce_payments,public.commerce_entitlements,public.purchase_claims,public.commerce_event_tasks from public,anon,authenticated;
grant all on public.commerce_orders,public.commerce_payments,public.commerce_entitlements,public.purchase_claims,public.commerce_event_tasks to service_role;
grant select on public.commerce_orders,public.commerce_payments,public.commerce_entitlements to authenticated;
create policy commerce_own_orders on public.commerce_orders for select to authenticated using(owner_user_id=(select auth.uid()) and (select public.account_self_active()));
create policy commerce_own_payments on public.commerce_payments for select to authenticated using(exists(select 1 from public.commerce_orders o where o.id=order_id and o.owner_user_id=(select auth.uid())) and (select public.account_self_active()));
create policy commerce_own_entitlements on public.commerce_entitlements for select to authenticated using(exists(select 1 from public.commerce_orders o where o.id=order_id and o.owner_user_id=(select auth.uid())) and (select public.account_self_active()));

create function public.commerce_sync_order(p_snapshot jsonb,p_email_hash text) returns uuid
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
 if o.status in ('refunded','review','void') and next_status='paid' then next_status:=o.status; end if;
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

create function public.commerce_begin_claim(p_id uuid,p_order uuid,p_user uuid,p_session uuid,p_hash text,p_email_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare o public.commerce_orders; begin
 if not public.account_session_active(p_user,p_session) then return false; end if;
 select * into o from public.commerce_orders where id=p_order for update;
 if not found or o.status<>'paid' or o.owner_user_id is not null or p_email_hash is null or o.buyer_email_hash is distinct from p_email_hash then return false; end if;
 if exists(select 1 from public.purchase_claims where order_id=p_order and user_id=p_user and created_at>now()-interval '60 seconds') then return false; end if;
 update public.purchase_claims set invalidated_at=now() where order_id=p_order and user_id=p_user and consumed_at is null and invalidated_at is null;
 insert into public.purchase_claims(id,order_id,user_id,session_id,code_hash,buyer_email_hash) values(p_id,p_order,p_user,p_session,p_hash,p_email_hash);
 return true;
end $$;

create function public.commerce_finish_claim(p_id uuid,p_user uuid,p_session uuid,p_hash text,p_email_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare c public.purchase_claims; o public.commerce_orders; order_key uuid; begin
 if not public.account_session_active(p_user,p_session) then return false; end if;
 select order_id into order_key from public.purchase_claims where id=p_id;
 if not found then return false; end if;
 -- Identical lock order to begin_claim: parent before challenge prevents deadlock.
 select * into o from public.commerce_orders where id=order_key for update;
 select * into c from public.purchase_claims where id=p_id for update;
 if c.user_id<>p_user or c.session_id<>p_session or c.consumed_at is not null or c.invalidated_at is not null or c.expires_at<=now() or c.attempts>=5 then return false; end if;
 update public.purchase_claims set attempts=attempts+1 where id=p_id;
 if c.code_hash<>p_hash or c.buyer_email_hash is distinct from p_email_hash or o.buyer_email_hash is distinct from p_email_hash or o.status<>'paid' or o.owner_user_id is not null then return false; end if;
 update public.commerce_orders set owner_user_id=p_user,updated_at=now() where id=o.id;
 insert into public.commerce_entitlements(order_id,product_key,state) select o.id,k,'active' from unnest(o.product_keys) k on conflict(order_id,product_key) do nothing;
 update public.purchase_claims set consumed_at=now() where id=p_id;
 return true;
end $$;

create function public.commerce_lease_event(p_event text,p_type text,p_payment text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.commerce_event_tasks; token uuid:=gen_random_uuid(); begin
 if p_event is null or length(p_event)>192 or p_payment !~ '^[A-Za-z0-9_-]{16,192}$' or p_type not in ('payment.created','payment.updated','refund.created','refund.updated') then raise exception 'invalid_event'; end if;
 insert into public.commerce_event_tasks(event_id,event_type,payment_id) values(p_event,p_type,p_payment) on conflict(event_id) do nothing;
 select * into t from public.commerce_event_tasks where event_id=p_event for update;
 if t.payment_id<>p_payment or t.event_type<>p_type then raise exception 'event_conflict'; end if;
 if t.state='done' then return jsonb_build_object('done',true); end if;
 if t.state='working' and t.lease_until>now() then return jsonb_build_object('busy',true); end if;
 update public.commerce_event_tasks set state='working',attempts=attempts+1,lease_until=now()+interval '90 seconds',lease_token=token,updated_at=now() where event_id=p_event;
 return jsonb_build_object('token',token,'paymentId',p_payment);
end $$;
create function public.commerce_finish_event(p_event text,p_token uuid,p_success boolean) returns boolean
language plpgsql security definer set search_path='' as $$ begin
 update public.commerce_event_tasks set state=case when p_success then 'done' else 'failed' end,error_code=case when p_success then null else 'provider_or_database_unavailable' end,lease_until=null,lease_token=null,updated_at=now() where event_id=p_event and lease_token=p_token;
 return found;
end $$;
revoke all on function public.commerce_sync_order(jsonb,text),public.commerce_begin_claim(uuid,uuid,uuid,uuid,text,text),public.commerce_finish_claim(uuid,uuid,uuid,text,text),public.commerce_lease_event(text,text,text),public.commerce_finish_event(text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.commerce_sync_order(jsonb,text),public.commerce_begin_claim(uuid,uuid,uuid,uuid,text,text),public.commerce_finish_claim(uuid,uuid,uuid,text,text),public.commerce_lease_event(text,text,text),public.commerce_finish_event(text,uuid,boolean) to service_role;

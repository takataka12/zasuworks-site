-- Revalidate and serialize account/session state after waiting for purchase locks.
create or replace function public.commerce_begin_claim(p_id uuid,p_order uuid,p_user uuid,p_session uuid,p_hash text,p_email_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare o public.commerce_orders; begin
 if not public.account_session_active(p_user,p_session) then return false; end if;
 select * into o from public.commerce_orders where id=p_order for update;
 if not found then return false; end if;
 perform 1 from public.account_profiles where user_id=p_user and status='active' for update;
 if not found then return false; end if;
 perform 1 from auth.sessions where id=p_session and user_id=p_user for key share;
 if not found or not public.account_session_active(p_user,p_session) then return false; end if;
 if not found or o.status<>'paid' or o.owner_user_id is not null or p_email_hash is null or o.buyer_email_hash is distinct from p_email_hash then return false; end if;
 if exists(select 1 from public.purchase_claims where order_id=p_order and user_id=p_user and created_at>now()-interval '60 seconds') then return false; end if;
 update public.purchase_claims set invalidated_at=now() where order_id=p_order and user_id=p_user and consumed_at is null and invalidated_at is null;
 insert into public.purchase_claims(id,order_id,user_id,session_id,code_hash,buyer_email_hash) values(p_id,p_order,p_user,p_session,p_hash,p_email_hash);
 return true;
end $$;

create or replace function public.commerce_finish_claim(p_id uuid,p_user uuid,p_session uuid,p_hash text,p_email_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare c public.purchase_claims; o public.commerce_orders; order_key uuid; begin
 if not public.account_session_active(p_user,p_session) then return false; end if;
 select order_id into order_key from public.purchase_claims where id=p_id;
 if not found then return false; end if;
 -- Identical lock order to begin_claim: parent before challenge prevents deadlock.
 select * into o from public.commerce_orders where id=order_key for update;
 perform 1 from public.account_profiles where user_id=p_user and status='active' for update;
 if not found then return false; end if;
 perform 1 from auth.sessions where id=p_session and user_id=p_user for key share;
 if not found or not public.account_session_active(p_user,p_session) then return false; end if;
 select * into c from public.purchase_claims where id=p_id for update;
 if c.user_id<>p_user or c.session_id<>p_session or c.consumed_at is not null or c.invalidated_at is not null or c.expires_at<=now() or c.attempts>=5 then return false; end if;
 update public.purchase_claims set attempts=attempts+1 where id=p_id;
 if c.code_hash<>p_hash or c.buyer_email_hash is distinct from p_email_hash or o.buyer_email_hash is distinct from p_email_hash or o.status<>'paid' or o.owner_user_id is not null then return false; end if;
 update public.commerce_orders set owner_user_id=p_user,updated_at=now() where id=o.id;
 insert into public.commerce_entitlements(order_id,product_key,state) select o.id,k,'active' from unnest(o.product_keys) k on conflict(order_id,product_key) do nothing;
 update public.purchase_claims set consumed_at=now() where id=p_id;
 return true;
end $$;


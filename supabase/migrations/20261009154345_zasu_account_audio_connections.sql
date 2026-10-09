create table public.account_audio_handoffs(
 code_hash text primary key check(code_hash ~ '^[a-f0-9]{64}$'),
 challenge text not null check(challenge ~ '^[A-Za-z0-9_-]{43}$'),
 user_id uuid not null references public.account_profiles(user_id),
 session_id uuid not null references auth.sessions(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '60 seconds'
);
create table public.account_audio_connections(
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null references public.account_profiles(user_id),
 session_id uuid not null references auth.sessions(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '24 hours',
 revoked_at timestamptz
);
alter table public.account_audio_handoffs enable row level security;
alter table public.account_audio_connections enable row level security;
revoke all on public.account_audio_handoffs,public.account_audio_connections from public,anon,authenticated;
grant all on public.account_audio_handoffs,public.account_audio_connections to service_role;
create function public.account_audio_prepare(p_user uuid,p_session uuid,p_hash text,p_challenge text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.account_session_active(p_user,p_session) then return false; end if;
 delete from public.account_audio_handoffs where expires_at<now();
 delete from public.account_audio_connections where expires_at<now() or revoked_at<now()-interval '1 day';
 insert into public.account_audio_handoffs(code_hash,challenge,user_id,session_id) values(p_hash,p_challenge,p_user,p_session);
 return true;
end;
$$;
create function public.account_audio_exchange(p_hash text,p_challenge text,p_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare h public.account_audio_handoffs%rowtype;
begin
 select * into h from public.account_audio_handoffs where code_hash=p_hash for update;
 if not found or h.expires_at<=now() or h.challenge<>p_challenge or not public.account_session_active(h.user_id,h.session_id) then return null; end if;
 delete from public.account_audio_handoffs where code_hash=p_hash;
 insert into public.account_audio_connections(token_hash,user_id,session_id) values(p_token_hash,h.user_id,h.session_id);
 return jsonb_build_object('id',h.user_id,'sessionId',h.session_id);
end;
$$;
create function public.account_audio_identity(p_hash text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',c.user_id,'sessionId',c.session_id) from public.account_audio_connections c
 where c.token_hash=p_hash and c.expires_at>now() and c.revoked_at is null and public.account_session_active(c.user_id,c.session_id);
$$;
create function public.account_audio_disconnect(p_hash text)
returns void language sql security definer set search_path='' as $$
 update public.account_audio_connections set revoked_at=now() where token_hash=p_hash;
$$;
revoke all on function public.account_audio_prepare(uuid,uuid,text,text),public.account_audio_exchange(text,text,text),public.account_audio_identity(text),public.account_audio_disconnect(text) from public,anon,authenticated;
grant execute on function public.account_audio_prepare(uuid,uuid,text,text),public.account_audio_exchange(text,text,text),public.account_audio_identity(text),public.account_audio_disconnect(text) to service_role;

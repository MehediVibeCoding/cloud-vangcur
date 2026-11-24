-- অ্যাকাউন্ট পেজ থেকে গেম খেলা (migrations: game_account_play, game_account_play_identity_fix, game_scores_account_rows)
-- এই মাইগ্রেশন লাইভ Supabase ডাটাবেজে ইতিমধ্যে প্রয়োগ করা হয়েছে। ফাইলটা শুধু রেকর্ড/নতুন পরিবেশে চালানোর জন্য
-- (game-leaderboard-hardening.sql চালানোর পরে চালাতে হবে)।
-- পুরনো `submit_game_score` (v1) আর অর্ডার-ভিত্তিক `submit_game_score_v2` অক্ষত থাকে।

-- ১) game_scores: অর্ডার ছাড়া (অ্যাকাউন্ট) সারি + খেলোয়াড়ের কী
alter table public.game_scores add column if not exists player_key text;
update public.game_scores g
   set player_key = public.game_customer_key(o.customer_phone, o.user_id, g.order_id)
  from public.orders o where o.id = g.order_id and g.player_key is null;
update public.game_scores g set player_key = g.order_id::text where g.player_key is null;
create index if not exists game_scores_player_idx on public.game_scores (game_id, player_key);

alter table public.game_scores add column if not exists id uuid not null default gen_random_uuid();
alter table public.game_scores add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.game_scores drop constraint if exists game_scores_pkey;
alter table public.game_scores add constraint game_scores_pkey primary key (id);
alter table public.game_scores alter column order_id drop not null;
create unique index if not exists game_scores_order_uq on public.game_scores (game_id, order_id);
create unique index if not exists game_scores_user_uq on public.game_scores (game_id, user_id);
alter table public.game_scores drop constraint if exists game_scores_owner_chk;
alter table public.game_scores add constraint game_scores_owner_chk check (order_id is not null or user_id is not null);

-- ২) অ্যাকাউন্ট ইউজারের পরিচয়: profiles সারি সবার থাকে না, তাই auth.users ভিত্তি; প্রোফাইল থাকলে তার নাম/ফোন অগ্রাধিকার
create or replace function public.game_account_identity(p_user_id uuid)
returns table(player_name text, player_key text)
language sql stable security definer set search_path to 'public' as $$
  select left(coalesce(
           nullif(split_part(btrim(coalesce(p.name, '')), ' ', 1), ''),
           nullif(split_part(btrim(coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', '')), ' ', 1), ''),
           'Player'), 20),
         coalesce(nullif(right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10), ''), u.id::text)
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;
$$;

-- ৩) কমন স্কোর-রেকর্ড ফাংশন (রান যাচাই + সময়ের যুক্তিসঙ্গততা + আপসার্ট + কাস্টমার ধরে র‍্যাংক)
drop function if exists public.game_record_score(text, uuid, text, text, integer, uuid, interval);
create or replace function public.game_record_score(
  p_game_id text, p_order_id uuid, p_user_id uuid, p_name text, p_key text, p_score integer, p_run_id uuid, p_run_ttl interval)
returns table(accepted boolean, rank integer, best integer, is_world_record boolean)
language plpgsql security definer set search_path to 'public' as $$
declare
  v_max_score constant int := 1000;
  v_min_secs_per_block constant numeric := 0.45;
  v_grace_secs constant numeric := 3;
  v_row uuid := coalesce(p_order_id, p_user_id);
  v_score int;
  v_world int;
  v_elapsed numeric;
  v_best int;
  v_at timestamptz;
  v_rank int;
begin
  if p_game_id is null or length(p_game_id) > 40 or v_row is null or p_run_id is null
     or p_key is null or p_name is null or (p_order_id is not null and p_user_id is not null) then
    return query select false, 0, 0, false; return;
  end if;
  if p_score is null or p_score < 1 then
    return query select false, 0, 0, false; return;
  end if;
  v_score := least(p_score, v_max_score);

  update public.game_runs r set used_at = now()
   where r.id = p_run_id and r.game_id = p_game_id and r.order_id = v_row
     and r.used_at is null and r.started_at > now() - p_run_ttl
  returning extract(epoch from (now() - r.started_at)) into v_elapsed;
  if not found then
    return query select false, 0, 0, false; return;
  end if;
  if v_elapsed < (v_score * v_min_secs_per_block - v_grace_secs) then
    return query select false, 0, 0, false; return;
  end if;

  select max(g.score) into v_world from public.game_scores g where g.game_id = p_game_id;

  if p_user_id is not null then
    insert into public.game_scores as g (game_id, user_id, player_name, score, player_key)
    values (p_game_id, p_user_id, p_name, v_score, p_key)
    on conflict (game_id, user_id) do update
      set score = excluded.score, achieved_at = now(), player_name = excluded.player_name, player_key = excluded.player_key
      where excluded.score > g.score;
  else
    insert into public.game_scores as g (game_id, order_id, player_name, score, player_key)
    values (p_game_id, p_order_id, p_name, v_score, p_key)
    on conflict (game_id, order_id) do update
      set score = excluded.score, achieved_at = now(), player_name = excluded.player_name, player_key = excluded.player_key
      where excluded.score > g.score;
  end if;

  with per as (
    select distinct on (x.k) x.k, x.score, x.achieved_at
    from (
      select coalesce(g.player_key, public.game_customer_key(o.customer_phone, o.user_id, g.order_id)) as k, g.score, g.achieved_at
      from public.game_scores g left join public.orders o on o.id = g.order_id
      where g.game_id = p_game_id
    ) x
    order by x.k, x.score desc, x.achieved_at asc
  )
  select per.score, per.achieved_at into v_best, v_at from per where per.k = p_key;

  with per as (
    select distinct on (x.k) x.k, x.score, x.achieved_at
    from (
      select coalesce(g.player_key, public.game_customer_key(o.customer_phone, o.user_id, g.order_id)) as k, g.score, g.achieved_at
      from public.game_scores g left join public.orders o on o.id = g.order_id
      where g.game_id = p_game_id
    ) x
    order by x.k, x.score desc, x.achieved_at asc
  )
  select 1 + count(*)::int into v_rank from per
   where per.score > v_best or (per.score = v_best and per.achieved_at < v_at);

  return query select true, v_rank, v_best, (v_score > coalesce(v_world, 0));
end; $$;

-- ৪) অর্ডার-পথ (v2) এখন কমন ফাংশনকে ডাকে
create or replace function public.submit_game_score_v2(p_game_id text, p_order_id uuid, p_score integer, p_run_id uuid)
returns table(accepted boolean, rank integer, best integer, is_world_record boolean)
language plpgsql security definer set search_path to 'public' as $$
declare v_name text; v_key text;
begin
  select left(coalesce(nullif(split_part(btrim(o.customer_name), ' ', 1), ''), 'Player'), 20),
         public.game_customer_key(o.customer_phone, o.user_id, o.id)
    into v_name, v_key from public.orders o where o.id = p_order_id;
  if v_name is null then
    return query select false, 0, 0, false; return;
  end if;
  return query select * from public.game_record_score(p_game_id, p_order_id, null::uuid, v_name, v_key, p_score, p_run_id, interval '30 minutes');
end; $$;

-- ৫) অ্যাকাউন্ট-পথ: রান খোলা / স্কোর জমা (সময়ের সীমা নেই — রান ২ ঘণ্টা বৈধ) / নিজের র‍্যাংক
create or replace function public.start_account_game_run(p_game_id text, p_user_id uuid)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
  if p_game_id is null or length(p_game_id) > 40 or p_user_id is null then return null; end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then return null; end if;
  if (select count(*) from public.game_runs r
        where r.order_id = p_user_id and r.started_at > now() - interval '10 minutes') >= 60 then
    return null;
  end if;
  if random() < 0.05 then
    delete from public.game_runs where started_at < now() - interval '1 day';
  end if;
  insert into public.game_runs (game_id, order_id) values (p_game_id, p_user_id) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.submit_account_game_score(p_game_id text, p_user_id uuid, p_score integer, p_run_id uuid)
returns table(accepted boolean, rank integer, best integer, is_world_record boolean)
language plpgsql security definer set search_path to 'public' as $$
declare v_name text; v_key text;
begin
  select i.player_name, i.player_key into v_name, v_key from public.game_account_identity(p_user_id) i;
  if v_key is null then
    return query select false, 0, 0, false; return;
  end if;
  return query select * from public.game_record_score(p_game_id, null::uuid, p_user_id, v_name, v_key, p_score, p_run_id, interval '2 hours');
end; $$;

create or replace function public.get_account_game_rank(p_game_id text, p_user_id uuid)
returns table(rank integer, best integer)
language plpgsql stable security definer set search_path to 'public' as $$
declare v_key text; v_best int; v_at timestamptz; v_rank int;
begin
  select i.player_key into v_key from public.game_account_identity(p_user_id) i;
  if v_key is null then
    return query select 0, 0; return;
  end if;
  with per as (
    select distinct on (x.k) x.k, x.score, x.achieved_at
    from (
      select coalesce(g.player_key, public.game_customer_key(o.customer_phone, o.user_id, g.order_id)) as k, g.score, g.achieved_at
      from public.game_scores g left join public.orders o on o.id = g.order_id
      where g.game_id = p_game_id
    ) x
    order by x.k, x.score desc, x.achieved_at asc
  )
  select per.score, per.achieved_at into v_best, v_at from per where per.k = v_key;
  if v_best is null then
    return query select 0, 0; return;
  end if;
  with per as (
    select distinct on (x.k) x.k, x.score, x.achieved_at
    from (
      select coalesce(g.player_key, public.game_customer_key(o.customer_phone, o.user_id, g.order_id)) as k, g.score, g.achieved_at
      from public.game_scores g left join public.orders o on o.id = g.order_id
      where g.game_id = p_game_id
    ) x
    order by x.k, x.score desc, x.achieved_at asc
  )
  select 1 + count(*)::int into v_rank from per
   where per.score > v_best or (per.score = v_best and per.achieved_at < v_at);
  return query select v_rank, v_best;
end; $$;

-- ৬) লিডারবোর্ড: সংরক্ষিত player_key ধরে প্রতি কাস্টমারের সেরা
create or replace function public.get_leaderboard(p_game_id text, p_limit integer default 3)
returns table(rank integer, player_name text, score integer)
language sql stable security definer set search_path to 'public' as $$
  with raw as (
    select coalesce(g.player_key, public.game_customer_key(o.customer_phone, o.user_id, g.order_id)) as k,
           g.player_name as pn, g.score as sc, g.achieved_at as at
    from public.game_scores g
    left join public.orders o on o.id = g.order_id
    where g.game_id = p_game_id
  ),
  best as (
    select distinct on (r.k) r.k, r.pn, r.sc, r.at from raw r order by r.k, r.sc desc, r.at asc
  )
  select (row_number() over (order by b.sc desc, b.at asc))::int, b.pn, b.sc
  from best b
  order by b.sc desc, b.at asc
  limit greatest(1, least(coalesce(p_limit, 3), 10));
$$;

-- ৭) শুধু service_role
revoke all on function public.game_account_identity(uuid) from public, anon, authenticated;
revoke all on function public.game_record_score(text, uuid, uuid, text, text, integer, uuid, interval) from public, anon, authenticated;
revoke all on function public.start_account_game_run(text, uuid) from public, anon, authenticated;
revoke all on function public.submit_account_game_score(text, uuid, integer, uuid) from public, anon, authenticated;
revoke all on function public.get_account_game_rank(text, uuid) from public, anon, authenticated;
grant execute on function public.game_account_identity(uuid) to service_role;
grant execute on function public.game_record_score(text, uuid, uuid, text, text, integer, uuid, interval) to service_role;
grant execute on function public.start_account_game_run(text, uuid) to service_role;
grant execute on function public.submit_account_game_score(text, uuid, integer, uuid) to service_role;
grant execute on function public.get_account_game_rank(text, uuid) to service_role;

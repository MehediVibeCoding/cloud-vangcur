-- গেম লিডারবোর্ড হার্ডেনিং (migration: game_leaderboard_hardening)
-- এই মাইগ্রেশন লাইভ Supabase ডাটাবেজে ইতিমধ্যে প্রয়োগ করা হয়েছে। ফাইলটা শুধু রেকর্ড/নতুন পরিবেশে চালানোর জন্য।
-- নিরাপদ: get_leaderboard-এর সিগনেচার একই, তাই পুরনো রুট কোডও চলে।

-- ১) একই কাস্টমার চেনার হেল্পার (ফোনের শেষ ১০ ডিজিট → না থাকলে user_id → না থাকলে order_id)
create or replace function public.game_customer_key(p_phone text, p_user uuid, p_order uuid)
returns text language sql immutable set search_path to 'public' as $$
  select coalesce(
    nullif(right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10), ''),
    p_user::text,
    p_order::text
  );
$$;

-- ২) খেলার "রান": প্রতিবার খেলা শুরুতে সার্ভার একটা রান খোলে; স্কোর জমার সময় রানটা একবারই ব্যবহার করা যায়
create table if not exists public.game_runs (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  order_id uuid not null,
  started_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists game_runs_order_idx on public.game_runs (order_id, started_at desc);
create index if not exists game_runs_started_idx on public.game_runs (started_at);
alter table public.game_runs enable row level security;
revoke all on public.game_runs from anon, authenticated;

create or replace function public.start_game_run(p_game_id text, p_order_id uuid)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
  if p_game_id is null or length(p_game_id) > 40 or p_order_id is null then return null; end if;
  if not exists (select 1 from public.orders o where o.id = p_order_id) then return null; end if;
  if (select count(*) from public.game_runs r
        where r.order_id = p_order_id and r.started_at > now() - interval '10 minutes') >= 60 then
    return null;
  end if;
  if random() < 0.05 then
    delete from public.game_runs where started_at < now() - interval '1 day';
  end if;
  insert into public.game_runs (game_id, order_id) values (p_game_id, p_order_id) returning id into v_id;
  return v_id;
end; $$;

-- ৩) নতুন স্কোর জমা: রান লাগবে + সময়ের যুক্তিসঙ্গততা (স্কোর × ০.৪৫ সেকেন্ড − ৩ সেকেন্ড) + কাস্টমার ধরে র‍্যাংক
create or replace function public.submit_game_score_v2(p_game_id text, p_order_id uuid, p_score integer, p_run_id uuid)
returns table(accepted boolean, rank integer, best integer, is_world_record boolean)
language plpgsql security definer set search_path to 'public' as $$
declare
  v_max_score constant int := 1000;
  v_min_secs_per_block constant numeric := 0.45;
  v_grace_secs constant numeric := 3;
  v_name text;
  v_key text;
  v_world int;
  v_elapsed numeric;
  v_best int;
  v_at timestamptz;
  v_rank int;
begin
  if p_game_id is null or length(p_game_id) > 40 or p_order_id is null or p_run_id is null then
    return query select false, 0, 0, false; return;
  end if;
  if p_score is null or p_score < 1 or p_score > v_max_score then
    return query select false, 0, 0, false; return;
  end if;

  update public.game_runs r set used_at = now()
   where r.id = p_run_id and r.game_id = p_game_id and r.order_id = p_order_id
     and r.used_at is null and r.started_at > now() - interval '30 minutes'
  returning extract(epoch from (now() - r.started_at)) into v_elapsed;
  if not found then
    return query select false, 0, 0, false; return;
  end if;
  if v_elapsed < (p_score * v_min_secs_per_block - v_grace_secs) then
    return query select false, 0, 0, false; return;
  end if;

  select left(coalesce(nullif(split_part(btrim(o.customer_name), ' ', 1), ''), 'Player'), 20),
         public.game_customer_key(o.customer_phone, o.user_id, o.id)
    into v_name, v_key from public.orders o where o.id = p_order_id;
  if v_name is null then
    return query select false, 0, 0, false; return;
  end if;

  select max(g.score) into v_world from public.game_scores g where g.game_id = p_game_id;

  insert into public.game_scores as g (game_id, order_id, player_name, score)
  values (p_game_id, p_order_id, v_name, p_score)
  on conflict (game_id, order_id) do update
    set score = excluded.score, achieved_at = now(), player_name = excluded.player_name
    where excluded.score > g.score;

  with per as (
    select distinct on (x.k) x.k, x.score, x.achieved_at
    from (
      select public.game_customer_key(o.customer_phone, o.user_id, g.order_id) as k, g.score, g.achieved_at
      from public.game_scores g left join public.orders o on o.id = g.order_id
      where g.game_id = p_game_id
    ) x
    order by x.k, x.score desc, x.achieved_at asc
  )
  select per.score, per.achieved_at into v_best, v_at from per where per.k = v_key;

  with per as (
    select distinct on (x.k) x.k, x.score, x.achieved_at
    from (
      select public.game_customer_key(o.customer_phone, o.user_id, g.order_id) as k, g.score, g.achieved_at
      from public.game_scores g left join public.orders o on o.id = g.order_id
      where g.game_id = p_game_id
    ) x
    order by x.k, x.score desc, x.achieved_at asc
  )
  select 1 + count(*)::int into v_rank from per
   where per.score > v_best or (per.score = v_best and per.achieved_at < v_at);

  return query select true, v_rank, v_best, (p_score > coalesce(v_world, 0));
end; $$;

-- ৪) লিডারবোর্ড: প্রতি কাস্টমারের শুধু সেরা স্কোর
create or replace function public.get_leaderboard(p_game_id text, p_limit integer default 3)
returns table(rank integer, player_name text, score integer)
language sql stable security definer set search_path to 'public' as $$
  with best as (
    select distinct on (public.game_customer_key(o.customer_phone, o.user_id, g.order_id))
           g.player_name as pn, g.score as sc, g.achieved_at as at
    from public.game_scores g
    left join public.orders o on o.id = g.order_id
    where g.game_id = p_game_id
    order by public.game_customer_key(o.customer_phone, o.user_id, g.order_id), g.score desc, g.achieved_at asc
  )
  select (row_number() over (order by b.sc desc, b.at asc))::int, b.pn, b.sc
  from best b
  order by b.sc desc, b.at asc
  limit greatest(1, least(coalesce(p_limit, 3), 10));
$$;

-- ৫) শুধু service_role চালাতে পারবে
revoke all on function public.game_customer_key(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.start_game_run(text, uuid) from public, anon, authenticated;
revoke all on function public.submit_game_score_v2(text, uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.game_customer_key(text, uuid, uuid) to service_role;
grant execute on function public.start_game_run(text, uuid) to service_role;
grant execute on function public.submit_game_score_v2(text, uuid, integer, uuid) to service_role;

-- ঐচ্ছিক ক্লিনআপ (PR মার্জ ও ডিপ্লয়ের পর): পুরনো, রান-ছাড়া স্কোর ফাংশনটা আর রুট ব্যবহার করে না, চাইলে সরানো যায়:
--   drop function if exists public.submit_game_score(text, uuid, integer);

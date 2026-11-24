import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import { fetchFullOrder } from '@/lib/orderStatus';
import { GAMES } from '@/lib/games';
import { logError } from '@/lib/logger';
import { slidingWindowLimit, getClientIp } from '@/lib/limiter';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOP_COUNT = 3;
const NO_STORE = { 'Cache-Control': 'no-store' };

// রেট লিমিট (প্রতি IP, প্রতি ৬০ সেকেন্ডে)। বাংলাদেশের মোবাইল নেটওয়ার্কে অনেক মানুষ একই IP শেয়ার করে (CGNAT) —
// তাই আগের ৩০/১২ খুব কম ছিল, শেয়ার্ড IP-র কাস্টমার লিডারবোর্ড দেখতে/স্কোর দিতে পারত না। এখন একটু উদার।
const LB_READ_LIMIT = 120;
const RUN_START_LIMIT = 60;
const SCORE_SUBMIT_LIMIT = 40;

type TopRow = { rank: number; player_name: string; score: number };

function isKnownGame(id: unknown): id is string {
  return typeof id === 'string' && GAMES.some((g) => g.id === id);
}

async function readTop(service: ReturnType<typeof createServiceClient>, game: string) {
  const { data, error } = await service.rpc('get_leaderboard', { p_game_id: game, p_limit: TOP_COUNT });
  if (error || !Array.isArray(data)) return null;
  return (data as TopRow[]).map((r) => ({ rank: Number(r.rank), name: String(r.player_name), score: Number(r.score) }));
}

// লগইন করা ইউজারের আইডি (সার্ভারে কুকি-সেশন থেকে যাচাই করা — ক্লায়েন্টের পাঠানো কোনো আইডি বিশ্বাস করা হয় না)
async function authUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const id = data?.user?.id || '';
    return UUID_RE.test(id) ? id : null;
  } catch {
    return null;
  }
}

function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { ok: false, error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  );
}

/**
 * GET ?game=<id>[&me=1] — টপ ৩। `me=1` দিলে এবং ইউজার লগইন থাকলে ইউজারের নিজের সেরা স্কোর ও র‍্যাংকও দেয় (অ্যাকাউন্ট পেজের গেম কার্ডের জন্য)।
 */
export async function GET(req: NextRequest) {
  const rl = await slidingWindowLimit(`game-lb:${getClientIp(req.headers)}`, LB_READ_LIMIT, 60);
  if (!rl.allowed) return tooMany(rl.retryAfterSec);
  const game = req.nextUrl.searchParams.get('game');
  if (!isKnownGame(game)) {
    return NextResponse.json({ ok: false, error: 'Unknown game' }, { status: 400 });
  }
  try {
    const service = createServiceClient();
    const top = await readTop(service, game);
    if (!top) return NextResponse.json({ ok: false, unavailable: true }, { status: 503, headers: NO_STORE });

    let me: { rank: number; best: number } | null = null;
    if (req.nextUrl.searchParams.get('me') === '1') {
      const uid = await authUserId();
      if (uid) {
        const { data } = await service.rpc('get_account_game_rank', { p_game_id: game, p_user_id: uid });
        const r = Array.isArray(data) ? data[0] : data;
        if (r) me = { rank: Number(r.rank) || 0, best: Number(r.best) || 0 };
      }
    }
    return NextResponse.json({ ok: true, top, me }, { headers: NO_STORE });
  } catch (err) {
    logError('[GameScore] leaderboard failed:', err);
    return NextResponse.json({ ok: false, unavailable: true }, { status: 503, headers: NO_STORE });
  }
}

/**
 * POST — দুই জায়গা থেকে খেলা যায়, দুটোই একই লিডারবোর্ডে জমে:
 *  • ওয়েটিং পেজ (অর্ডার-ভিত্তিক, ৫ মিনিট সীমা): `{ game, orderId, phone, ... }`
 *  • অ্যাকাউন্ট পেজ (লগইন ইউজার, সময়ের সীমা নেই): `{ source: 'account', game, ... }` — অর্ডার/ফোন লাগে না, ইউজার সার্ভারে সেশন থেকে চেনা হয়।
 *
 * প্রতিটাই দুই ধাপ:
 *  ১. `{ action: 'start', ... }` — খেলা শুরুর সময় একটা "রান" খোলে, `{ ok, run }` ফেরত দেয়।
 *  ২. `{ ..., score, run }` — খেলা শেষে স্কোর জমা।
 *
 * INTENTIONAL: স্কোর-ক্যাপ (১০০০), "রান আগে খুলতে হবে + প্রতি রান একবারই ব্যবহার + স্কোরের তুলনায় যথেষ্ট সময় পেরিয়েছে কিনা"
 * এবং প্রতি-কাস্টমার র‍্যাংক — সবই এই রুটে নয়, DB-তে। ফাংশনগুলো anon/authenticated চালাতে পারে না, শুধু service-role।
 * রুট শুধু মালিকানা যাচাই করে (অর্ডারের ক্ষেত্রে ফোন, অ্যাকাউন্টের ক্ষেত্রে লগইন সেশন)।
 */
export async function POST(req: NextRequest) {
  let body: {
    action?: unknown; source?: unknown; game?: unknown; orderId?: unknown;
    phone?: unknown; score?: unknown; run?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }

  const isStart = body.action === 'start';
  const isAccount = body.source === 'account';
  const rl = isStart
    ? await slidingWindowLimit(`game-run:${getClientIp(req.headers)}`, RUN_START_LIMIT, 60)
    : await slidingWindowLimit(`game-score:${getClientIp(req.headers)}`, SCORE_SUBMIT_LIMIT, 60);
  if (!rl.allowed) return tooMany(rl.retryAfterSec);

  if (!isKnownGame(body.game)) {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
  const game = body.game;

  // কে খেলছে: অ্যাকাউন্ট → লগইন ইউজার; নয়তো → অর্ডার (ফোন দিয়ে মালিকানা যাচাই)
  const orderIdRaw = typeof body.orderId === 'string' ? body.orderId : '';
  const phone = typeof body.phone === 'string' ? body.phone : undefined;
  let ownerUserId: string | null = null;
  let verifiedOrderId = '';
  try {
    if (isAccount) {
      ownerUserId = await authUserId();
      if (!ownerUserId) {
        return NextResponse.json({ ok: false, error: 'Login required' }, { status: 401, headers: NO_STORE });
      }
    } else {
      if (!UUID_RE.test(orderIdRaw)) {
        return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
      }
      const supabase = await createClient();
      const row = await fetchFullOrder(supabase, orderIdRaw, phone);
      verifiedOrderId = String(row?.id || '');
      if (!row || !UUID_RE.test(verifiedOrderId)) {
        return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404, headers: NO_STORE });
      }
    }
  } catch (err) {
    logError('[GameScore] owner check error:', err);
    return NextResponse.json({ ok: false, unavailable: true }, { status: 503, headers: NO_STORE });
  }

  // ── খেলা শুরু: নতুন রান খোলো ──
  if (isStart) {
    try {
      const service = createServiceClient();
      const { data, error } = isAccount
        ? await service.rpc('start_account_game_run', { p_game_id: game, p_user_id: ownerUserId })
        : await service.rpc('start_game_run', { p_game_id: game, p_order_id: verifiedOrderId });
      const run = typeof data === 'string' ? data : '';
      if (error || !UUID_RE.test(run)) {
        if (error) logError('[GameScore] start run failed:', error);
        return NextResponse.json({ ok: false, unavailable: true }, { status: 503, headers: NO_STORE });
      }
      return NextResponse.json({ ok: true, run }, { headers: NO_STORE });
    } catch (err) {
      logError('[GameScore] start run error:', err);
      return NextResponse.json({ ok: false, unavailable: true }, { status: 503, headers: NO_STORE });
    }
  }

  // ── খেলা শেষ: স্কোর জমা ──
  const score = typeof body.score === 'number' ? Math.floor(body.score) : NaN;
  const run = typeof body.run === 'string' ? body.run : '';
  if (!Number.isFinite(score) || score < 1 || !UUID_RE.test(run)) {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }

  try {
    const service = createServiceClient();
    const { data, error } = isAccount
      ? await service.rpc('submit_account_game_score', {
        p_game_id: game, p_user_id: ownerUserId, p_score: score, p_run_id: run,
      })
      : await service.rpc('submit_game_score_v2', {
        p_game_id: game, p_order_id: verifiedOrderId, p_score: score, p_run_id: run,
      });
    const res = Array.isArray(data) ? data[0] : data;
    if (error || !res) {
      logError('[GameScore] submit failed:', error);
      return NextResponse.json({ ok: false, unavailable: true }, { status: 503, headers: NO_STORE });
    }

    const top = await readTop(service, game);
    return NextResponse.json(
      {
        ok: true,
        accepted: !!res.accepted,
        rank: Number(res.rank) || 0,
        best: Number(res.best) || 0,
        worldRecord: !!res.is_world_record,
        top: top || [],
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    logError('[GameScore] submit error:', err);
    return NextResponse.json({ ok: false, unavailable: true }, { status: 503, headers: NO_STORE });
  }
}

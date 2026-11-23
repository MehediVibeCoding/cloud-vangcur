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

function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { ok: false, error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  );
}

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
    return NextResponse.json({ ok: true, top }, { headers: NO_STORE });
  } catch (err) {
    logError('[GameScore] leaderboard failed:', err);
    return NextResponse.json({ ok: false, unavailable: true }, { status: 503, headers: NO_STORE });
  }
}

/**
 * POST দুই ধরনের:
 *  ১. `{ action: 'start', game, orderId, phone }` — খেলা শুরুর সময় একটা "রান" খোলে (DB: `start_game_run`), `{ ok, run }` ফেরত দেয়।
 *  ২. `{ game, orderId, phone, score, run }` — খেলা শেষে স্কোর জমা (DB: `submit_game_score_v2`)।
 *
 * INTENTIONAL: স্কোর-ক্যাপ (১০০০), "রান আগে খুলতে হবে + প্রতি রান একবারই ব্যবহার + স্কোরের তুলনায় যথেষ্ট সময় পেরিয়েছে কিনা"
 * এবং প্রতি-কাস্টমার র‍্যাংক — সবই এই রুটে নয়, DB-তে। ফাংশনগুলো anon/authenticated চালাতে পারে না, শুধু service-role।
 * রুট শুধু ফোন দিয়ে অর্ডারের মালিকানা যাচাই করে। এতে ক্লায়েন্ট থেকে সরাসরি বানানো স্কোর (যেমন কনসোল থেকে ১০০০) ঢোকে না।
 */
export async function POST(req: NextRequest) {
  let body: { action?: unknown; game?: unknown; orderId?: unknown; phone?: unknown; score?: unknown; run?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }

  const isStart = body.action === 'start';
  const rl = isStart
    ? await slidingWindowLimit(`game-run:${getClientIp(req.headers)}`, RUN_START_LIMIT, 60)
    : await slidingWindowLimit(`game-score:${getClientIp(req.headers)}`, SCORE_SUBMIT_LIMIT, 60);
  if (!rl.allowed) return tooMany(rl.retryAfterSec);

  const orderId = typeof body.orderId === 'string' ? body.orderId : '';
  const phone = typeof body.phone === 'string' ? body.phone : undefined;
  if (!isKnownGame(body.game) || !UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
  const game = body.game;

  // ── খেলা শুরু: নতুন রান খোলো ──
  if (isStart) {
    try {
      const supabase = await createClient();
      const row = await fetchFullOrder(supabase, orderId, phone);
      const verifiedId = String(row?.id || '');
      if (!row || !UUID_RE.test(verifiedId)) {
        return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404, headers: NO_STORE });
      }
      const service = createServiceClient();
      const { data, error } = await service.rpc('start_game_run', { p_game_id: game, p_order_id: verifiedId });
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
    const supabase = await createClient();
    const row = await fetchFullOrder(supabase, orderId, phone);
    const verifiedId = String(row?.id || '');
    if (!row || !UUID_RE.test(verifiedId)) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404, headers: NO_STORE });
    }

    const service = createServiceClient();
    const { data, error } = await service.rpc('submit_game_score_v2', {
      p_game_id: game,
      p_order_id: verifiedId,
      p_score: score,
      p_run_id: run,
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

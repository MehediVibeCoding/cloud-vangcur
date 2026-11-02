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

type TopRow = { rank: number; player_name: string; score: number };

function isKnownGame(id: unknown): id is string {
  return typeof id === 'string' && GAMES.some((g) => g.id === id);
}

async function readTop(service: ReturnType<typeof createServiceClient>, game: string) {
  const { data, error } = await service.rpc('get_leaderboard', { p_game_id: game, p_limit: TOP_COUNT });
  if (error || !Array.isArray(data)) return null;
  return (data as TopRow[]).map((r) => ({ rank: Number(r.rank), name: String(r.player_name), score: Number(r.score) }));
}

export async function GET(req: NextRequest) {
  const rl = await slidingWindowLimit(`game-lb:${getClientIp(req.headers)}`, 30, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }
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

// INTENTIONAL: স্কোর-ক্যাপ ও প্রতি-অর্ডার সীমা এই রুটে না, DB-তে — `submit_game_score` RPC স্কোর ক্যাপ করে
// (ক্যাপ: ১০০০) এবং ফাংশনটা anon/authenticated চালাতে পারে না, শুধু service-role। রুট শুধু ফোন দিয়ে
// অর্ডারের মালিকানা যাচাই করে। তাই এখানে আলাদা স্কোর-সীমা বসানো হয়নি।
export async function POST(req: NextRequest) {
  const rl = await slidingWindowLimit(`game-score:${getClientIp(req.headers)}`, 12, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  let body: { game?: unknown; orderId?: unknown; phone?: unknown; score?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }

  const score = typeof body.score === 'number' ? Math.floor(body.score) : NaN;
  const orderId = typeof body.orderId === 'string' ? body.orderId : '';
  const phone = typeof body.phone === 'string' ? body.phone : undefined;
  if (!isKnownGame(body.game) || !Number.isFinite(score) || score < 1 || !UUID_RE.test(orderId)) {
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
    const { data, error } = await service.rpc('submit_game_score', {
      p_game_id: body.game,
      p_order_id: verifiedId,
      p_score: score,
    });
    const res = Array.isArray(data) ? data[0] : data;
    if (error || !res) {
      logError('[GameScore] submit failed:', error);
      return NextResponse.json({ ok: false, unavailable: true }, { status: 503, headers: NO_STORE });
    }

    const top = await readTop(service, body.game);
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

import { NextRequest, NextResponse } from 'next/server';
import { getCachedLiveProducts } from '@/lib/liveProducts';

// দাম/স্টক/ব্যাজের লাইভ-চেক (প্রোডাক্ট পেজ)। ডাটাবেজ থেকে নয় — ৩ মিনিটের সার্ভার-ক্যাশ থেকে
// (lib/liveProducts.ts)। ব্রাউজারও ৬০ সেকেন্ড নিজে রাখে, তাই একই ভিজিটরের বারবার রিকোয়েস্টও কম।
// আসল সত্য (দাম/স্টক) এখনো চেকআউটে সার্ভার-সাইডে যাচাই হয় — এটা শুধু পেজের UI তাজা রাখে।
export async function GET(req: NextRequest) {
  const idsParam = new URL(req.url).searchParams.get('ids') || '';
  // ইনপুট যাচাই: শুধু নিরাপদ আইডি-অক্ষর, সর্বোচ্চ ৬০টা
  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z0-9_-]{1,40}$/.test(s))
    .slice(0, 60);

  if (!ids.length) {
    return NextResponse.json({ items: [], total: 0 }, { status: 400 });
  }

  try {
    const all = await getCachedLiveProducts();
    const wanted = new Set(ids);
    const items = all.filter((p) => wanted.has(String(p.id)));
    return NextResponse.json(
      { items, total: all.length },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' } },
    );
  } catch {
    return NextResponse.json({ items: [], total: 0 }, { status: 503 });
  }
}

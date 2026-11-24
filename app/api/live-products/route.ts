import { NextRequest, NextResponse } from 'next/server';
import { getCachedLiveProducts, getLiveProductsForCategory } from '@/lib/liveProducts';

// দাম/স্টক/ব্যাজের লাইভ-চেক (প্রোডাক্ট পেজ)। ডাটাবেজ থেকে নয় — ১০ মিনিটের সার্ভার-ক্যাশ থেকে
// (lib/liveProducts.ts)। ব্রাউজারও ৬০ সেকেন্ড নিজে রাখে, তাই একই ভিজিটরের বারবার রিকোয়েস্টও কম।
//
// 🛡️ রিকোয়েস্ট-সেভিং (২০২৬-১১): `ids` এখন ঐচ্ছিক। ক্লায়েন্ট কোনো `ids` ছাড়াই ডাকে → সব প্রোডাক্টের হালকা
// তালিকা (id/দাম/পুরনো দাম/স্টক/ব্যাজ) ফেরত আসে। আগে প্রতিটা প্রোডাক্ট পেজ আলাদা `?ids=...` পাঠাত, ফলে প্রতিটা
// আলাদা Workers-Cache কী হতো আর প্রায় সব রিকোয়েস্ট Worker চালাত। এখন সবার জন্য একটাই URL = একটাই ক্যাশ এন্ট্রি।
// (`?ids=` সাপোর্ট রাখা আছে — পুরনো ক্যাশ করা পেজ/ক্লায়েন্টের জন্য।)
// আসল সত্য (দাম/স্টক) এখনো চেকআউটে সার্ভার-সাইডে যাচাই হয় — এটা শুধু পেজের UI তাজা রাখে।
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const idsParam = params.get('ids') || '';
  const catParam = (params.get('cat') || '').trim().toLowerCase();
  // ইনপুট যাচাই: শুধু নিরাপদ আইডি-অক্ষর, সর্বোচ্চ ৬০টা
  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z0-9_-]{1,40}$/.test(s))
    .slice(0, 60);

  // `ids` দেওয়া হয়েছে কিন্তু একটাও বৈধ নয় → ৪০০। `ids` আদৌ না দিলে → সব প্রোডাক্ট (নিচে)।
  if (idsParam && !ids.length) {
    return NextResponse.json({ items: [], total: 0 }, { status: 400 });
  }

  // 🆕 ক্যাটাগরি অনুযায়ী (`?cat=rgb`): প্রোডাক্ট পেজ নিজের ক্যাটাগরির তালিকাই চায় — পুরো ক্যাটালগ নয়। এজ-ক্যাশে
  // ক্যাটাগরি-প্রতি একটা এন্ট্রি (~১৫–২০টা)। 🛡️ অজানা/খালি ক্যাটাগরিতে `no-store` — যাতে ইচ্ছেমতো `?cat=` বানিয়ে
  // এজ-ক্যাশ ভরানো না যায় (Worker তখন শুধু মেমোরির ক্যাশ ছেঁকে ফাঁকা উত্তর দেয়; ক্লায়েন্ট তখন আগের সরাসরি পথে যায়)।
  if (catParam) {
    if (!/^[a-z0-9_-]{1,40}$/.test(catParam)) {
      return NextResponse.json({ items: [], total: 0 }, { status: 400 });
    }
    try {
      const items = await getLiveProductsForCategory(catParam);
      return NextResponse.json(
        { items, total: items.length },
        { headers: { 'Cache-Control': items.length ? 'public, max-age=60, s-maxage=600, stale-while-revalidate=600' : 'no-store' } },
      );
    } catch {
      return NextResponse.json({ items: [], total: 0 }, { status: 503 });
    }
  }

  try {
    const all = await getCachedLiveProducts();
    const wanted = new Set(ids);
    const items = ids.length ? all.filter((p) => wanted.has(String(p.id))) : all;
    return NextResponse.json(
      { items, total: all.length },
      // s-maxage=600: Workers Caching এজে ১০ মিনিট রাখে (Worker জাগে না); max-age=60: ব্রাউজারে ১ মিনিট।
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=600' } },
    );
  } catch {
    return NextResponse.json({ items: [], total: 0 }, { status: 503 });
  }
}

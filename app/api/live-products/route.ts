import { NextRequest, NextResponse } from 'next/server';
import { getCachedLiveProducts } from '@/lib/liveProducts';

// দাম/স্টক/ব্যাজের লাইভ-চেক (প্রোডাক্ট পেজ)। ডাটাবেজ থেকে নয় — ১০ মিনিটের সার্ভার-ক্যাশ থেকে
// (lib/liveProducts.ts)। ব্রাউজারও ৬০ সেকেন্ড নিজে রাখে, তাই একই ভিজিটরের বারবার রিকোয়েস্টও কম।
//
// 🛡️ রিকোয়েস্ট-সেভিং (২০২৬-১১): `ids` এখন ঐচ্ছিক। ক্লায়েন্ট কোনো `ids` ছাড়াই ডাকে → সব প্রোডাক্টের হালকা
// তালিকা (id/দাম/পুরনো দাম/স্টক/ব্যাজ) ফেরত আসে। আগে প্রতিটা প্রোডাক্ট পেজ আলাদা `?ids=...` পাঠাত, ফলে প্রতিটা
// আলাদা Workers-Cache কী হতো আর প্রায় সব রিকোয়েস্ট Worker চালাত। এখন সবার জন্য একটাই URL = একটাই ক্যাশ এন্ট্রি।
// (`?ids=` সাপোর্ট রাখা আছে — পুরনো ক্যাশ করা পেজ/ক্লায়েন্টের জন্য।)
// আসল সত্য (দাম/স্টক) এখনো চেকআউটে সার্ভার-সাইডে যাচাই হয় — এটা শুধু পেজের UI তাজা রাখে।
export async function GET(req: NextRequest) {
  const idsParam = new URL(req.url).searchParams.get('ids') || '';
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

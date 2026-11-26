// ফাইলের পাথ: app/api/search-index/route.ts
// নেভবার-সার্চ ড্রপডাউন, কার্ট সাইডবার, কুইক-অর্ডার ও সার্চ পেজ — সবাই এই হালকা ইনডেক্স নেয়।
//
// 🛠️ ফিক্স: আগে এখানে `force-static` ছিল — মানে ডিপ্লয়ের সময় বানানো আলাদা একটা কপি,
// যেটা /search পেজের (unstable_cache) কপির সাথে মিলত না। ফলে ড্রপডাউনে প্রোডাক্ট দেখালেও
// রেজাল্ট পেজে "০টি পণ্য" আসত। এখন দুটোই একই `getCachedCatalogIndex()` থেকে পড়ে —
// একটাই ক্যাশ, তাই কখনো আলাদা হতে পারে না। অ্যাডমিন বদলালে 'catalog' ট্যাগ মুছলে দুটোই নতুন হয়।
// CDN-এ ১ ঘণ্টা (s-maxage=3600; আগে ১০ মিনিট) — রিকোয়েস্ট/CPU সাশ্রয়। ⚠️ দাম/ব্যাজ/নতুন/মোছা/ক্রম বদলালে
// revalidate-catalog 'search' ট্যাগ মোছে আর এজ-ক্যাশও পার্জ করে (app/api/revalidate-catalog/route.ts), তাই অ্যাডমিন-বদল
// ১ ঘণ্টা অপেক্ষা করে না। শুধু স্টক/বিবরণ বদল ডিজাইন অনুযায়ী 'search' মোছে না — সেগুলো আগের মতোই TTL-এ ঠিক হয়।

import { NextResponse } from 'next/server';
import { getCachedCatalogIndex } from '@/lib/catalogIndex';

export async function GET() {
  try {
    const products = await getCachedCatalogIndex();
    return NextResponse.json(
      { products },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=300' } },
    );
  } catch {
    return NextResponse.json({ products: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

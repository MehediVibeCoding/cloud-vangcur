// ফাইলের পাথ: lib/liveProducts.ts
// [NEW] সব প্রোডাক্টের "লাইভ" ছোট ডেটা (id, দাম, পুরনো দাম, স্টক, ব্যাজ) — সার্ভারে ৩ মিনিট (১৮০ সেকেন্ড) ক্যাশ।
// /api/live-products এটা থেকে উত্তর দেয়, ProductDetailClient-এর দাম/স্টক-রিফ্রেশ এখন সেই এন্ডপয়েন্ট
// ডাকে — তাই হাজার ভিজিটর একই সময়ে প্রোডাক্ট-পেজে থাকলেও ডাটাবেজে কোয়েরি যায় মিনিটে ~১টা
// (আগে প্রতিটি ভিজিটরের ব্রাউজার থেকে আলাদা কোয়েরি যেত)। অ্যাডমিন বদলালে revalidateTag('catalog') মুছে দেয়।
// 🛡️ শুধু পাবলিক কলাম — specs/_profit-এর মতো অ্যাডমিন-অনলি কিছু এখানে আসে না। মান-রূপান্তর হুবহু
// lib/productData.ts-এর mapCustomProduct-এর মতো (দাম/স্টক সংখ্যা, old না থাকলে দাম)।

import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

export interface LiveProduct {
  id: number | string;
  price: number;
  old: number;
  stock: number;
  badge: string;
}

type RawLiveRow = { id: number | string; price: unknown; old: unknown; stock: unknown; badge: string | null };

const PAGE = 1000; // PostgREST-এর একবারে সর্বোচ্চ সারি

export const getCachedLiveProducts = unstable_cache(
  async (): Promise<LiveProduct[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('supabase env missing');
    const supabase = createClient(url, key);

    const out: LiveProduct[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from('custom_products')
        .select('id,price,old,stock,badge')
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
        .abortSignal(AbortSignal.timeout(4000));
      // ব্যর্থতা throw করে — unstable_cache থ্রো-করা ফলাফল ক্যাশে রাখে না (খালি তালিকা ৬০ সেকেন্ড আটকে থাকবে না)
      if (error || !data) throw new Error(error?.message || 'live products fetch failed');
      for (const r of data as RawLiveRow[]) {
        out.push({
          id: r.id,
          price: Number(r.price) || 0,
          old: Number(r.old) || Number(r.price) || 0,
          stock: r.stock !== undefined && r.stock !== null ? Number(r.stock) : 0,
          badge: r.badge || '',
        });
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return out;
  },
  ['vc-live-products-v1'],
  // ৬০ থেকে ১৮০ সেকেন্ড: Cloudflare Free-তে KV-তে দিনে মাত্র ১,০০০ লেখা — ৬০ সেকেন্ডে দিনে ১,৪৪০ লেখা
  // লাগতে পারত। ১৮০ সেকেন্ডে সর্বোচ্চ ৪৮০। (অ্যাডমিন বদলালে revalidateTag('catalog') সঙ্গে সঙ্গে মুছে দেয়,
  // আর গ্রাহকের কাছে আসল দাম/স্টক চেকআউটে সার্ভার-সাইডে যাচাই হয়, তাই ৩ মিনিটের দেরি নিরাপদ।)
  { revalidate: 180, tags: ['catalog'] },
);

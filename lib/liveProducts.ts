// ফাইলের পাথ: lib/liveProducts.ts
// [NEW] সব প্রোডাক্টের "লাইভ" ছোট ডেটা (id, দাম, পুরনো দাম, স্টক, ব্যাজ) — সার্ভারে ১০ মিনিট (৬০০ সেকেন্ড) ক্যাশ।
// /api/live-products এটা থেকে উত্তর দেয়, ProductDetailClient-এর দাম/স্টক-রিফ্রেশ এখন সেই এন্ডপয়েন্ট
// ডাকে — তাই হাজার ভিজিটর একই সময়ে প্রোডাক্ট-পেজে থাকলেও ডাটাবেজে কোয়েরি যায় মিনিটে ~১টা
// (আগে প্রতিটি ভিজিটরের ব্রাউজার থেকে আলাদা কোয়েরি যেত)। অ্যাডমিন বদলালে revalidateTag('catalog') মুছে দেয়।
// 🛡️ শুধু পাবলিক কলাম — specs/_profit-এর মতো অ্যাডমিন-অনলি কিছু এখানে আসে না। মান-রূপান্তর হুবহু
// lib/productData.ts-এর mapCustomProduct-এর মতো (দাম/স্টক সংখ্যা, old না থাকলে দাম)।

import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { prodInCat } from '@/lib/productData';

export interface LiveProduct {
  id: number | string;
  price: number;
  old: number;
  stock: number;
  badge: string;
}

type RawLiveRow = {
  id: number | string; price: unknown; old: unknown; stock: unknown; badge: string | null;
  cat: string | null; cats: string[] | null;
};

// ক্যাশ-করা সারিতে ক্যাটাগরি-সদস্যতার জন্য cat/cats-ও থাকে (ক্লায়েন্টকে পাঠানো আইটেমে নয় — নিচের getLiveProductsForCategory ছেঁটে দেয়)
interface LiveRow extends LiveProduct {
  cat: string;
  cats: string[];
}

const PAGE = 1000; // PostgREST-এর একবারে সর্বোচ্চ সারি

const getCachedLiveRows = unstable_cache(
  async (): Promise<LiveRow[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('supabase env missing');
    const supabase = createClient(url, key);

    const out: LiveRow[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from('custom_products')
        .select('id,price,old,stock,badge,cat,cats')
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
          // mapCustomProduct-এর ডিফল্টের হুবহু একই (cat ফাঁকা হলে 'rgb', cats ফাঁকা হলে [cat]) — prodInCat-এর ফলাফল যেন না বদলায়
          cat: r.cat || 'rgb',
          cats: Array.isArray(r.cats) && r.cats.length ? r.cats : [r.cat || 'rgb'],
        });
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return out;
  },
  // v2: সারিতে cat/cats যোগ হওয়ায় কী বদলানো — পুরনো (cat-হীন) ক্যাশ আর ব্যবহার হবে না
  ['vc-live-products-v2'],
  // ৬০ → ১৮০ → ৬০০ সেকেন্ড (২০২৬-১১): Cloudflare Free-তে KV-তে দিনে মাত্র ১,০০০ লেখা — ৬০ সেকেন্ডে দিনে ১,৪৪০,
  // ১৮০ সেকেন্ডে ৪৮০, ৬০০ সেকেন্ডে সর্বোচ্চ ১৪৪। (অ্যাডমিন বদলালে revalidateTag('catalog') সার্ভার-ক্যাশ সঙ্গে সঙ্গে
  // মুছে দেয়; তবে এজ-ক্যাশ (s-maxage=600) পর্যন্ত পেজে পুরনো দাম/স্টক দেখা যেতে পারে। আসল দাম/স্টক চেকআউটে
  // সার্ভার-সাইডে যাচাই হয়, তাই ১০ মিনিটের দেরি নিরাপদ।)
  { revalidate: 600, tags: ['catalog', 'live'] },
);

function toLive(r: LiveRow): LiveProduct {
  return { id: r.id, price: r.price, old: r.old, stock: r.stock, badge: r.badge };
}

/** সব প্রোডাক্টের লাইভ তালিকা (পুরনো ক্যাশ-করা পেজ/ক্লায়েন্টের জন্য — `?cat=`/`?ids=` ছাড়া ডাকলে) */
export async function getCachedLiveProducts(): Promise<LiveProduct[]> {
  return (await getCachedLiveRows()).map(toLive);
}

/**
 * একটা ক্যাটাগরির লাইভ তালিকা। একই ১টা সার্ভার-ক্যাশ (১,০০০ সারি, ১০ মিনিটে ১টা কোয়েরি) থেকে মেমোরিতে ছাঁটা —
 * তাই নতুন কোনো ক্যাশ-এন্ট্রি/ডাটাবেজ কল লাগে না, আর ভিজিটরের পেলোড পুরো ক্যাটালগের ~১/১৫–২০ অংশ।
 * ক্যাটাগরি মেলানো prodInCat দিয়ে — fetchRelatedProducts/রিলেটেড-লিস্টের হুবহু একই নিয়ম।
 */
export async function getLiveProductsForCategory(category: string): Promise<LiveProduct[]> {
  const rows = await getCachedLiveRows();
  return rows.filter((r) => prodInCat(r, category)).map(toLive);
}

// ফাইলের পাথ: lib/catalogIndex.ts
// [NEW] সার্ভার-সাইডে হালকা ক্যাটালগ ইনডেক্স (৫ মিনিট ক্যাশ, কুকি ছাড়া anon ক্লায়েন্ট)।
// /search পেজ ও /api/search-index দুটোই এটা ব্যবহার করে — ফলে প্রতিটা সার্চ-ভিজিটে ডাটাবেস
// থেকে পুরো ক্যাটালগ আনা হয় না। অ্যাডমিন প্রোডাক্ট বদলালে revalidateTag('catalog') ক্যাশ মুছে দেয়
// (app/api/revalidate-catalog/route.ts)।

import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { fetchCustomProducts } from '@/lib/productData';
import { fetchCategories } from '@/lib/categoryData';
import type { Category, Product } from '@/types';

export const getCachedCatalogIndex = unstable_cache(
  async (): Promise<Product[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const supabase = createClient(url, key);
    const all = await fetchCustomProducts(supabase);
    return all.map(toIndexProduct);
  },
  // 🆕 v3: ইনডেক্সে `brand` যোগ (সার্চ-ম্যাচিং ও ব্র্যান্ড-ফিল্টারের জন্য) — কী বদলানোয় brand-হীন পুরনো ক্যাশ আর ব্যবহার হবে না
  ['catalog-index-v3'],
  { revalidate: 300, tags: ['catalog'] },
);

// ইনডেক্সের একেকটা প্রোডাক্টে শুধু সেই ফিল্ডগুলোই রাখা হয় যা এর ব্যবহারকারীরা সত্যিই পড়ে:
//  • সার্চ (lib/searchData.ts): name, nameBn, tags, desc, cat, brand, specs-এর মান
//  • সার্চ ফিল্টার (lib/searchFilters.ts): brand, price, stock, id
//  • প্রোডাক্ট কার্ড (সার্চ রেজাল্ট): id, name, price, old, rating, badge, stock, imgs[0]
//  • নেভবার ড্রপডাউন: id, name, price, stock, cat, imgs[0]
//  • কার্ট/কুইক-অর্ডার (stock চেক): id, stock, price, name, cat, imgs[0]
// বাদ যায়: প্রথম ছবির পরের সব ছবি (কেউ [0]-এর বেশি পড়ে না), এবং সব খালি/অব্যবহৃত ফিল্ড
// (features, faqs, closing, powerInfo, infoBoxes, seo*, meta*, packagingContent, color*, longDesc…)।
// 🛡️ নতুন কোনো ফিল্ড এই ইনডেক্সের ব্যবহারকারীরা পড়তে শুরু করলে এখানে যোগ করতে হবে।
// ছোট কিন্তু Product টাইপে বাধ্যতামূলক ফিল্ডগুলো (cats, warranty, discountColor, _detailLoaded) রাখা হলো।
function toIndexProduct(p: Product): Product {
  return {
    id: p.id,
    cat: p.cat,
    cats: p.cats,
    name: p.name,
    nameBn: p.nameBn,
    tags: p.tags,
    brand: p.brand, // ব্যাচ ৯: আগে এখানে বাদ পড়ত — তাই ব্র্যান্ড-সার্চ আসলে কাজ করত না
    price: p.price,
    old: p.old,
    stock: p.stock,
    badge: p.badge,
    rating: p.rating,
    warranty: p.warranty,
    discountColor: p.discountColor,
    specs: p.specs,
    // বড় টেক্সট ছাঁটা — সার্চ ও কার্টে এতটুকুই লাগে
    desc: (p.desc || '').slice(0, 160),
    imgs: (p.imgs || []).slice(0, 1),
    _detailLoaded: false,
  };
}

// সার্চ পেজের ক্যাটাগরি তালিকা — আগে প্রতিটা সার্চ-ভিজিটে সরাসরি ডাটাবেস থেকে আনা হতো।
// এখন একই ৫ মিনিটের ক্যাশ + একই 'catalog' ট্যাগ (অ্যাডমিন বদলালে একসাথে মুছে যায়)।
export const getCachedCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    return fetchCategories(createClient(url, key));
  },
  ['catalog-categories-v1'],
  { revalidate: 300, tags: ['catalog'] },
);

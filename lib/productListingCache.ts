// ফাইলের পাথ: lib/productListingCache.ts
// [NEW] সার্ভার-সাইডে প্রোডাক্ট-লিস্টিংয়ের ক্যাশ (৫ মিনিট, কুকি ছাড়া anon ক্লায়েন্ট, 'catalog' ট্যাগ)।
//
// কেন: /products পেজ আর হোমের ক্যাটাগরি-বদল (fetchProductsPageAction) আগে প্রতিটি ভিজিটে ডাটাবেজ থেকে
// পুরো ক্যাটালগের হালকা সারি (id, cat, cats, stock) স্ক্যান করত — /products-এ দুইবার (প্রোব + আসল পেজ),
// তার ওপর ক্যাটাগরি-তালিকা ও পেজের ভারী ডেটা। এই মডিউল সেই স্ক্যান আর পেজ-ডেটা ক্যাশে রাখে, তাই
// ভিজিটর যত-ই বাড়ুক ডাটাবেজে কোয়েরি যায় ৫ মিনিটে (বা অ্যাডমিন বদলালে) একবার।
// অ্যাডমিন প্রোডাক্ট বদলালে revalidateTag('catalog') সব একসাথে মুছে দেয় (app/api/revalidate-catalog)।
//
// 🛡️ ক্যাশ-কী ঘেঁটে দেওয়ার (cache-bust) আক্রমণ ঠেকাতে: ক্যাটাগরি lowercase+trim করা হয়; অজানা
// ক্যাটাগরির ক্ষেত্রে ক্যাশ-করা সারি থেকেই খালি উত্তর আসে (কোনো নতুন ক্যাশ-এন্ট্রি/ডাটাবেজ কল ছাড়া);
// পেজ নম্বর ক্ল্যাম্প হয়ে আসে; আর ক্যাশ-করা পেজ-কোয়েরি শুধু নির্দিষ্ট (offset, limit) কম্বিনেশনে।
//
// ব্যর্থতা কখনো ক্যাশে বসে না: ভেতরের ফাংশন ব্যর্থ হলে throw করে (unstable_cache থ্রো-করা ফলাফল রাখে না),
// আর বাইরের ফাংশনগুলো তখন আগের সরাসরি-ডাটাবেজ পথে ফিরে যায় — আচরণ আগের মতোই।

import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import {
  fetchOrderedRows,
  orderedIdsForCategory,
  fetchProductsPage,
  fetchProductsPageFromIds,
  computeProductsListPaging,
  PRODUCTS_PAGE_SIZE,
  type ProductsPageResult,
  type OrderedIdRow,
} from '@/lib/productData';
import { getCachedCategories } from '@/lib/catalogIndex';
import { DEFAULT_CATEGORIES } from '@/lib/categoryData';
import type { Category } from '@/types';

type Paging = ReturnType<typeof computeProductsListPaging>;

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** ক্যাটাগরির ক্যাশ-কী: prodInCat-ও lowercase+trim করে মেলায়, তাই ফলাফল একই — শুধু কী-র বৈচিত্র্য কমে */
export function normalizeCat(category: string | null | undefined): string {
  return String(category || '').trim().toLowerCase() || 'all';
}

const getCachedOrderedRows = unstable_cache(
  async (): Promise<OrderedIdRow[]> => {
    const supabase = anonClient();
    if (!supabase) throw new Error('supabase env missing');
    const rows = await fetchOrderedRows(supabase);
    if (!rows) throw new Error('ordered rows fetch failed'); // ব্যর্থতা ক্যাশে বসবে না
    return rows;
  },
  ['vc-ordered-rows-v1'],
  { revalidate: 300, tags: ['catalog'] },
);

/**
 * F4: ক্যাটাগরিতে অন্তত একটা প্রোডাক্ট আছে কিনা — ক্যাশ-করা হালকা সারি (id, cat, cats, stock) থেকে,
 * তাই নতুন ডাটাবেজ কোয়েরি লাগে না। ব্যর্থ হলে null ("জানি না") — কলার তখন পেজ noindex করবে না,
 * যাতে সাময়িক ডাটাবেজ-ত্রুটিতে আসল ক্যাটাগরি ভুলে সার্চ থেকে বাদ না পড়ে।
 */
export async function categoryHasProductsCached(category: string): Promise<boolean | null> {
  try {
    const rows = await getCachedOrderedRows();
    return orderedIdsForCategory(rows, normalizeCat(category)).length > 0;
  } catch {
    return null;
  }
}

// একটা (ক্যাটাগরি, offset, limit)-এর পেজ — ভারী GRID_COLS সহ। শুধু আগে থেকে জানা, সীমিত কম্বিনেশনে ডাকা হয়।
const getCachedProductsPage = unstable_cache(
  async (cat: string, offset: number, limit: number): Promise<ProductsPageResult> => {
    const supabase = anonClient();
    if (!supabase) throw new Error('supabase env missing');
    const rows = await fetchOrderedRows(supabase);
    if (!rows) throw new Error('ordered rows fetch failed');
    const ids = orderedIdsForCategory(rows, cat);
    return fetchProductsPageFromIds(supabase, ids, offset, limit, true);
  },
  ['vc-products-page-v1'],
  { revalidate: 300, tags: ['catalog'] },
);

export interface ProductsListingData {
  cats: Category[];
  paging: Paging;
  productsPage: ProductsPageResult;
}

/**
 * /products পেজের ডেটা (ক্যাটাগরি-তালিকা, পেজিং, পেজের প্রোডাক্ট) — সবই ক্যাশ থেকে।
 * কোনো কারণে ব্যর্থ হলে null; তখন পেজ আগের সরাসরি-ডাটাবেজ কোডে ফিরে যায়।
 */
export async function loadProductsListingCached(
  category: string,
  requestedPage: number,
): Promise<ProductsListingData | null> {
  try {
    const cat = normalizeCat(category);
    const [catsRaw, rows] = await Promise.all([getCachedCategories(), getCachedOrderedRows()]);
    const cats = catsRaw.length ? catsRaw : DEFAULT_CATEGORIES;

    const ids = orderedIdsForCategory(rows, cat);
    const paging = computeProductsListPaging(ids.length, requestedPage);

    // অজানা/খালি ক্যাটাগরি: আগের মতোই খালি তালিকা, কিন্তু কোনো ডাটাবেজ কল বা নতুন ক্যাশ-এন্ট্রি ছাড়া
    const productsPage: ProductsPageResult = ids.length
      ? await getCachedProductsPage(cat, paging.offset, paging.limit)
      : { products: [], hasMore: false, total: 0 };

    return { cats, paging, productsPage };
  } catch {
    return null;
  }
}

function clampInt(v: number, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

/**
 * হোমপেজের "ক্যাটাগরি বদলানো / আরও লোড" (server action) — ProductGrid এটাই ডাকে।
 * ক্যাটাগরি-বদলের (offset 0, limit = PRODUCTS_PAGE_SIZE) পেজ পুরোটা ক্যাশ থেকে; অন্য কম্বিনেশনে
 * (ডিপ-লিংকে ফোকাস-করা প্রোডাক্ট) ক্যাশ-করা সারি থেকে আইডি বের করে শুধু পেজের কোয়েরি সরাসরি।
 */
export async function fetchProductsPageForAction(
  category: string,
  offset: number,
  limit: number,
): Promise<ProductsPageResult> {
  const cat = normalizeCat(category);
  const off = clampInt(offset, 0, 100000);
  const lim = clampInt(limit, 1, 180);
  try {
    const rows = await getCachedOrderedRows();
    const ids = orderedIdsForCategory(rows, cat);
    if (!ids.length) return { products: [], hasMore: false, total: 0 };

    if (off === 0 && lim === PRODUCTS_PAGE_SIZE) {
      return await getCachedProductsPage(cat, 0, lim);
    }
    const supabase = anonClient();
    if (!supabase) throw new Error('supabase env missing');
    return await fetchProductsPageFromIds(supabase, ids, off, lim, true);
  } catch {
    // ক্যাশ/কোয়েরি ব্যর্থ — আগের সরাসরি পথ
    const supabase = anonClient();
    if (!supabase) return { products: [], hasMore: false, total: 0 };
    return fetchProductsPage(supabase, cat, off, lim);
  }
}

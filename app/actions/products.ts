'use server';

import { fetchProductsPageForAction } from '@/lib/productListingCache';
import type { ProductsPageResult } from '@/lib/productData';

/**
 * হোমপেজের প্রোডাক্ট-গ্রিডের জন্য পেজিনেটেড ফেচ (audit P1-16)।
 * ক্যাটাগরি বদলানো বা স্ক্রল করে "আরও দেখুন"-এর সময় ProductGrid এটা কল করে —
 * প্রতিবার পুরো ক্যাটালগ না এনে শুধু দরকারি পেজটুকু আনে।
 *
 * 🆕 এখন ক্যাশ-করা (৫ মিনিট, 'catalog' ট্যাগ): ক্যাটাগরি-বদলের পেজ ভিজিটর-প্রতি আলাদা করে
 * ডাটাবেজ থেকে আসে না — lib/productListingCache.ts দেখুন। (প্রোডাক্ট ডেটা সবার জন্য পাবলিক,
 * তাই আগের কুকি-সহ ক্লায়েন্টের বদলে anon ক্লায়েন্ট ব্যবহার — ফলাফল একই।)
 */
export async function fetchProductsPageAction(
  category: string,
  offset: number,
  limit: number,
): Promise<ProductsPageResult> {
  return fetchProductsPageForAction(category, offset, limit);
}

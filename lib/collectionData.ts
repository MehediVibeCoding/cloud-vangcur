// ফাইলের পাথ: lib/collectionData.ts
// ─────────────────────────────────────────────────────────────────────────────
// /collection/<id> পেজের ডেটা — কোন প্রোডাক্ট কোন কালেকশনে আছে।
//
// সংযোগ: custom_products.collections (text[]) কলামে 'gift' / 'premium' / 'unique' / 'cute' থাকে।
// এটা ক্যাটাগরি (cat/cats) থেকে সম্পূর্ণ আলাদা — একটা প্রোডাক্ট ক্যাটাগরিতেও থাকতে পারে,
// আবার একই সাথে এক বা একাধিক কালেকশনেও।
//
// 🛡️ হোম পেজ/ক্যাটাগরি/সার্চ — কোনোটাই `collections` কলাম পড়ে না; শুধু এই ফাইলের কুয়েরি পড়ে।
// তাই কলাম (Mehediadmin/_migration_reference/002_product_collections.sql) না থাকলেও বাকি সাইট ঠিকঠাক চলে।
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';
import { mapCustomProduct } from './productData';
import { COLLECTION_IDS, type CollectionId } from './showcaseData';
import { logWarn } from './logger';

// productData.ts-এর GRID_COLS-এর সাথে একই কলাম (প্রোডাক্ট কার্ডের জন্য যা লাগে)
const GRID_COLS = 'id,cat,cats,name,name_bn,price,old,stock,badge,warranty,rating,imgs,specs,color_group_id,color_name,color_swatch,seo_h1';

// এক কালেকশন পেজে সর্বোচ্চ কয়টা প্রোডাক্ট দেখাবে
export const COLLECTION_PAGE_LIMIT = 120;

const QUERY_TIMEOUT_MS = 4000;

export function isCollectionId(value: string): value is CollectionId {
  return (COLLECTION_IDS as readonly string[]).includes(value);
}

export async function fetchCollectionProducts(supabase: SupabaseClient, collectionId: CollectionId): Promise<Product[]> {
  try {
    let signal: AbortSignal | undefined;
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      signal = AbortSignal.timeout(QUERY_TIMEOUT_MS);
    }

    const { data, error } = await supabase
      .from('custom_products')
      .select(GRID_COLS)
      .contains('collections', [collectionId])
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .limit(COLLECTION_PAGE_LIMIT)
      .abortSignal(signal as AbortSignal);

    if (error || !data) {
      logWarn('[Vangcur] fetchCollectionProducts error:', error?.message);
      return [];
    }

    const mapped = (data as unknown as Parameters<typeof mapCustomProduct>[0][]).map(mapCustomProduct);
    // স্টক-আউট প্রোডাক্ট শেষে (বাকি ক্রম অক্ষত — stable sort), ক্যাটাগরি পেজের মতোই
    return [...mapped].sort((a, b) => (a.stock <= 0 ? 1 : 0) - (b.stock <= 0 ? 1 : 0));
  } catch (e) {
    logWarn('[Vangcur] fetchCollectionProducts exception:', e);
    return [];
  }
}

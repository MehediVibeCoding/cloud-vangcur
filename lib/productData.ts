import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product, CartItem } from '@/types';
import { logWarn, logError } from './logger';
import { useCartStore, cartTotal } from './store/cartStore';
import { OPEN_ORDER_LIMIT_EVENT, OPEN_BULK_ORDER_EVENT, OPEN_QUICK_CART_MODAL_EVENT } from './uiEvents';
import { MAX_ONLINE_ORDER_TOTAL, checkIsPrivilegedClient } from './checkoutData';
import { MAX_QTY_PER_PRODUCT } from './cartLimits';
import { suppressHistoryCleanup } from './useHistoryModal';
import { guardPendingLock } from './pendingLock';
import { createClient } from './supabase/client';

function getTimeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }
  return undefined;
}

export function prodInCat(p: Pick<Product, 'cat' | 'cats'>, catId: string): boolean {
  const targetCat = String(catId || '').trim().toLowerCase();
  if (!targetCat || targetCat === 'all') return true;
  if (Array.isArray(p.cats) && p.cats.length) {
    return p.cats.some((c) => String(c || '').trim().toLowerCase() === targetCat);
  }
  return String(p.cat || '').trim().toLowerCase() === targetCat;
}

// 🆕 (প্রোডাক্ট স্কেল ফিক্স, ২০২৬-১০): আগে প্রোডাক্টের সাজানো ক্রম store_settings-এর
// `vc_prod_order` নামের একটা JSON array-তে থাকত — পড়তে হতো আলাদা কুয়েরিতে, তারপর এই
// ফাংশন দিয়ে ব্রাউজার/সার্ভারে সাজাতে হতো। এখন custom_products টেবিলেই sort_order
// কলাম আছে, তাই প্রোডাক্ট কুয়েরিতে সরাসরি `.order('sort_order')` দিলেই ডাটাবেজ থেকে
// সঠিক ক্রমে আসে — আলাদা কুয়েরি বা এই ফাংশন আর লাগে না (তাই সরানো হলো)।

function parseJsonish<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val as T;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

interface RawCustomProduct {
  id: number | string;
  cat?: string;
  cats?: string[];
  name?: string;
  name_bn?: string;
  price?: number | string;
  old?: number | string;
  stock?: number | string;
  badge?: string;
  warranty?: string;
  rating?: number | string;
  imgs?: unknown;
  specs?: unknown;
  desc_text?: string;
  desc?: string;
  long_desc?: string;
  features?: string[];
  faqs?: { q: string; a: string }[];
  closing?: string;
  power_info?: string | null;
  info_boxes?: unknown;
  seo_h1?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_description?: string | null;
  quick_specs_text?: string | null;
  packaging_content?: string | null;
  color_group_id?: string | null;
  color_name?: string | null;
  color_swatch?: string | null;
}

export function mapCustomProduct(p: RawCustomProduct): Product {
  const rawSpecs = parseJsonish(p.specs, (p.specs as Record<string, string>) || {}) as Record<string, unknown>;
  // 🛡️ ফিক্স (audit P0-01): specs কলামে অ্যাডমিন-অনলি ইন্টারনাল কী (যেমন
  // `_profit` — প্রতি ইউনিটের লাভ) থাকে। আগে পুরো specs হুবহু ব্রাউজারে পাঠানো
  // হতো, ফলে যে কেউ পেজের HTML/RSC payload দেখে প্রোডাক্টের লাভের মার্জিন জেনে
  // যেতে পারত। এখন "_" দিয়ে শুরু হওয়া যেকোনো internal কী (`_profit`,
  // `_discount_color`, লেগ্যাসি `_quick_keys` ইত্যাদি) পাবলিক আউটপুট থেকে
  // বাদ — শুধু `_discount_color`-এর মান (UI রঙের জন্য দরকার) আলাদাভাবে বের
  // করে রাখা হচ্ছে।
  const discountColor = (rawSpecs._discount_color as string) || '';
  const specs: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawSpecs)) {
    if (!k.startsWith('_')) specs[k] = v as string;
  }

  let imgs = p.imgs as unknown;
  if (typeof imgs === 'string') imgs = parseJsonish<string[]>(imgs, imgs ? [imgs] : ['📦']);
  if (!Array.isArray(imgs) || !imgs.length) imgs = ['📦'];
  return {
    id: p.id,
    cat: p.cat || 'rgb',
    cats: p.cats || [p.cat || 'rgb'],
    name: p.name || '',
    nameBn: p.name_bn || '',
    price: Number(p.price) || 0,
    old: Number(p.old) || Number(p.price) || 0,
    stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : 0,
    badge: p.badge || '',
    discountColor,
    warranty: (p.warranty || '').trim(), // খালি = ওয়ারেন্টি নেই → সাইটে ওয়ারেন্টি অংশ দেখাবে না
    rating: Number(p.rating) || 4.5,
    imgs: imgs as string[],
    specs,
    desc: p.desc_text || p.desc || '',
    longDesc: p.long_desc || p.desc_text || p.desc || '',
    features: Array.isArray(p.features) ? p.features : [],
    faqs: Array.isArray(p.faqs) ? p.faqs : [],
    closing: p.closing || '',
    powerInfo: p.power_info || '',
    infoBoxes: Array.isArray(p.info_boxes) ? (p.info_boxes as { title: string; body: string }[]) : parseJsonish(p.info_boxes, []),
    seoH1: p.seo_h1 || '',
    metaTitle: p.meta_title || '',
    metaDescription: p.meta_description || '',
    ogDescription: p.og_description || '',
    quickSpecsText: p.quick_specs_text || '',
    packagingContent: p.packaging_content || '',
    colorGroupId: p.color_group_id || null,
    colorName: p.color_name || null,
    colorSwatch: p.color_swatch || null,
    _detailLoaded: !!(p.long_desc || p.features || p.faqs),
  };
}

const GRID_COLS = 'id,cat,cats,name,name_bn,price,old,stock,badge,warranty,rating,imgs,specs,color_group_id,color_name,color_swatch';
const DETAIL_COLS = `${GRID_COLS},desc_text,long_desc,features,faqs,closing,power_info,info_boxes,seo_h1,meta_title,meta_description,og_description,quick_specs_text,packaging_content`;

const QUERY_TIMEOUT_MS = 4000;
const RETRY_DELAY_MS = 400;
// 🆕 Supabase/PostgREST একবারে ডিফল্ট সর্বোচ্চ ১০০০ সারি দেয়। প্রোডাক্ট ১০০০ পার হলে
// আগে এখানে কিছু না বলেই লিস্ট চুপচাপ ১০০০-এ কেটে যেত (ঠিক listOrders-এ যে বাগ আগে
// ছিল, একই ধরনের)। তাই .range() দিয়ে পাতা ধরে ধরে সব সারি আনা হয়।
const SELECT_PAGE_SIZE = 1000;

function isPermissionError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42501' ||
    error.code === 'PGRST116' ||
    !!error.message?.includes('permission') ||
    !!error.message?.includes('policy')
  );
}

export async function fetchCustomProducts(supabase: SupabaseClient): Promise<Product[]> {
  let attempt = 0;
  const MAX_ATTEMPTS = 2;
  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    try {
      const rows: RawCustomProduct[] = [];
      let from = 0;
      for (;;) {
        const signal = getTimeoutSignal(QUERY_TIMEOUT_MS);
        const { data: sbProds, error } = await supabase
          .from('custom_products')
          .select(GRID_COLS)
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + SELECT_PAGE_SIZE - 1)
          .abortSignal(signal as any);

        if (error) {
          logWarn('[Vangcur] custom_products fetch error (attempt ' + attempt + '):', error.message, '| code:', error.code);
          if (isPermissionError(error)) {
            logError('[Vangcur] custom_products টেবিলে anon SELECT access নেই।');
            return [];
          }
          throw new Error(error.message);
        }
        if (!sbProds || !sbProds.length) break;
        rows.push(...(sbProds as unknown as RawCustomProduct[]));
        if (sbProds.length < SELECT_PAGE_SIZE) break; // শেষ ব্যাচ — আর পরের পাতা নেই
        from += SELECT_PAGE_SIZE;
      }
      if (!rows.length) return [];
      return rows.map(mapCustomProduct);
    } catch (e) {
      logWarn('[Vangcur] custom_products exception (attempt ' + attempt + '):', e);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  return [];
}

/**
 * ব্রাউজার-সাইডে সার্চ/কার্ট/কুইক-অর্ডারের জন্য হালকা ক্যাটালগ ইনডেক্স (CDN-ক্যাশ করা,
 * `/api/search-index`)। ব্যর্থ হলে আগের মতো সরাসরি Supabase থেকে ফলব্যাক — কিছু ভাঙে না।
 */
export async function fetchCatalogIndex(supabase: SupabaseClient): Promise<Product[]> {
  try {
    const res = await fetch('/api/search-index', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const json = (await res.json()) as { products?: Product[] };
      if (Array.isArray(json.products) && json.products.length) return json.products;
    }
  } catch {
    // নিচের ফলব্যাকে যাবে
  }
  return fetchCustomProducts(supabase);
}

export interface ProductsPageResult {
  products: Product[];
  hasMore: boolean;
  total: number;
}

// হোমপেজ/ক্যাটাগরি-পেজের প্রথম ব্যাচ আর "আরও লোড" ব্যাচের সাইজ — সার্ভার
// কম্পোনেন্ট (initial SSR fetch) আর ProductGrid.tsx (client, পরের ব্যাচ) —
// দুই জায়গাতেই একই কনস্ট্যান্ট থেকে আসে, যাতে আলাদা হয়ে না যায়
export const PRODUCTS_PAGE_SIZE = 24;
export const PRODUCTS_LOAD_MORE_BATCHES = [24, 36, 60, 84, 120, 180];

// 🆕 (পারফরম্যান্স অপটিমাইজেশন, ২০২৬-১০): হোমপেজের ইনফিনিটি স্ক্রল বাদ দিয়ে /products
// পেজে নাম্বার পেজিনেশন। হোমপেজে প্রথম PRODUCTS_PAGE_SIZE (২৪টা) প্রোডাক্ট দেখানো হয় বলে
// /products-এর পেজ-১ সেই ২৪টা বাদ দিয়ে ফ্রেশ শুরু হয় — একই প্রোডাক্ট দুই জায়গায় দেখানো
// হয় না। পেজ-প্রতি সাইজ (PRODUCTS_LIST_PAGE_SIZE) স্থায়ী থাকে — প্রোডাক্ট ৫০০ হোক বা
// ১৫০০, পেজ-প্রতি সংখ্যা একই, শুধু মোট পেজ সংখ্যা বাড়ে/কমে।
export const PRODUCTS_LIST_PAGE_SIZE = 119;
export const PRODUCTS_LIST_RESERVED_HOME = PRODUCTS_PAGE_SIZE;

export interface ProductsListPaging {
  page: number;
  offset: number;
  limit: number;
  totalPages: number;
}

/**
 * `total` (ক্যাটাগরিতে মোট প্রোডাক্ট সংখ্যা) আর অনুরোধ করা `requestedPage` থেকে
 * /products পেজের জন্য offset/limit/totalPages হিসাব করে। totalPages অন্তত ১ —
 * খালি ক্যাটালগেও পেজ-১ বৈধ থাকে (খালি-স্টেট UI দেখানোর জন্য)। requestedPage সীমার
 * বাইরে গেলে সবচেয়ে কাছের বৈধ পেজে ক্ল্যাম্প করা হয়।
 */
export function computeProductsListPaging(total: number, requestedPage: number): ProductsListPaging {
  const listable = Math.max(0, total - PRODUCTS_LIST_RESERVED_HOME);
  const totalPages = Math.max(1, Math.ceil(listable / PRODUCTS_LIST_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(requestedPage) || 1), totalPages);
  const offset = PRODUCTS_LIST_RESERVED_HOME + (page - 1) * PRODUCTS_LIST_PAGE_SIZE;
  return { page, offset, limit: PRODUCTS_LIST_PAGE_SIZE, totalPages };
}

// 🔒 ফিক্স (audit P1-16): হোমপেজে আগে fetchCustomProducts() দিয়ে পুরো ক্যাটালগ
// একসাথে আনা হতো (SSR পেলোডে) — কয়েকশো প্রোডাক্টে এটা ভারী হয়ে যাবে। এই ফাংশন
// প্রথমে শুধু id+cat+cats আনে (হালকা — সব প্রোডাক্ট মিলিয়েও ছোট), তা দিয়ে
// কাস্টম অর্ডার+ক্যাটাগরি-ফিল্টার করে সঠিক ID-ক্রম বের করে, তারপর ভারী
// GRID_COLS ডেটা শুধু ওই পেজের (limit-টা) আইডির জন্যই আনে — বাকিগুলো তখনই
// আনা হয় যখন স্ক্রল করে বা ক্যাটাগরি বদলে সেটা দরকার হয়।
export type OrderedIdRow = { id: number | string; cat: string | null; cats: string[] | null; stock: number };

/**
 * সব প্রোডাক্টের হালকা সারি (id, cat, cats, stock) — sort_order অনুযায়ী সাজানো।
 * ব্যর্থ হলে null (আগে এটা চুপচাপ [] দিত; এখন ক্যাশ-করা সংস্করণ যেন ব্যর্থতাকে "খালি ক্যাটালগ"
 * ভেবে ৫ মিনিট ধরে না রাখে, তাই ব্যর্থতা আলাদা করে চেনা যায়)।
 */
export async function fetchOrderedRows(supabase: SupabaseClient): Promise<OrderedIdRow[] | null> {
  const rows: OrderedIdRow[] = [];
  let from = 0;
  for (;;) {
    const signal = getTimeoutSignal(QUERY_TIMEOUT_MS);
    const { data, error } = await supabase
      .from('custom_products')
      .select('id, cat, cats, stock')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + SELECT_PAGE_SIZE - 1)
      .abortSignal(signal as any);
    if (error || !data) return null;
    rows.push(...(data as OrderedIdRow[]));
    if (data.length < SELECT_PAGE_SIZE) break; // শেষ পাতা
    from += SELECT_PAGE_SIZE;
  }
  return rows;
}

/** সারিগুলো থেকে ক্যাটাগরি-ফিল্টার করা, স্টক-আউট শেষে নেওয়া আইডি-ক্রম (পিউর ফাংশন, ডাটাবেজ কল নেই) */
export function orderedIdsForCategory(rows: OrderedIdRow[], category: string): (number | string)[] {
  const filtered = rows.filter((p) => prodInCat({ cat: p.cat || '', cats: p.cats || [] }, category));
  // sort_order অনুযায়ী ডাটাবেজ থেকেই সাজানো এসেছে (ওপরের .order()), তাই আলাদা করে
  // কাস্টম অর্ডার বসাতে হয় না — শুধু স্টক-আউট প্রোডাক্ট পুরো ক্যাটাগরি জুড়ে শেষে নেওয়া
  // হচ্ছে (নির্দিষ্ট পেজের ভেতরে না), stable sort বলে বাকি ক্রম অক্ষত থাকে
  const stableOrdered = [...filtered].sort((a, b) => (a.stock <= 0 ? 1 : 0) - (b.stock <= 0 ? 1 : 0));
  return stableOrdered.map((p) => p.id);
}

async function fetchOrderedFilteredIds(supabase: SupabaseClient, category: string): Promise<(number | string)[]> {
  const rows = await fetchOrderedRows(supabase);
  if (!rows) return [];
  return orderedIdsForCategory(rows, category);
}

/**
 * আইডি-তালিকা (আগে থেকে জানা) থেকে একটা পেজের ভারী GRID_COLS ডেটা আনে।
 * strict = true হলে কোয়েরি ব্যর্থ হলে throw করে (ক্যাশ-করা কলের জন্য — যাতে ব্যর্থ ফলাফল ক্যাশে না বসে)।
 */
export async function fetchProductsPageFromIds(
  supabase: SupabaseClient,
  allIds: (number | string)[],
  offset: number,
  limit: number,
  strict = false,
): Promise<ProductsPageResult> {
  const pageIds = allIds.slice(offset, offset + limit);
  if (!pageIds.length) return { products: [], hasMore: false, total: allIds.length };

  const signal = getTimeoutSignal(QUERY_TIMEOUT_MS);
  const { data: sbProds, error } = await supabase
    .from('custom_products')
    .select(GRID_COLS)
    .in('id', pageIds)
    .abortSignal(signal as any);

  if (error || !sbProds) {
    logWarn('[Vangcur] fetchProductsPage fetch error:', error?.message);
    if (strict) throw new Error(error?.message || 'products page fetch failed');
    return { products: [], hasMore: false, total: allIds.length };
  }

  const mapped = (sbProds as unknown as RawCustomProduct[]).map(mapCustomProduct);
  // .in() রেজাল্টের নিজস্ব ক্রম গ্যারান্টিড না — pageIds-এর ক্রম অনুযায়ী আবার সাজানো হলো
  const byId = new Map(mapped.map((p) => [String(p.id), p]));
  const products = pageIds.map((id) => byId.get(String(id))).filter((p): p is Product => !!p);

  return { products, hasMore: offset + limit < allIds.length, total: allIds.length };
}

export async function fetchProductsPage(
  supabase: SupabaseClient,
  category: string,
  offset: number,
  limit: number
): Promise<ProductsPageResult> {
  try {
    const allIds = await fetchOrderedFilteredIds(supabase, category || 'all');
    return await fetchProductsPageFromIds(supabase, allIds, offset, limit);
  } catch (e) {
    logWarn('[Vangcur] fetchProductsPage exception:', e);
    return { products: [], hasMore: false, total: 0 };
  }
}

/**
 * প্রোডাক্ট পেজের জন্য ছোট সাবসেট: একই ক্যাটাগরির রিলেটেড প্রোডাক্ট + একই color_group_id-র
 * কালার-সিবলিং। আগে পেজ পুরো ক্যাটালগ (fetchCustomProducts) এনে ক্লায়েন্টে পাঠাত — ৫০০
 * প্রোডাক্টে প্রতিটা প্রোডাক্ট-পেজের HTML ৭০০ KB+ হয়ে যেত এবং ক্লায়েন্ট প্রতি ৩০ সেকেন্ডে
 * ৫০০ আইডির `.in()` কোয়েরি চালাত। এখন ক্রম আগের মতোই (অ্যাডমিনের কাস্টম অর্ডার, স্টক-আউট
 * শেষে) — fetchOrderedFilteredIds একই ফাংশন — শুধু সংখ্যা সীমিত।
 */
export async function fetchRelatedProducts(
  supabase: SupabaseClient,
  product: Pick<Product, 'id' | 'cat' | 'colorGroupId'>,
  relatedLimit = 8,
): Promise<Product[]> {
  try {
    const currentId = String(product.id);
    const catId = String(product.cat || '').trim().toLowerCase() || 'all';

    const orderedIds = await fetchOrderedFilteredIds(supabase, catId);
    const relatedIds = orderedIds.filter((id) => String(id) !== currentId).slice(0, relatedLimit);

    const [relatedRows, siblingRows] = await Promise.all([
      relatedIds.length ? fetchProductsByIds(supabase, relatedIds) : Promise.resolve([] as Product[]),
      product.colorGroupId
        ? (async () => {
            const signal = getTimeoutSignal(QUERY_TIMEOUT_MS);
            const { data, error } = await supabase
              .from('custom_products')
              .select(GRID_COLS)
              .eq('color_group_id', product.colorGroupId as string)
              .limit(40)
              .abortSignal(signal as any);
            if (error || !data) return [] as Product[];
            return (data as unknown as RawCustomProduct[]).map(mapCustomProduct);
          })()
        : Promise.resolve([] as Product[]),
    ]);

    // রিলেটেডগুলো orderedIds-এর ক্রমে সাজানো (`.in()` ক্রম গ্যারান্টি দেয় না)
    const relatedById = new Map(relatedRows.map((p) => [String(p.id), p]));
    const orderedRelated = relatedIds
      .map((id) => relatedById.get(String(id)))
      .filter((p): p is Product => !!p);

    const seen = new Set<string>();
    const out: Product[] = [];
    for (const p of [...orderedRelated, ...siblingRows]) {
      const k = String(p.id);
      if (k === currentId || seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
    return out;
  } catch (e) {
    logWarn('[Vangcur] fetchRelatedProducts exception:', e);
    return [];
  }
}

/** একই color_group_id-র সব প্রোডাক্ট (কালার-ভ্যারিয়েন্ট সোয়াচের জন্য) */
export async function fetchColorSiblings(supabase: SupabaseClient, groupId: string): Promise<Product[]> {
  if (!groupId) return [];
  try {
    const signal = getTimeoutSignal(QUERY_TIMEOUT_MS);
    const { data, error } = await supabase
      .from('custom_products')
      .select(GRID_COLS)
      .eq('color_group_id', groupId)
      .limit(40)
      .abortSignal(signal as any);
    if (error || !data) return [];
    return (data as unknown as RawCustomProduct[]).map(mapCustomProduct);
  } catch (e) {
    logWarn('[Vangcur] fetchColorSiblings exception:', e);
    return [];
  }
}

// 🔒 ফিক্স (audit P1-15): Realtime WebSocket-এর বদলে হালকা পোলিং — নির্দিষ্ট
// কিছু আইডির জন্য সর্বশেষ ডেটা আনে (পুরো ক্যাটালগ না), তাই ভিজিটর অনেক বাড়লেও
// এটা সাধারণ রিকোয়েস্টের মতোই (কোনো "খোলা কানেকশন" ধরে রাখে না)।
export async function fetchProductsByIds(supabase: SupabaseClient, ids: (number | string)[]): Promise<Product[]> {
  if (!ids.length) return [];
  try {
    const signal = getTimeoutSignal(QUERY_TIMEOUT_MS);
    const { data, error } = await supabase
      .from('custom_products')
      .select(GRID_COLS)
      .in('id', ids)
      .abortSignal(signal as any);
    if (error || !data) return [];
    return (data as unknown as RawCustomProduct[]).map(mapCustomProduct);
  } catch (e) {
    logWarn('[Vangcur] fetchProductsByIds exception:', e);
    return [];
  }
}

export async function fetchProductById(supabase: SupabaseClient, id: number | string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('custom_products')
      .select(DETAIL_COLS)
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return mapCustomProduct(data as unknown as RawCustomProduct);
  } catch (e) {
    logWarn('[Vangcur] fetchProductById exception:', e);
    return null;
  }
}

const DETAIL_ONLY_FIELDS = [
  'desc', 'longDesc', 'features', 'faqs', 'closing', 'powerInfo', 'infoBoxes',
  'seoH1', 'metaTitle', 'metaDescription', 'ogDescription', 'quickSpecsText', 'packagingContent',
] as const;

export function mergeCustomProducts(defaults: Product[], customRows: Product[]): Product[] {
  const list = [...defaults];
  customRows.forEach((mapped) => {
    const idx = list.findIndex((x) => String(x.id) === String(mapped.id));
    if (idx === -1) { list.push(mapped); return; }
    const existing = list[idx];
    if (existing._detailLoaded && !mapped._detailLoaded) {
      const preserved = Object.fromEntries(DETAIL_ONLY_FIELDS.map((k) => [k, existing[k]]));
      list[idx] = { ...existing, ...mapped, ...preserved, _detailLoaded: true };
    } else {
      list[idx] = { ...existing, ...mapped };
    }
  });
  return list;
}

export const QUICK_ORDER_EVENT = 'vc:quickOrder';
export const QUICK_CART_EVENT = 'vc:quickCart';
export const QUICK_ORDER_MODAL_EVENT = 'vc:quickOrderModal';
export const STOCK_NOTIFY_EVENT = 'vc:stockNotify';

export function hasExceededLocalOrderLimit(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('vc_order_timestamps');
    if (!raw) return false;
    const timestamps: number[] = JSON.parse(raw);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = timestamps.filter((ts) => ts > oneDayAgo);
    return recent.length >= 3;
  } catch {
    return false;
  }
}

export function recordLocalOrderTimestamp(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('vc_order_timestamps');
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = timestamps.filter((ts) => ts > oneDayAgo);
    recent.push(Date.now());
    localStorage.setItem('vc_order_timestamps', JSON.stringify(recent));
  } catch {
    // ignore
  }
}

export function startQuickOrder(
  router: { push: (href: string) => void },
  prod: Product,
  qty = 1,
): void {
  if (!prod || prod.stock <= 0) return;
  guardPendingLock(() => proceedQuickOrder(router, prod, qty));
}

function proceedQuickOrder(
  router: { push: (href: string) => void },
  prod: Product,
  qty = 1,
): void {
  if (!prod || prod.stock <= 0) return;

  if (hasExceededLocalOrderLimit()) {
    // 🛡️ এডমিন/মডারেটরদের জন্য এই ব্রাউজার-লোকাল (localStorage) ৩-বার/২৪-ঘণ্টা
    // লিমিট প্রযোজ্য না — বাকি সব জায়গার (checkout/page.tsx-এর isMod,
    // lib/pendingLock.ts) মতোই একই DB-ভিত্তিক is_admin/role চেক।
    // লক্ষ্য রাখা হয়েছে: এই async চেকটা শুধু "লিমিট ছুঁয়েছে" অবস্থাতেই চলে —
    // সাধারণ (ব্লক না হওয়া) ৯৯%+ কুইক-অর্ডার ক্লিকে কোনো বাড়তি নেটওয়ার্ক কল বা
    // টাইমিং-পরিবর্তন হয় না, কোডের বাকি অংশ পুরোপুরি অপরিবর্তিত।
    void (async () => {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (await checkIsPrivilegedClient(supabase, userData?.user?.id)) {
          runQuickOrder(router, prod, qty);
          return;
        }
      } catch {
        // চেক ব্যর্থ হলে fail-safe — সাধারণ কাস্টমারের মতোই লিমিট-মডাল দেখানো হবে
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OPEN_ORDER_LIMIT_EVENT));
      }
    })();
    return;
  }

  runQuickOrder(router, prod, qty);
}

function runQuickOrder(
  router: { push: (href: string) => void },
  prod: Product,
  qty = 1,
): void {
  const safeQty = Math.max(1, Math.min(qty, prod.stock, MAX_QTY_PER_PRODUCT));
  const currentCart = useCartStore.getState().cart;

  // ১. যদি কার্টে আগে থেকে কোনো পণ্য না থাকে (০ আইটেম) — একক পণ্যের কুইক অর্ডার সরাসরি /checkout-এ নিয়ে যাবে
  if (!currentCart || currentCart.length === 0) {
    const singleProductTotal = prod.price * safeQty;
    if (singleProductTotal > MAX_ONLINE_ORDER_TOTAL) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OPEN_BULK_ORDER_EVENT, { detail: { total: singleProductTotal } }));
      }
      return;
    }

    const item: CartItem = {
      id: prod.id,
      name: prod.name,
      emoji: (prod.imgs || ['📦'])[0],
      price: prod.price,
      qty: safeQty,
      cat: prod.cat,
    };

    const serialized = JSON.stringify([item]);
    try {
      sessionStorage.setItem('vc_quick_order_items', serialized);
      localStorage.setItem('vc_quick_order_items', serialized);
    } catch {
      // ignore
    }

    // যদি এই কলের ঠিক আগে কোনো মডাল/ড্রয়ার বন্ধ করা হয়ে থাকে (যেমন
    // WishlistDrawer-এর handleOrderNow), তার deferred history.back()
    // যেন এই navigation-টা উল্টে না দেয় — সেই স্লট এখনই ক্লিয়ার করা হচ্ছে।
    suppressHistoryCleanup();
    router.push('/checkout');
    return;
  }

  // ২. যদি কার্টে ইতিমধ্যে ১ বা একাধিক পণ্য থাকে (মাল্টিপল আইটেম) — পণ্যটি কার্টে যুক্ত করে কুইক অর্ডার মডাল ওপেন করবে
  useCartStore.getState().addToCart([prod], prod.id, safeQty);

  const updatedCart = useCartStore.getState().cart;
  const newCartTotal = cartTotal(updatedCart);

  if (newCartTotal > MAX_ONLINE_ORDER_TOTAL) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OPEN_BULK_ORDER_EVENT, { detail: { total: newCartTotal } }));
    }
    return;
  }

  try {
    sessionStorage.removeItem('vc_quick_order_items');
    localStorage.removeItem('vc_quick_order_items');
  } catch {
    // ignore
  }

  // মাল্টিপল প্রোডাক্ট থাকায় সরাসরি চেকআউটে না নিয়ে শপিং কার্ট (কুইক অর্ডার মডাল) প্রদর্শন
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_QUICK_CART_MODAL_EVENT));
  }
}

export function makeSlug(str: string): string {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function productHref(prod: { id: number | string; name: string }): string {
  return `/product/${makeSlug(prod.name)}-${prod.id}`;
}

export function findProdBySlug(prods: Product[], slug: string): Product | null {
  if (!slug) return null;
  const s = String(slug).toLowerCase();
  let p = prods.find((x) => String(x.id).toLowerCase() === s);
  if (p) return p;
  p = prods.find((x) => makeSlug(x.name) === s);
  if (p) return p;
  p = prods.find((x) => s.endsWith('-' + String(x.id)) || s === String(x.id));
  return p || null;
}

export function idFromSlug(slug: string): string | null {
  if (!slug) return null;
  const s = String(slug);
  if (/^\d+$/.test(s)) return s;
  const m = s.match(/-(\d+)$/);
  return m ? m[1] : s;
}

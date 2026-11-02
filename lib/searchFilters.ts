// ফাইলের পাথ: lib/searchFilters.ts
// [NEW] সার্চ রেজাল্ট পেজের ফিল্টার ও সর্ট — পুরোটাই ইন-মেমোরি (সার্চ ফলাফল আগে থেকেই ব্রাউজারে
// থাকে), তাই ফিল্টার বদলালে কোনো নেটওয়ার্ক রিকোয়েস্ট বা লোডিং-ফ্ল্যাশ নেই। অবস্থা URL-এ থাকে
// (?q=..&brand=..&min=..&max=..&stock=1&sort=..), তাই লিংক শেয়ার ও ব্যাক বাটন ঠিক কাজ করে।

import type { Product } from '@/types';

export type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

export interface SearchFilters {
  brands: string[]; // ব্র্যান্ডের কী (ছোট হাতের, trim করা)
  min: number | null;
  max: number | null;
  inStock: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: SearchFilters = { brands: [], min: null, max: null, inStock: false, sort: 'relevance' };

const SORT_KEYS: SortKey[] = ['relevance', 'price_asc', 'price_desc', 'newest'];
const MAX_BRANDS = 12;

export const brandKey = (b: string | undefined | null): string => (b || '').trim().toLowerCase();

function toNum(v: string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 10_000_000 ? Math.floor(n) : null;
}

// URLSearchParams-সদৃশ (get/getAll) যেকোনো কিছু থেকে পড়ে — সার্ভার ও ক্লায়েন্ট দুই জায়গায় একই
export function parseFilters(sp: { get(k: string): string | null; getAll(k: string): string[] }): SearchFilters {
  const sortRaw = sp.get('sort') as SortKey | null;
  let min = toNum(sp.get('min'));
  let max = toNum(sp.get('max'));
  if (min != null && max != null && min > max) [min, max] = [max, min];
  return {
    brands: Array.from(new Set(sp.getAll('brand').map(brandKey).filter(Boolean))).slice(0, MAX_BRANDS),
    min,
    max,
    inStock: sp.get('stock') === '1',
    sort: sortRaw && SORT_KEYS.includes(sortRaw) ? sortRaw : 'relevance',
  };
}

export function countActiveFilters(f: SearchFilters): number {
  return f.brands.length + (f.min != null || f.max != null ? 1 : 0) + (f.inStock ? 1 : 0);
}

export const hasActiveFilters = (f: SearchFilters): boolean => countActiveFilters(f) > 0;

// ফিল্টার/সর্ট বদলালে নতুন ListResults যেন শুরু থেকে শুরু হয় — তার জন্য স্থিতিশীল স্বাক্ষর
export function filtersSignature(f: SearchFilters): string {
  return [f.brands.join(','), f.min ?? '', f.max ?? '', f.inStock ? 1 : 0, f.sort].join('|');
}

export function buildSearchUrl(query: string, f: SearchFilters): string {
  if (!query) return '/search';
  const parts = [`q=${encodeURIComponent(query)}`];
  f.brands.forEach((b) => parts.push(`brand=${encodeURIComponent(b)}`));
  if (f.min != null) parts.push(`min=${f.min}`);
  if (f.max != null) parts.push(`max=${f.max}`);
  if (f.inStock) parts.push('stock=1');
  if (f.sort !== 'relevance') parts.push(`sort=${f.sort}`);
  return `/search?${parts.join('&')}`;
}

function numericId(p: Product): number {
  const n = Number(p.id);
  return Number.isFinite(n) ? n : 0;
}

export function applyFilters(list: Product[], f: SearchFilters): Product[] {
  let out = list;
  if (f.brands.length) {
    const set = new Set(f.brands);
    out = out.filter((p) => set.has(brandKey(p.brand)));
  }
  if (f.min != null) out = out.filter((p) => p.price >= (f.min as number));
  if (f.max != null) out = out.filter((p) => p.price <= (f.max as number));
  if (f.inStock) out = out.filter((p) => (p.stock ?? 0) > 0);
  if (f.sort === 'price_asc') out = [...out].sort((a, b) => a.price - b.price);
  else if (f.sort === 'price_desc') out = [...out].sort((a, b) => b.price - a.price);
  else if (f.sort === 'newest') out = [...out].sort((a, b) => numericId(b) - numericId(a));
  return out;
}

export interface BrandFacet { key: string; label: string; count: number }

// ফিল্টার প্যানেলের জন্য: ব্র্যান্ড-তালিকা (সংখ্যাসহ) ও দামের সীমা — সার্চ-ম্যাচের ওপর, ব্র্যান্ড-ফিল্টার বাদে বাকি ফিল্টার ধরে
export function buildFacets(matches: Product[], f: SearchFilters): { brands: BrandFacet[]; price: { min: number; max: number } | null } {
  const base = applyFilters(matches, { ...f, brands: [], sort: 'relevance' });
  const map = new Map<string, BrandFacet>();
  for (const p of base) {
    const k = brandKey(p.brand);
    if (!k) continue;
    const cur = map.get(k);
    if (cur) cur.count += 1;
    else map.set(k, { key: k, label: (p.brand || '').trim(), count: 1 });
  }
  // নির্বাচিত ব্র্যান্ড কোনো কারণে সংখ্যা ০ হয়ে গেলেও তালিকায় থাকবে, যাতে বাদ দেওয়া যায়
  for (const k of f.brands) if (!map.has(k)) map.set(k, { key: k, label: k, count: 0 });
  const brands = Array.from(map.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const prices = matches.map((p) => p.price).filter((n) => Number.isFinite(n));
  const price = prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
  return { brands, price };
}

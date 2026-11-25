// ফাইলের পাথ: lib/catalogPurge.ts
// [NEW] অ্যাডমিনের বদল অনুযায়ী "কোনটা মুছতে হবে" — পিউর ফাংশন (ডাটাবেজ/নেটওয়ার্ক ছাড়া, তাই টেস্ট করা যায়)।
// ব্যবহারকারী: app/api/revalidate-catalog/route.ts।
//
// আগে অ্যাডমিনের যেকোনো বদলে পুরো সাইটের (সব প্রোডাক্ট-পেজ সহ) ক্যাশ মুছত। ১,০০০ প্রোডাক্টে একটা দাম বদলালে ~১,০০০ পেজ
// পরের ভিজিটে আবার বানাতে হতো (প্রতিটায় ডাটাবেজ কোয়েরি + CPU + ISR-ক্যাশে লেখা)। এখন বদলের ধরন অনুযায়ী শুধু যা বদলেছে।

import { orderedIdsForCategory, productSlug, RELATED_NEIGHBOUR_COUNT, type OrderedIdRow } from '@/lib/productData';

// 'stockorder' = স্টক ০ ↔ >০ পেরোল (তালিকার ক্রম বদলায়)। revalidate-catalog নিজে 'stock' বদল থেকে এটা বের করে (stockOrderCrossings);
// অ্যাডমিন সরাসরিও পাঠাতে পারে।
export const CHANGE_TYPES = ['price', 'badge', 'stock', 'stockorder', 'content', 'display', 'created', 'deleted'] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export interface PurgeChange {
  productId: string;
  changeType: ChangeType;
  /** নাম বদলালে/মুছলে আগের নাম — আগের স্লাগের পেজও মুছতে (না দিলেও চলে) */
  previousName?: string;
}

/** একবারে সর্বোচ্চ কতগুলো বদল নেওয়া হবে; বেশি হলে পুরো-পার্জে ফিরে যায় (তখন আলাদা করে মোছার চেয়ে সেটাই সস্তা) */
export const MAX_CHANGES_PER_CALL = 200;

const ID_RE = /^\d{1,18}$/;

function isChangeType(v: unknown): v is ChangeType {
  return typeof v === 'string' && (CHANGE_TYPES as readonly string[]).includes(v);
}

function parseOne(raw: unknown): PurgeChange | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const idRaw = typeof r.productId === 'number' ? String(r.productId) : r.productId;
  if (typeof idRaw !== 'string' || !ID_RE.test(idRaw)) return null;
  if (!isChangeType(r.changeType)) return null;
  const out: PurgeChange = { productId: idRaw, changeType: r.changeType };
  if (typeof r.previousName === 'string' && r.previousName.length <= 300) out.previousName = r.previousName;
  return out;
}

/**
 * রিকোয়েস্ট-বডি → বদলের তালিকা। `null` = "পুরো পার্জ" (বডি নেই/অচেনা/অসম্পূর্ণ/খুব বড়) — পুরনো অ্যাডমিন (বডি ছাড়া ডাকে)
 * আর যেকোনো সন্দেহের ক্ষেত্রে আগের আচরণই বহাল থাকে; আংশিক বৈধ তালিকা কখনো আংশিক মোছে না।
 */
export function parsePurgeBody(body: unknown): PurgeChange[] | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (Array.isArray(b.changes)) {
    if (!b.changes.length || b.changes.length > MAX_CHANGES_PER_CALL) return null;
    const out: PurgeChange[] = [];
    for (const item of b.changes) {
      const c = parseOne(item);
      if (!c) return null;
      out.push(c);
    }
    return out;
  }
  const single = parseOne(b);
  return single ? [single] : null;
}

interface Effects {
  /** মুছতে হবে এমন ডেটা-ক্যাশ ট্যাগ (lib/liveProducts, productListingCache, catalogIndex) */
  tags: readonly string[];
  /** হোম/অফার/প্রোডাক্ট-তালিকা/ক্যাটাগরি/কালেকশন পেজ (কার্ডে দাম/নাম/ছবি দেখায়) */
  listing: boolean;
  sitemap: boolean;
  /** বদলানো প্রোডাক্টের নিজের পেজ */
  self: boolean;
  /** যে পেজগুলোতে এই প্রোডাক্ট রিলেটেড/কালার-সিবলিং হিসেবে দেখায় */
  neighbours: boolean;
}

// স্টক: শুধু `live` — পেজের স্টক /api/live-products থেকে (আলাদা `vangcur-live` Worker) তাজা হয় (অনুমোদিত নকশা)।
// স্টক ০ ↔ >০ পেরোলে প্রোডাক্টটা তালিকার ক্রমে শেষে সরে/ফেরে — তখন `stockorder` (revalidate-catalog নিজে বের করে):
// তালিকা-সারি ('list') ও তালিকা-পেজ তাড়াতাড়ি তাজা। প্রোডাক্ট-পেজের রিলেটেড ৪টা কার্ডের ক্রম (আলাদা ক্যাশ) ২৪ ঘণ্টা পর্যন্ত দেরিতে।
const EFFECTS: Record<ChangeType, Effects> = {
  price: { tags: ['live', 'list', 'search'], listing: true, sitemap: false, self: true, neighbours: false },
  badge: { tags: ['live', 'list', 'search'], listing: true, sitemap: false, self: true, neighbours: false },
  stock: { tags: ['live'], listing: false, sitemap: false, self: false, neighbours: false },
  stockorder: { tags: ['live', 'list'], listing: true, sitemap: false, self: false, neighbours: false },
  content: { tags: [], listing: false, sitemap: false, self: true, neighbours: false },
  display: { tags: ['list', 'search'], listing: true, sitemap: false, self: true, neighbours: true },
  created: { tags: ['live', 'list', 'search'], listing: true, sitemap: true, self: true, neighbours: true },
  deleted: { tags: ['live', 'list', 'search'], listing: true, sitemap: true, self: true, neighbours: true },
};

export interface MergedEffects {
  tags: string[];
  listing: boolean;
  sitemap: boolean;
  needsNeighbours: boolean;
  /** যাদের নিজের পেজ মুছতে হবে */
  selfIds: string[];
  /** যাদের রিলেটেড/সিবলিং-পেজ মুছতে হবে */
  neighbourIds: string[];
  /** বদলের ধরন `deleted` এমন আইডি (পেজ মোছার জন্য নাম ডাটাবেজে আর নেই) */
  deletedIds: string[];
  previousNames: Map<string, string>;
}

export function mergeEffects(changes: PurgeChange[]): MergedEffects {
  const tags = new Set<string>();
  const selfIds = new Set<string>();
  const neighbourIds = new Set<string>();
  const deletedIds = new Set<string>();
  const previousNames = new Map<string, string>();
  let listing = false;
  let sitemap = false;
  for (const c of changes) {
    const e = EFFECTS[c.changeType];
    e.tags.forEach((t) => tags.add(t));
    listing ||= e.listing;
    sitemap ||= e.sitemap;
    if (e.self) selfIds.add(c.productId);
    if (e.neighbours) neighbourIds.add(c.productId);
    if (c.changeType === 'deleted') deletedIds.add(c.productId);
    if (c.previousName) previousNames.set(c.productId, c.previousName);
  }
  return {
    tags: [...tags],
    listing,
    sitemap,
    needsNeighbours: neighbourIds.size > 0,
    selfIds: [...selfIds],
    neighbourIds: [...neighbourIds],
    deletedIds: [...deletedIds],
    previousNames,
  };
}

function catsOf(row: OrderedIdRow): string[] {
  const cats = Array.isArray(row.cats) && row.cats.length ? row.cats : [row.cat || ''];
  return cats.map((c) => String(c || '').trim().toLowerCase()).filter(Boolean);
}

/**
 * যে প্রোডাক্টগুলোর পেজে `productId` রিলেটেড হিসেবে দেখায়: প্রতিটা ক্যাটাগরির সাজানো ক্রমে তার আগের RELATED_NEIGHBOUR_COUNT টা
 * (ঘুরে)। "পরের ৪টা" নিয়মের উল্টো — তাই প্রতি প্রোডাক্টের জন্য সর্বোচ্চ (৪ × ক্যাটাগরি-সংখ্যা) টা পেজ।
 * একাধিক ক্যাটাগরির প্রোডাক্টে বাড়তি-ধরা নিরাপদ (শুধু একটা বেশি পেজ মোছা হয়), কম-ধরা নয়।
 */
export function predecessorIds(
  rows: OrderedIdRow[] | null | undefined,
  productId: string,
  count: number = RELATED_NEIGHBOUR_COUNT,
): string[] {
  if (!rows) return [];
  const me = rows.find((r) => String(r.id) === productId);
  if (!me) return [];
  const out = new Set<string>();
  for (const cat of catsOf(me)) {
    const ordered = orderedIdsForCategory(rows, cat);
    const n = ordered.length;
    const idx = ordered.findIndex((id) => String(id) === productId);
    if (idx === -1 || n < 2) continue;
    for (let j = 1; j <= count && j < n; j++) {
      const id = String(ordered[(((idx - j) % n) + n) % n]);
      if (id !== productId) out.add(id);
    }
  }
  return [...out];
}

/** পার্জ-ক্যাশের পেজ-পাথ (ক্যানোনিকাল স্লাগ, productSlug-এর মতোই) */
export function productPagePath(name: string | null | undefined, id: string | number): string {
  return `/product/${productSlug(name, id)}`;
}

/** হোম/অফার/তালিকা/ক্যাটাগরি/কালেকশন — revalidatePath-এর (পাথ, টাইপ) জোড়া */
export const LISTING_PATHS: ReadonlyArray<readonly [string, 'page' | undefined]> = [
  ['/', undefined],
  ['/offers', undefined],
  ['/products', undefined],
  ['/products/view/[cat]/[page]', 'page'],
  ['/category/[slug]', 'page'],
  ['/collection/[slug]', 'page'],
];

/**
 * `stock` বদলে স্টক ০ ↔ >০ পেরোল কিনা। `before` = তালিকা-পেজের ক্যাশ-করা সারি (বদলের আগের অবস্থা), `after` = ডাটাবেজের এখনকার স্টক।
 * শুধু পেরোলেই তালিকার ক্রম বদলায় (৫→৪-এ নয়), তাই শুধু তখনই `stockorder` বদল ফেরে। `before` না থাকলে/প্রোডাক্ট তাতে না থাকলে
 * নিরাপদে "পেরিয়েছে" ধরা হয়। (ক্রমের নিয়ম orderedIdsForCategory-র সাথে মেলানো: `stock <= 0` = শেষে)
 */
export function stockOrderCrossings(
  before: OrderedIdRow[] | null | undefined,
  after: ReadonlyArray<{ id: number | string; stock: unknown }>,
  ids: readonly string[],
): PurgeChange[] {
  const wanted = new Set(ids);
  const beforeById = new Map<string, OrderedIdRow>();
  for (const r of before || []) beforeById.set(String(r.id), r);
  const out: PurgeChange[] = [];
  for (const r of after) {
    const id = String(r.id);
    if (!wanted.has(id)) continue;
    const b = beforeById.get(id);
    const afterOut = Number(r.stock) <= 0;
    if (!b || (Number(b.stock) <= 0) !== afterOut) out.push({ productId: id, changeType: 'stockorder' });
  }
  return out;
}

/**
 * প্রোডাক্ট-পেজের রিলেটেড-ক্রমের কাঠামো সত্যিই বদলেছে কিনা (আইডির ক্রম, cat, cats) — স্টক বাদ। `a` না থাকলে "বদলেছে" ধরা হয়।
 * বদলালে revalidate-catalog `prodrows` ট্যাগ মোছে (সব প্রোডাক্ট পেজ নতুন করে বানায়); না বদলালে শুধু নির্দিষ্ট পেজ।
 */
export function orderStructureChanged(a: OrderedIdRow[] | null | undefined, b: OrderedIdRow[] | null | undefined): boolean {
  if (!a || !b) return true;
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (String(x.id) !== String(y.id)) return true;
    if (String(x.cat ?? '') !== String(y.cat ?? '')) return true;
    if (JSON.stringify(x.cats ?? null) !== JSON.stringify(y.cats ?? null)) return true;
  }
  return false;
}

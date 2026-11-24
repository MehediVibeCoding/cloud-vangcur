// ফাইলের পাথ: app/api/revalidate-catalog/route.ts
// [NEW] Mehediadmin (আলাদা ডিপ্লয়মেন্ট) প্রোডাক্ট/ক্যাটাগরি/হিরো/অফার বদলালে এই এন্ডপয়েন্ট
// হিট করে — তখনই Vangcur-এর ক্যাশ করা (ISR) পেজগুলো মুছে যায়, ফলে নতুন দাম/স্টক/ছবি
// পরের ভিজিটেই লাইভ হয়, ৫ মিনিট অপেক্ষা করতে হয় না।
//
// দুই ধরনের কল:
//  • বডি ছাড়া / অচেনা বডি → আগের মতো পুরো পার্জ (পুরনো অ্যাডমিন ও যেকোনো সন্দেহে নিরাপদ ডিফল্ট)।
//  • `{ productId, changeType, previousName? }` বা `{ changes: [...] }` → শুধু যা বদলেছে (lib/catalogPurge.ts-এর ছক)।
//    changeType: price | badge | stock | content | display (নাম/ছবি/রেটিং) | created | deleted।
//    ছোট-পার্জে কোনো ব্যর্থতা হলে স্বয়ংক্রিয়ভাবে পুরো পার্জে ফিরে যায় — পুরনো পেজ আটকে থাকার ঝুঁকি নেই।
//
// অ্যাডমিনের জন্য নতুন কোনো env লাগে না — আগের revalidate-guide এন্ডপয়েন্টের একই গোপন চাবি
// (GUIDE_REVALIDATE_SECRET_KEY) ও সাইটের ঠিকানা (VANGCUR_SITE_URL) ব্যবহার হয়।

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { logWarn } from '@/lib/logger';
import { purgeEdgeCache, purgeEdgeCachePaths } from '@/lib/edgeCache';
import { fetchOrderedRows } from '@/lib/productData';
import { getOrderedRowsCached } from '@/lib/productListingCache';
import {
  LISTING_PATHS,
  mergeEffects,
  parsePurgeBody,
  predecessorIds,
  productPagePath,
  type PurgeChange,
} from '@/lib/catalogPurge';

function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const NO_SPECIFIC_PAGES_CAP = 80; // এর বেশি আলাদা প্রোডাক্ট-পেজ মুছতে হলে একসাথে প্যাটার্ন-পার্জ সস্তা

/** আগের আচরণ হুবহু: সব পেজ + 'catalog' ট্যাগ (সব ডেটা-ক্যাশ) + পুরো এজ-ক্যাশ */
async function fullPurge() {
  // হোম, অফার, সব ক্যাটাগরি পেজ ও সব প্রোডাক্ট পেজ (রিলেটেড/কালার-ভ্যারিয়েন্ট একে অপরের
  // ডেটা দেখায়, তাই একটা বদলালে সবগুলোই নতুন করে বানানো নিরাপদ) এবং সাইটম্যাপ।
  revalidatePath('/');
  revalidatePath('/offers');
  revalidatePath('/products');
  revalidatePath('/products/view/[cat]/[page]', 'page');
  revalidatePath('/category/[slug]', 'page');
  revalidatePath('/collection/[slug]', 'page');
  revalidatePath('/product/[slug]', 'page');
  revalidatePath('/sitemap.xml');
  revalidatePath('/api/search-index');
  // Next 16: দ্বিতীয় আর্গুমেন্ট বাধ্যতামূলক। { expire: 0 } = আগের মতোই সঙ্গে সঙ্গে ক্যাশ মোছা
  // (stale-while-revalidate নয়), যাতে অ্যাডমিনের বদল তখনই লাইভে দেখা যায়।
  revalidateTag('catalog', { expire: 0 });

  // ISR মোছার পরে এজ ক্যাশ মুছি, যাতে পরের ভিজিট নতুন পেজ বানায়।
  const edgePurged = await purgeEdgeCache('revalidate-catalog');
  return NextResponse.json({ ok: true, mode: 'full', edgePurged });
}

/**
 * শুধু বদলানো জিনিস মোছে। কোনো ধাপে এরর হলে throw করে — কলার তখন fullPurge() চালায়।
 *
 * 🔎 প্রোডাক্ট-পেজ মোছা revalidatePath(ক্যানোনিকাল স্লাগ) দিয়ে — পেজে-ট্যাগ-বসানোর (`p:<id>`) বদলে, কারণ: (১) প্রোডাক্ট পেজ
 * ট্যাগ পায় শুধু unstable_cache/fetch-ট্যাগ থেকে, যা OpenNext-এ ইনহেরিট হয় কিনা এখানে যাচাই করা যায়নি; (২) প্রতি প্রোডাক্টে
 * বাড়তি unstable_cache মানে বাড়তি KV/R2 লেখা। revalidatePath ডকুমেন্টেড ও নির্ভরযোগ্য।
 */
async function finePurge(changes: PurgeChange[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('supabase env missing');
  const supabase = createClient(url, key);
  const eff = mergeEffects(changes);

  // ১) ক্রম-বদলের আগের ছবি (প্রতিবেশী বের করতে): ক্যাশ-করা সারি এখনো পুরনো থাকতেই পড়ি
  const rowsBefore = eff.needsNeighbours ? await getOrderedRowsCached() : null;

  // ২) ডেটা-ক্যাশ (ট্যাগ) — হার্ড পার্জ ({ expire: 0 }), আগের মতোই। (নরম/stale-while-revalidate পার্জ নেওয়া হয়নি: OpenNext-এর D1
  // ট্যাগ-ক্যাশে সেটার আচরণ যাচাই করা যায়নি; আর এখন মোছা পেজ মাত্র কয়েকটা, তাই হার্ড পার্জের খরচও কম।)
  for (const tag of eff.tags) revalidateTag(tag, { expire: 0 });

  // ৩) বদলের পরের ছবি — সরাসরি ডাটাবেজ থেকে (ক্যাশ নয়), যাতে নতুন/মুছে-ফেলা প্রোডাক্টের অবস্থান নির্ভুল থাকে
  const rowsAfter = eff.needsNeighbours ? await fetchOrderedRows(supabase) : null;
  if (eff.needsNeighbours && !rowsAfter) throw new Error('ordered rows fetch failed'); // প্রতিবেশী না জেনে আংশিক মোছা চলবে না

  // ৪) কোন কোন প্রোডাক্ট-পেজ মুছতে হবে
  const pageIds = new Set<string>(eff.selfIds);
  for (const id of eff.neighbourIds) {
    for (const p of predecessorIds(rowsBefore, id)) pageIds.add(p);
    for (const p of predecessorIds(rowsAfter, id)) pageIds.add(p);
  }

  // কালার-সিবলিং: একই color_group_id-র প্রোডাক্টগুলো একে অপরের পেজে দেখায়
  const siblingIds = new Set<string>();
  if (eff.neighbourIds.length) {
    const { data: groups, error } = await supabase
      .from('custom_products')
      .select('color_group_id')
      .in('id', eff.neighbourIds)
      .not('color_group_id', 'is', null);
    if (error) throw new Error(`color group lookup failed: ${error.message}`);
    const groupIds = [...new Set((groups || []).map((g: { color_group_id: string | null }) => g.color_group_id).filter((g): g is string => !!g))];
    if (groupIds.length) {
      const { data: sibs, error: e2 } = await supabase.from('custom_products').select('id').in('color_group_id', groupIds).limit(200);
      if (e2) throw new Error(`siblings lookup failed: ${e2.message}`);
      for (const s of sibs || []) siblingIds.add(String((s as { id: number | string }).id));
    }
  }
  siblingIds.forEach((id) => pageIds.add(id));

  // নাম → ক্যানোনিকাল স্লাগ
  const wantedIds = [...pageIds];
  const names = new Map<string, string>();
  if (wantedIds.length) {
    const { data, error } = await supabase.from('custom_products').select('id,name').in('id', wantedIds);
    if (error) throw new Error(`names lookup failed: ${error.message}`);
    for (const r of data || []) names.set(String((r as { id: number | string }).id), (r as { name: string | null }).name || '');
  }

  const paths = new Set<string>();
  let needPattern = false;
  for (const id of wantedIds) {
    if (names.has(id)) {
      paths.add(productPagePath(names.get(id), id));
    } else if (eff.selfIds.includes(id)) {
      // নিজের পেজ কিন্তু ডাটাবেজে নেই (মুছে ফেলা) — আগের নাম জানা থাকলে সেটা দিয়ে, না থাকলে সব প্রোডাক্ট-পেজ
      const prev = eff.previousNames.get(id);
      if (prev !== undefined) paths.add(productPagePath(prev, id));
      else needPattern = true;
    }
    // প্রতিবেশী আইডি ডাটাবেজে নেই = এর মধ্যে মুছে গেছে; তার পেজ মোছার কিছু নেই
  }
  for (const [id, prev] of eff.previousNames) {
    if (pageIds.has(id)) paths.add(productPagePath(prev, id)); // নাম বদলালে আগের স্লাগের পেজও
  }
  if (paths.size > NO_SPECIFIC_PAGES_CAP) needPattern = true;

  if (needPattern) revalidatePath('/product/[slug]', 'page');
  else for (const p of paths) revalidatePath(p);

  if (eff.listing) for (const [p, type] of LISTING_PATHS) (type ? revalidatePath(p, type) : revalidatePath(p));
  if (eff.sitemap) revalidatePath('/sitemap.xml');
  if (eff.tags.includes('search')) revalidatePath('/api/search-index');

  // ৫) এজ-ক্যাশ: তালিকা-পেজ বদলালে (হোম '/' প্রিফিক্স = সব) পুরোটাই; নইলে শুধু ওই পাথগুলো, ব্যর্থ হলে পুরোটা
  let edgePurged: boolean;
  if (eff.listing || needPattern) {
    edgePurged = await purgeEdgeCache('revalidate-catalog');
  } else {
    const prefixes = [...paths];
    if (eff.tags.includes('live')) prefixes.push('/api/live-products');
    if (eff.sitemap) prefixes.push('/sitemap.xml');
    edgePurged = (await purgeEdgeCachePaths('revalidate-catalog', prefixes)) || (await purgeEdgeCache('revalidate-catalog'));
  }

  return NextResponse.json({
    ok: true,
    mode: 'fine',
    edgePurged,
    changes: changes.length,
    tags: eff.tags,
    productPages: needPattern ? 'all' : paths.size,
  });
}

export async function POST(req: NextRequest) {
  const expected = process.env.GUIDE_REVALIDATE_SECRET_KEY;
  if (!expected) {
    logWarn('[revalidate-catalog] GUIDE_REVALIDATE_SECRET_KEY সেট করা নেই — রিকোয়েস্ট প্রত্যাখ্যাত');
    return NextResponse.json({ ok: false, message: 'not configured' }, { status: 503 });
  }

  const secret = req.headers.get('x-revalidate-secret');
  if (!secret || !secretsMatch(secret, expected)) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  // বডি ঐচ্ছিক — পুরনো অ্যাডমিন বডি ছাড়া ডাকে, তখন null → পুরো পার্জ
  const body: unknown = await req.json().catch(() => null);
  const changes = parsePurgeBody(body);
  if (!changes) return fullPurge();

  try {
    return await finePurge(changes);
  } catch (err) {
    logWarn('[revalidate-catalog] ছোট-পার্জ ব্যর্থ — পুরো পার্জে ফিরে যাচ্ছি', { err: String(err) });
    return fullPurge();
  }
}

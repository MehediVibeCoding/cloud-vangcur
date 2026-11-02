// ফাইলের পাথ: lib/guidePageData.ts
// [NEW] guide_pages টেবিল থেকে ডাটা আনার সব ফাংশন। প্যাটার্নটা ইচ্ছাকৃতভাবে
// app/product/[slug]/page.tsx-এর getProduct() ফাংশনের সাথে হুবহু মিলিয়ে লেখা।
//
// ⚠️ guide_page_templates-এর সাথে PostgREST embedded join (.select('*, template:...'))
// ব্যবহার করা হয়নি — page_type → guide_page_templates(key) FK-টা PK-রেফারেন্স না
// হওয়ায় embedding syntax লাইভ Supabase-এ যাচাই ছাড়া ঝুঁকিপূর্ণ। এর বদলে ইচ্ছাকৃতভাবে
// দুইটা সাধারণ কোয়েরি + application-code-এ ম্যাপ জোড়া — কম চটকদার কিন্তু নিশ্চিতভাবে
// কাজ করে, আর guide_page_templates টেবিল ছোট হওয়ায় পারফরম্যান্স সমস্যাও হবে না।

import type { SupabaseClient } from '@supabase/supabase-js';
import type { GuidePage, GuidePageTemplate, GuidePageType } from '@/types/guides';
import { guidePageUrlPath } from '@/types/guides';
import { fetchProductById, productHref } from '@/lib/productData';
import type { ProductSnapshot } from '@/app/components/guides/GuideBlocks';

/** সব অ্যাক্টিভ টেমপ্লেট আনা — ছোট, খুব কম পাল্টায়, তাই প্রতি রিকোয়েস্টে একবারই যথেষ্ট */
export async function fetchGuidePageTemplates(supabase: SupabaseClient): Promise<GuidePageTemplate[]> {
  const { data, error } = await supabase
    .from('guide_page_templates')
    .select('*')
    .eq('is_active', true);
  if (error || !data) return [];
  return data as GuidePageTemplate[];
}

export async function fetchGuidePageTemplateByKey(
  supabase: SupabaseClient,
  key: string
): Promise<GuidePageTemplate | null> {
  const { data, error } = await supabase.from('guide_page_templates').select('*').eq('key', key).maybeSingle();
  if (error || !data) return null;
  return data as GuidePageTemplate;
}

/**
 * পাবলিক সাইট থেকে slug দিয়ে একটা পাবলিশড গাইড পেজ আনা, সাথে তার টেমপ্লেটও (url_prefix,
 * scope, ইত্যাদির জন্য)। `expectedPrefixSegments` দিলে (নতুন root-level catch-all
 * রুট থেকে আসা URL-এর prefix অংশ) — টেমপ্লেটের আসল url_prefix-এর সাথে না মিললে
 * null রিটার্ন করে, যাতে ভুল prefix দিয়ে ভিজিট করলে 404 হয় (যেমন /install/xyz-কে
 * /compare/xyz হিসেবে অ্যাক্সেস করা ঠেকানো)।
 */
export async function fetchGuidePageBySlug(
  supabase: SupabaseClient,
  slug: string,
  expectedPrefixSegments?: string[]
): Promise<{ page: GuidePage; template: GuidePageTemplate } | null> {
  const { data, error } = await supabase
    .from('guide_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !data) return null;
  const page = data as GuidePage;

  const template = await fetchGuidePageTemplateByKey(supabase, page.page_type);
  if (!template) return null; // টেমপ্লেট deactivate/delete হয়ে গেলে পেজও দেখানো হবে না

  if (expectedPrefixSegments) {
    const expected = expectedPrefixSegments.join('/');
    const actual = template.url_prefix.replace(/^\/|\/$/g, '');
    if (expected !== actual) return null;
  }

  return { page, template };
}

/** sitemap.ts-এর জন্য — পাবলিশড সব গাইড পেজের slug + updated_at + পূর্ণ URL পাথ */
export async function fetchAllPublishedGuideUrls(
  supabase: SupabaseClient
): Promise<{ url: string; updated_at: string }[]> {
  const [{ data: pages, error }, templates] = await Promise.all([
    supabase.from('guide_pages').select('slug, updated_at, page_type').eq('is_published', true),
    fetchGuidePageTemplates(supabase),
  ]);

  if (error || !pages) return [];
  const prefixByKey = new Map(templates.map((t) => [t.key, t.url_prefix]));

  return (pages as { slug: string; updated_at: string; page_type: GuidePageType }[]).map((p) => ({
    url: guidePageUrlPath(p.slug, prefixByKey.get(p.page_type) ?? ''),
    updated_at: p.updated_at,
  }));
}

/** অ্যাডমিন প্যানেলে "See All Pages" — একটা নির্দিষ্ট প্রোডাক্টের সব গাইড পেজ (draft + published) */
export async function fetchGuidePagesByProduct(
  supabase: SupabaseClient,
  productId: number
): Promise<GuidePage[]> {
  const { data, error } = await supabase
    .from('guide_pages')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as GuidePage[];
}

/** অ্যাডমিন প্যানেলে "See All Pages" — একটা নির্দিষ্ট ক্যাটাগরির সব গাইড পেজ (draft + published) */
export async function fetchGuidePagesByCategory(
  supabase: SupabaseClient,
  categoryId: string
): Promise<GuidePage[]> {
  const { data, error } = await supabase
    .from('guide_pages')
    .select('*')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as GuidePage[];
}

/**
 * blocks[]-এর ভেতরে relatedLinks/cta ব্লকে থাকা targetPageId-গুলো আসল URL-এ resolve
 * করা — টার্গেট পেজ আর তার টেমপ্লেট দুটো আলাদা কোয়েরি দিয়ে এনে ম্যাপ জোড়া হয়, যাতে
 * slug/prefix বদলালেও রেন্ডার-টাইমে সবসময় সঠিক লিংক দেখায়।
 */
export async function resolveRelatedLinkHrefs(
  supabase: SupabaseClient,
  page: GuidePage
): Promise<Record<string, string>> {
  const ids = new Set<string>();
  for (const block of page.blocks) {
    if (block.type === 'relatedLinks') {
      for (const item of block.items) if (item.targetPageId) ids.add(item.targetPageId);
    }
    if (block.type === 'cta' && block.targetPageId) ids.add(block.targetPageId);
  }
  if (ids.size === 0) return {};

  const { data: targetPages } = await supabase
    .from('guide_pages')
    .select('id, slug, page_type')
    .in('id', Array.from(ids))
    .eq('is_published', true);

  if (!targetPages || targetPages.length === 0) return {};

  const templates = await fetchGuidePageTemplates(supabase);
  const prefixByKey = new Map(templates.map((t) => [t.key, t.url_prefix]));

  const out: Record<string, string> = {};
  for (const tp of targetPages as { id: string; slug: string; page_type: string }[]) {
    out[tp.id] = guidePageUrlPath(tp.slug, prefixByKey.get(tp.page_type) ?? '');
  }
  return out;
}

/**
 * প্রোডাক্ট/ক্যাটাগরি পেজে "সম্পর্কিত গাইড" সেকশন বসানোর জন্য — এই product_id বা
 * category_id-এর সাথে যুক্ত পাবলিশড গাইড পেজগুলো (slug/H1/URL সহ) রেডি করে দেয়।
 * ব্যবহার: app/product/[slug]/page.tsx বা app/category/[id]/page.tsx থেকে কল করে
 * রেজাল্টটা একটা "আরও জানুন" কার্ড-লিস্ট হিসেবে বসিয়ে দিলেই হয় — এই ফাংশন নিজে
 * কোনো UI রেন্ডার করে না।
 */
export async function fetchRelatedGuidePages(
  supabase: SupabaseClient,
  opts: { productId?: number; categoryId?: string }
): Promise<{ slug: string; url: string; h1_bn: string; h1_en: string; templateNameBn: string; templateNameEn: string }[]> {
  if (!opts.productId && !opts.categoryId) return [];

  let query = supabase.from('guide_pages').select('slug, h1_bn, h1_en, page_type').eq('is_published', true);
  query = opts.productId ? query.eq('product_id', opts.productId) : query.eq('category_id', opts.categoryId as string);

  const { data: pages, error } = await query;
  if (error || !pages || pages.length === 0) return [];

  const templates = await fetchGuidePageTemplates(supabase);
  const templateByKey = new Map(templates.map((t) => [t.key, t]));

  return (pages as { slug: string; h1_bn: string; h1_en: string; page_type: string }[])
    .map((p) => {
      const t = templateByKey.get(p.page_type);
      if (!t) return null;
      return {
        slug: p.slug,
        url: guidePageUrlPath(p.slug, t.url_prefix),
        h1_bn: p.h1_bn,
        h1_en: p.h1_en,
        templateNameBn: t.name_bn,
        templateNameEn: t.name_en,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/**
 * blocks[]-এর ভেতর থেকে FAQ ব্লকগুলোর প্রশ্ন-উত্তর একসাথে জড়ো করা —
 * FAQPage JSON-LD বানানোর সময় ব্যবহার হয়।
 */
export function collectFaqEntries(
  page: GuidePage,
  lang: 'bn' | 'en'
): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  for (const block of page.blocks) {
    if (block.type === 'faq') {
      for (const item of block.items) {
        out.push({ question: item.question[lang], answer: item.answer[lang] });
      }
    }
  }
  return out;
}

/**
 * blocks[]-এর ভেতর থেকে Steps ব্লক থাকলে HowTo schema বানানোর জন্য প্রথমটা রিটার্ন করা।
 * একাধিক Steps ব্লক থাকলে প্রথমটাকেই "মূল প্রসেস" ধরা হয়।
 */
export function collectHowToSteps(
  page: GuidePage,
  lang: 'bn' | 'en'
): { name: string; text: string }[] | null {
  for (const block of page.blocks) {
    if (block.type === 'steps') {
      return block.steps.map((s) => ({ name: s.title[lang], text: s.description[lang] }));
    }
  }
  return null;
}

/**
 * পেজের ভেতরে থাকা সব productRecommendation ব্লকের productId খুঁজে বের করে,
 * প্রতিটার জন্য হালকা প্রোডাক্ট স্ন্যাপশট (নাম/দাম/ছবি/লিংক) সার্ভারেই ফেচ করে আনা —
 * যাতে ক্লায়েন্টে আলাদা করে ফেচ করতে না হয়।
 */
export async function resolveProductSnapshots(
  supabase: SupabaseClient,
  page: GuidePage
): Promise<Record<number, ProductSnapshot>> {
  const ids = Array.from(
    new Set(
      page.blocks
        .filter((b): b is Extract<typeof b, { type: 'productRecommendation' }> => b.type === 'productRecommendation')
        .map((b) => b.productId)
    )
  );

  if (ids.length === 0) return {};

  const products = await Promise.all(ids.map((id) => fetchProductById(supabase, id)));

  const out: Record<number, ProductSnapshot> = {};
  products.forEach((p, i) => {
    if (!p) return;
    out[ids[i]] = {
      id: p.id,
      name: p.name,
      nameBn: p.nameBn,
      price: p.price,
      old: p.old,
      image: p.imgs?.[0] ?? '',
      href: productHref(p),
    };
  });
  return out;
}

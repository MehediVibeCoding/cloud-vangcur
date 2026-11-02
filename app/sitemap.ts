// ফাইলের পাথ: app/sitemap.ts [REPLACE]
// পরিবর্তন: guide_pages টেবিল থেকে পাবলিশড গাইড পেজগুলো fetch করে sitemap-এ যোগ করা হয়েছে (guideRoutes)।
// গাইড পেজের URL এখন root-level, কোনো কমন "/guides" প্রিফিক্স নেই — প্রতিটা
// পেজের টেমপ্লেট নিজের url_prefix ঠিক করে (কম্পেয়ার '/compare', ইনস্টল
// '/install', খালি হলে সরাসরি রুটে), তাই fetchAllPublishedGuideUrls()
// ইতিমধ্যে পূর্ণ, সঠিক পাথ রিটার্ন করে।
import type { MetadataRoute } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fetchCustomProducts, productHref, prodInCat } from '@/lib/productData';
import { fetchCategories, makeCatSlug } from '@/lib/categoryData';
import type { Product } from '@/types';
import { fetchAllPublishedGuideUrls } from '@/lib/guidePageData';
import { COLLECTION_IDS } from '@/lib/showcaseData';

const SITE_URL = 'https://vangcur.com';

export const revalidate = 3600;

/**
 * F7: প্রোডাক্টের আসল শেষ-কনটেন্ট-বদলের তারিখ (custom_products.updated_at — ডাটাবেজ ট্রিগার শুধু
 * আসল কনটেন্ট বদলালে সেট করে, স্টক/ক্রম/রেটিং বদলালে নয়)। কলাম না থাকলে বা কোয়েরি ব্যর্থ হলে
 * খালি ম্যাপ — তখন সাইটম্যাপে lastModified বাদ যায় (বানানো "এখন" দেওয়ার চেয়ে ভালো)।
 */
async function fetchProductUpdatedAt(supabase: SupabaseClient): Promise<Map<string, Date>> {
  const out = new Map<string, Date>();
  try {
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('custom_products')
        .select('id, updated_at')
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error || !data) return new Map();
      for (const row of data as { id: number | string; updated_at: string | null }[]) {
        const d = row.updated_at ? new Date(row.updated_at) : null;
        if (d && !Number.isNaN(d.getTime())) out.set(String(row.id), d);
      }
      if (data.length < PAGE) break;
    }
  } catch {
    return new Map();
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let products: Product[] = [];
  let categories: { id: string; name: string }[] = [];
  let guidePages: { url: string; updated_at: string }[] = [];
  let updatedAtById = new Map<string, Date>();

  // F8: আগে ডাটাবেজ ব্যর্থ হলে ক্যাচ ব্লক চুপচাপ গিলে ফেলত, ফলে শুধু স্ট্যাটিক URL-এর ছোট
  // সাইটম্যাপ বানিয়ে সেটাই ১ ঘণ্টা ক্যাশ হতো। এখন (রানটাইমে) ব্যর্থতা বা "০টা প্রোডাক্ট" এলে
  // throw করা হয়, যাতে ভুল/আংশিক সাইটম্যাপ ক্যাশে না বসে। বিল্ড-ফেজে throw করা হয় না —
  // নইলে ডাটাবেজ সাময়িক বন্ধ থাকলে পুরো ডিপ্লয়ই ভেঙে যেত।
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const [prods, cats, guides, stamps] = await Promise.all([
        fetchCustomProducts(supabase),
        fetchCategories(supabase),
        fetchAllPublishedGuideUrls(supabase),
        fetchProductUpdatedAt(supabase),
      ]);
      products = prods;
      updatedAtById = stamps;
      // F4: শুধু অন্তত ১টা প্রোডাক্টওয়ালা ক্যাটাগরি সাইটম্যাপে (খালি পেজ ক্রল-বাজেট নষ্ট করে ও
      // "থিন পেজ" সংকেত দেয়)। নতুন প্রোডাক্ট যোগ হলে ক্যাটাগরি নিজে থেকেই ফিরে আসবে।
      categories = cats.filter((c) => c.id !== 'all' && prods.some((p) => prodInCat(p, c.id)));
      guidePages = guides;
    } catch (err) {
      if (!isBuildPhase) throw err;
    }
    if (!isBuildPhase && products.length === 0) {
      throw new Error('[sitemap] প্রোডাক্ট তালিকা খালি — আংশিক সাইটম্যাপ ক্যাশ না করতে ব্যর্থ ঘোষণা');
    }
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/offers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/guide`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/shipping`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/warranty`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/refund-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    // F12: /track-order ইউটিলিটি পেজ — সার্চে আনার মতো কনটেন্ট নয়, তাই সাইটম্যাপ থেকে বাদ
  ];

  // F7: ক্যাটাগরির তারিখ = তার প্রোডাক্টগুলোর সবচেয়ে নতুন আসল আপডেট; জানা না থাকলে বাদ
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => {
    let latest: Date | undefined;
    for (const p of products) {
      if (!prodInCat(p, cat.id)) continue;
      const d = updatedAtById.get(String(p.id));
      if (d && (!latest || d > latest)) latest = d;
    }
    return {
      url: `${SITE_URL}/category/${makeCatSlug(cat.id)}`,
      ...(latest ? { lastModified: latest } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  const collectionRoutes: MetadataRoute.Sitemap = COLLECTION_IDS.map((id) => ({
    url: `${SITE_URL}/collection/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((prod) => {
    const lastModified = updatedAtById.get(String(prod.id));
    return {
      url: `${SITE_URL}${productHref(prod)}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    };
  });

  const guideRoutes: MetadataRoute.Sitemap = guidePages.map((g) => ({
    url: `${SITE_URL}${g.url}`,
    lastModified: new Date(g.updated_at),
    changeFrequency: 'monthly',
    priority: 0.75,
  }));

  return [...staticRoutes, ...categoryRoutes, ...collectionRoutes, ...productRoutes, ...guideRoutes];
}

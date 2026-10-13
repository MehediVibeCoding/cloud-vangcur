// ফাইলের পাথ: app/sitemap.ts [REPLACE]
// পরিবর্তন: guide_pages টেবিল থেকে পাবলিশড গাইড পেজগুলো fetch করে sitemap-এ যোগ করা হয়েছে (guideRoutes)।
// গাইড পেজের URL এখন root-level, কোনো কমন "/guides" প্রিফিক্স নেই — প্রতিটা
// পেজের টেমপ্লেট নিজের url_prefix ঠিক করে (কম্পেয়ার '/compare', ইনস্টল
// '/install', খালি হলে সরাসরি রুটে), তাই fetchAllPublishedGuideUrls()
// ইতিমধ্যে পূর্ণ, সঠিক পাথ রিটার্ন করে।
import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { fetchCustomProducts, productHref } from '@/lib/productData';
import { fetchCategories, makeCatSlug } from '@/lib/categoryData';
import { fetchAllPublishedGuideUrls } from '@/lib/guidePageData';
import { COLLECTION_IDS } from '@/lib/showcaseData';

const SITE_URL = 'https://vangcur.com';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let products: { id: string | number; name: string }[] = [];
  let categories: { id: string; name: string }[] = [];
  let guidePages: { url: string; updated_at: string }[] = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const [prods, cats, guides] = await Promise.all([
        fetchCustomProducts(supabase),
        fetchCategories(supabase),
        fetchAllPublishedGuideUrls(supabase),
      ]);
      products = prods;
      categories = cats.filter((c) => c.id !== 'all');
      guidePages = guides;
    } catch {
      // Database fallback
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
    {
      url: `${SITE_URL}/track-order`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_URL}/category/${makeCatSlug(cat.id)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const collectionRoutes: MetadataRoute.Sitemap = COLLECTION_IDS.map((id) => ({
    url: `${SITE_URL}/collection/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((prod) => ({
    url: `${SITE_URL}${productHref(prod)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  const guideRoutes: MetadataRoute.Sitemap = guidePages.map((g) => ({
    url: `${SITE_URL}${g.url}`,
    lastModified: new Date(g.updated_at),
    changeFrequency: 'monthly',
    priority: 0.75,
  }));

  return [...staticRoutes, ...categoryRoutes, ...collectionRoutes, ...productRoutes, ...guideRoutes];
}

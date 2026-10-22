import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { fetchProductsPage, computeProductsListPaging } from '@/lib/productData';
import { fetchCategories, makeCatSlug, DEFAULT_CATEGORIES } from '@/lib/categoryData';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { logError } from '@/lib/logger';
import { loadProductsListingCached } from '@/lib/productListingCache';
import { getCachedCategories } from '@/lib/catalogIndex';
import ProductsPageClient from './ProductsPageClient';

const SITE_URL = 'https://vangcur.com';

export const revalidate = 3600;

interface ProductsPageProps {
  searchParams: Promise<{ page?: string; cat?: string }>;
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const { page: pageParam, cat } = await searchParams;
  const lang = await getServerLang();
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);

  const cats = cat ? await getCategoriesForMeta() : DEFAULT_CATEGORIES;
  const activeCat = cat ? cats.find((c) => c.id === cat || makeCatSlug(c.id) === cat) : null;

  const baseTitle = activeCat
    ? (lang === 'en' ? `${activeCat.name} Products` : `${activeCat.name} সমূহ`)
    : (lang === 'en' ? 'All Products' : 'সকল প্রোডাক্ট');
  const title = page > 1 ? `${baseTitle} — ${lang === 'en' ? 'Page' : 'পেজ'} ${page}` : baseTitle;

  const qs = new URLSearchParams();
  if (activeCat) qs.set('cat', activeCat.id);
  if (page > 1) qs.set('page', String(page));
  const canonical = `/products${qs.toString() ? `?${qs.toString()}` : ''}`;

  return {
    title: `${title} - Vangcur`,
    description: lang === 'en'
      ? 'Browse the full Vangcur product catalog — best prices, fast home delivery.'
      : 'ভাঙচুর-এর সম্পূর্ণ প্রোডাক্ট ক্যাটালগ দেখুন — সেরা দামে, দ্রুত হোম ডেলিভারিতে।',
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}${canonical}`,
      title: `${title} - Vangcur`,
      siteName: 'Vangcur',
      locale: lang === 'en' ? 'en_US' : 'bn_BD',
      images: [{ url: '/vangcur-logo.png', width: 991, height: 365, alt: 'Vangcur' }],
    },
  };
}

// ক্যাশ-করা ক্যাটাগরি-তালিকা (৫ মিনিট, 'catalog' ট্যাগ) — আগে ?cat= থাকলে প্রতি রিকোয়েস্টে ডাটাবেজ থেকে আসত
async function getCategoriesForMeta() {
  try {
    const cached = await getCachedCategories();
    if (cached && cached.length) return cached;
  } catch {
    // ক্যাশ ব্যর্থ — নিচের সরাসরি পথ
  }
  return getCategoriesSafe();
}

async function getCategoriesSafe() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return DEFAULT_CATEGORIES;
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    return await fetchCategories(supabase);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { page: pageParam, cat: catParam } = await searchParams;
  const requestedPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const activeCat = catParam || 'all';

  // 🆕 প্রধান পথ: সবই ক্যাশ থেকে (lib/productListingCache.ts) — ভিজিটর-প্রতি ডাটাবেজ কল নেই।
  // ক্যাশ/কোয়েরি ব্যর্থ হলে cached = null, তখন নিচের আগের সরাসরি-ডাটাবেজ কোড চলে (আচরণ অপরিবর্তিত)।
  const cached = await loadProductsListingCached(activeCat, requestedPage);
  if (cached) {
    const catName = activeCat !== 'all' ? cached.cats.find((c) => c.id === activeCat)?.name : undefined;
    return (
      <ProductsPageClient
        products={cached.productsPage.products}
        paging={cached.paging}
        activeCat={activeCat}
        categoryName={catName}
      />
    );
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
      logError('[Vangcur] ProductsPage: createClient() failed:', e);
      supabase = null;
    }
  } else {
    logError('[Vangcur] ProductsPage: Supabase env var missing at request time.');
  }

  const [cats, probe] = supabase
    ? await Promise.all([
      fetchCategories(supabase),
      // মোট সংখ্যা জানার জন্য হালকা প্রোব — fetchProductsPage নিজেই `total` রিটার্ন করে,
      // তাই ১টা আইটেম চেয়ে total বের করে তারপর সঠিক offset/limit দিয়ে আসল পেজ আনা হয়
      fetchProductsPage(supabase, activeCat, 0, 1),
    ])
    : [DEFAULT_CATEGORIES, { products: [], hasMore: false, total: 0 }];

  const paging = computeProductsListPaging(probe.total, requestedPage);

  const productsPage = supabase
    ? await fetchProductsPage(supabase, activeCat, paging.offset, paging.limit)
    : { products: [], hasMore: false, total: 0 };

  const categoryName = activeCat !== 'all' ? cats.find((c) => c.id === activeCat)?.name : undefined;

  return (
    <ProductsPageClient
      products={productsPage.products}
      paging={paging}
      activeCat={activeCat}
      categoryName={categoryName}
    />
  );
}

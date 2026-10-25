import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { fetchProductsPage, PRODUCTS_PAGE_SIZE } from '@/lib/productData';
import { fetchCategories, makeCatSlug, DEFAULT_CATEGORIES } from '@/lib/categoryData';
import { fetchHeroCards, DEFAULT_HERO_CARDS } from '@/lib/heroSliderData';
import { fetchShowcase, DEFAULT_SHOWCASE } from '@/lib/showcaseData';
import { fetchSettingsBatch, HOME_SETTING_KEYS } from '@/lib/storeSettingsBatch';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { brandedTitle } from '@/lib/seoTitle';
import { categoryHasProductsCached } from '@/lib/productListingCache';
import ClientHome from '@/app/ClientHome';

const SITE_URL = 'https://vangcur.com';

export const revalidate = 7200;

// ⚡ খালি generateStaticParams: বিল্ডের সময় কিছু প্রি-রেন্ডার হয় না, কিন্তু প্রথম ভিজিটে পেজ
// বানিয়ে CDN-এ ক্যাশ হয় এবং `revalidate` অনুযায়ী ব্যাকগ্রাউন্ডে নবায়ন হয় (on-demand ISR)।
export async function generateStaticParams() {
  return [];
}


const getCategories = cache(async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return DEFAULT_CATEGORIES;
  const supabase = createClient(supabaseUrl, supabaseKey);
  return fetchCategories(supabase);
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [cats, lang] = await Promise.all([getCategories(), getServerLang()]);
  const cat = cats.find((c) => c.id !== 'all' && makeCatSlug(c.id) === slug) || null;
  if (!cat) {
    return {
      title: lang === 'en' ? 'Category Not Found - Vangcur' : 'ক্যাটাগরি পাওয়া যায়নি - Vangcur',
      robots: { index: false, follow: true },
    };
  }
  const title = `${cat.name} - Vangcur`;
  const description = lang === 'en'
    ? `Browse the best products in the ${cat.name} category on Vangcur — best prices, fast home delivery.`
    : `Vangcur-এ ${cat.name} ক্যাটাগরির সেরা প্রোডাক্টগুলো দেখুন — সেরা দামে, দ্রুত হোম ডেলিভারিতে।`;
  // F4: প্রোডাক্টহীন (খালি) ক্যাটাগরি পেজ ইনডেক্স হবে না; লিংক-সংকেত (follow) বহাল। ক্যাশ-করা
  // সারি থেকে চেক, ব্যর্থ হলে (null) আগের মতোই ইনডেক্সযোগ্য। অ্যাডমিন প্রোডাক্ট সেভ করলে
  // /api/revalidate-catalog এই পেজও পার্জ করে, তাই প্রোডাক্ট যোগ হলে noindex নিজে সরে যায়।
  const hasProducts = await categoryHasProductsCached(cat.id);
  return {
    // F3: টাইটেলে ব্র্যান্ড আগে থেকেই আছে — টেমপ্লেট যেন আবার না জোড়ে
    title: brandedTitle(title),
    description,
    ...(hasProducts === false ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: `/category/${makeCatSlug(cat.id)}` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/category/${makeCatSlug(cat.id)}`,
      title,
      description,
      locale: lang === 'en' ? 'en_US' : 'bn_BD',
      siteName: 'Vangcur',
      images: [{ url: '/vangcur-logo.png', width: 991, height: 365, alt: 'Vangcur' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/vangcur-logo.png'],
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cats = await getCategories();
  const cat = cats.find((c) => c.id !== 'all' && makeCatSlug(c.id) === slug) || null;
  if (!cat) notFound();

  let supabase: ReturnType<typeof createClient> | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch {
      supabase = null;
    }
  }

  // 🔒 ফিক্স (audit P1-16): হোমপেজের মতোই এখানেও পুরো ক্যাটালগ না এনে শুধু
  // এই ক্যাটাগরির প্রথম পেজ আনা হচ্ছে
  // 🔧 ফিক্স: হোম পেজের মতোই এখানেও শোকেস (কালেকশন কার্ড + স্পটলাইট) আনা হচ্ছে —
  // আগে এটা এই পেজে না থাকায়, ক্যাটাগরিতে ঢুকে আবার "অল প্রোডাক্টস"-এ ফিরলে
  // (এই পেজেই থেকে, ফিল্টার রিসেট করে) নিচের দুটো সেকশন উধাও হয়ে যেত।
  // ⚡ হোমের মতোই store_settings এর তিনটা কী এক কলে; ব্যর্থ হলে settings = null → আগের মতো আলাদা কোয়েরি
  const [productsPage, settings] = supabase
    ? await Promise.all([
      fetchProductsPage(supabase, cat.id, 0, PRODUCTS_PAGE_SIZE),
      fetchSettingsBatch(supabase, HOME_SETTING_KEYS),
    ])
    : [{ products: [], hasMore: false }, null];
  const [initialCategories, initialHeroCards, initialShowcase] = supabase
    ? await Promise.all([
      fetchCategories(supabase, settings),
      fetchHeroCards(supabase, settings),
      fetchShowcase(supabase, settings),
    ])
    : [DEFAULT_CATEGORIES, DEFAULT_HERO_CARDS, DEFAULT_SHOWCASE];
  const initialProducts = productsPage.products;
  const initialHasMore = productsPage.hasMore;

  return (
    <>
      {/* F5: ক্যাটাগরি পেজে আগে কোনো <h1> ছিল না। sr-only — দৃশ্যমান ডিজাইনে কোনো পরিবর্তন নেই
          (হোমের SeoIntro-র মতোই); সার্চ ইঞ্জিন ও স্ক্রিন-রিডার পেজের বিষয় বুঝতে পারে। */}
      <h1 className="sr-only">{cat.name}</h1>
      <ClientHome
        initialProducts={initialProducts}
        initialCategories={initialCategories}
        initialHeroCards={initialHeroCards}
        initialCategory={cat.id}
        initialHasMore={initialHasMore}
        initialShowcase={initialShowcase}
      />
    </>
  );
}

import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { fetchShowcase, DEFAULT_SHOWCASE } from '@/lib/showcaseData';
import { fetchCollectionProducts, isCollectionId } from '@/lib/collectionData';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { brandedTitle } from '@/lib/seoTitle';
import CollectionPageClient from './CollectionPageClient';

const SITE_URL = 'https://vangcur.com';

export const revalidate = 7200;

// ⚡ ক্যাটাগরি পেজের মতোই: বিল্ডে কিছু প্রি-রেন্ডার হয় না, প্রথম ভিজিটে বানিয়ে ক্যাশ হয় (on-demand ISR)
export async function generateStaticParams() {
  return [];
}

function makeSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch {
    return null;
  }
}

const getShowcase = cache(async () => {
  const supabase = makeSupabase();
  return supabase ? fetchShowcase(supabase) : DEFAULT_SHOWCASE;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lang = await getServerLang();
  if (!isCollectionId(slug)) {
    return {
      title: lang === 'en' ? 'Collection Not Found - Vangcur' : 'কালেকশন পাওয়া যায়নি - Vangcur',
      robots: { index: false, follow: true },
    };
  }
  const showcase = await getShowcase();
  const card = showcase.cards.find((c) => c.collectionId === slug);
  const name = card ? (lang === 'en' && card.titleEn ? card.titleEn : card.title) : slug;
  const title = `${name} - Vangcur`;
  const description = lang === 'en'
    ? `Explore the ${name} collection on Vangcur — hand-picked gadgets, best prices, fast home delivery.`
    : `Vangcur-এর ${name} কালেকশন দেখুন — বাছাই করা গ্যাজেট, সেরা দামে, দ্রুত হোম ডেলিভারিতে।`;
  return {
    // F3: টাইটেলে ব্র্যান্ড আগে থেকেই আছে — টেমপ্লেট যেন আবার না জোড়ে
    title: brandedTitle(title),
    description,
    alternates: { canonical: `/collection/${slug}` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/collection/${slug}`,
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

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isCollectionId(slug)) notFound();

  const showcase = await getShowcase();
  const card = showcase.cards.find((c) => c.collectionId === slug);
  if (!card) notFound();

  const supabase = makeSupabase();
  const products = supabase ? await fetchCollectionProducts(supabase, slug) : [];

  return <CollectionPageClient title={card.title} titleEn={card.titleEn} products={products} />;
}

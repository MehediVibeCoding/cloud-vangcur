import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { idFromSlug, makeSlug, fetchProductById, fetchRelatedProducts } from '@/lib/productData';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { fetchProductReviews } from '@/lib/productReviewData';
import { fetchProductQuestions } from '@/lib/productQnaData';
import type { Product, ProductReview, ProductQuestion } from '@/types';
import ProductDetailClient from './ProductDetailClient';

const SITE_URL = 'https://vangcur.com';

export const revalidate = 300;

// ⚡ খালি generateStaticParams: বিল্ডের সময় কিছু প্রি-রেন্ডার হয় না, কিন্তু প্রথম ভিজিটে পেজ
// বানিয়ে CDN-এ ক্যাশ হয় এবং `revalidate` অনুযায়ী ব্যাকগ্রাউন্ডে নবায়ন হয় (on-demand ISR)।
export async function generateStaticParams() {
  return [];
}


const getProduct = cache(async (id: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  const supabase = createClient(supabaseUrl, supabaseKey);
  return fetchProductById(supabase, id);
});

// পুরো ক্যাটালগ নয় — শুধু এই প্রোডাক্টের রিলেটেড + কালার-সিবলিং (৫০০+ প্রোডাক্টেও পেজ হালকা থাকে)
const getRelatedProducts = cache(async (product: Product) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];
  const supabase = createClient(supabaseUrl, supabaseKey);
  return fetchRelatedProducts(supabase, product);
});

const getProductReviewsSummary = cache(async (id: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('rating')
      .eq('product_id', id)
      .eq('is_approved', true);

    if (error || !data || !data.length) return null;
    const count = data.length;
    const total = data.reduce((s, r) => s + (Number(r.rating) || 5), 0);
    return {
      ratingValue: Number((total / count).toFixed(1)),
      reviewCount: count,
    };
  } catch {
    return null;
  }
});

// 🆕 অনুমোদিত রিভিউ ও প্রশ্নোত্তর — সার্ভারে (ISR, ৫ মিনিট ক্যাশ) একবার এনে পেজের সাথে পাঠানো হয়,
// যাতে প্রতিটি গেস্ট-ভিজিটরের ব্রাউজার থেকে আলাদা করে Supabase-এ কল না যায়।
// anon ক্লায়েন্টে RLS শুধু অনুমোদিত রিভিউ দেখায় (নিজের/অ্যাডমিনের পেন্ডিং নয়), আর প্রশ্নোত্তর সবার জন্য
// খোলা — ব্রাউজারের গেস্ট-কোয়েরির সাথে হুবহু একই ফলাফল। লগইন-করা ইউজার ও অ্যাডমিন আগের মতোই
// ব্রাউজার থেকে সরাসরি ফ্রেশ ডেটা আনে (নিজের পেন্ডিং রিভিউ, উত্তর-দেওয়ার যোগ্যতা ইত্যাদির জন্য)।
// কোনো কারণে ব্যর্থ হলে বা সীমায় (৩০০/১৫০) পৌঁছালে null — তখন ক্লায়েন্ট আগের পথেই নিজে আনে।
const REVIEWS_CAP = 300;
const QUESTIONS_CAP = 150;

const getInitialReviews = cache(async (id: string): Promise<{ productId: string; reviews: ProductReview[] } | null> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const reviews = await fetchProductReviews(supabase, id, null);
    if (reviews.length >= REVIEWS_CAP) return null;
    return { productId: id, reviews };
  } catch {
    return null;
  }
});

const getInitialQuestions = cache(async (id: string): Promise<{ productId: string; questions: ProductQuestion[] } | null> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const questions = await fetchProductQuestions(supabase, id);
    if (questions.length >= QUESTIONS_CAP) return null;
    return { productId: id, questions };
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromSlug(slug);
  if (!id) {
    return {
      title: 'Product Not Found - Vangcur',
      robots: { index: false, follow: false },
    };
  }

  const [p, lang] = await Promise.all([getProduct(id), getServerLang()]);

  if (!p) {
    return {
      title: lang === 'en' ? 'Product Not Found - Vangcur' : 'প্রোডাক্ট পাওয়া যায়নি - Vangcur',
      robots: { index: false, follow: false },
    };
  }

  const autoTitle = `${p.name} - ৳${Number(p.price).toLocaleString('en-US')} | Vangcur`;
  const title = p.metaTitle || autoTitle;

  const rawDesc = p.desc || '';
  const autoDescription = rawDesc
    ? (rawDesc.length > 160 ? rawDesc.slice(0, 157) + '...' : rawDesc)
    : (lang === 'en'
      ? `${p.name} for just ৳${Number(p.price).toLocaleString('en-US')} at Vangcur. Fast delivery, best price.`
      : `${p.name} মাত্র ৳${Number(p.price).toLocaleString('en-US')} টাকায়, Vangcur-এ। দ্রুত ডেলিভারি, সেরা দাম।`);
  const description = p.metaDescription || autoDescription;
  const ogDescription = p.ogDescription || description;

  const canonicalSlug = `${makeSlug(p.name)}-${p.id}`;

  return {
    title,
    description,
    alternates: { canonical: `/product/${canonicalSlug}` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/product/${canonicalSlug}`,
      title,
      description: ogDescription,
      locale: lang === 'en' ? 'en_US' : 'bn_BD',
      siteName: 'Vangcur',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: ogDescription,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idFromSlug(slug);

  if (!id) notFound();

  const initialProduct = await getProduct(id);
  if (!initialProduct) notFound();

  const [liveReviewsSummary, relatedProducts, initialReviews, initialQuestions] = await Promise.all([
    getProductReviewsSummary(id),
    getRelatedProducts(initialProduct),
    getInitialReviews(id),
    getInitialQuestions(id),
  ]);
  // ক্লায়েন্টের `prods` তালিকায় বর্তমান প্রোডাক্ট নিজেও থাকতে হয় (baseProd এখান থেকেই খোঁজা হয়)
  const initialProducts = [initialProduct, ...relatedProducts];

  const canonicalSlug = `${makeSlug(initialProduct.name)}-${initialProduct.id}`;
  const validImgs = (initialProduct.imgs || []).filter(
    (img) => typeof img === 'string' && img.startsWith('http')
  );

  const ratingValue = liveReviewsSummary?.ratingValue || initialProduct.rating || 4.8;
  const reviewCount = liveReviewsSummary?.reviewCount || Math.floor((Number(initialProduct.id) || 1) * 37 + initialProduct.stock * 13) % 80 + 20;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: initialProduct.name,
    image: validImgs.length ? validImgs : undefined,
    description: initialProduct.desc || initialProduct.metaDescription || initialProduct.name,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: initialProduct.price,
      availability: initialProduct.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/product/${canonicalSlug}`,
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Vangcur',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue,
      reviewCount,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient
        slug={slug}
        initialId={id}
        initialProduct={initialProduct}
        initialProducts={initialProducts || []}
        initialReviews={initialReviews}
        initialQuestions={initialQuestions}
      />
    </>
  );
}

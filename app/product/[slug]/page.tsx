import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { idFromSlug, productSlug, fetchProductBundle, fetchRelatedProducts, RELATED_NEIGHBOUR_COUNT } from '@/lib/productData';
import { getOrderedRowsCached } from '@/lib/productListingCache';
import { DEFAULT_CATEGORIES, makeCatSlug } from '@/lib/categoryData';
import { DEFAULT_SHIP_CFG } from '@/lib/checkoutData';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { brandedTitle } from '@/lib/seoTitle';
import type { Product } from '@/types';
import ProductDetailClient from './ProductDetailClient';

const SITE_URL = 'https://vangcur.com';

// 🛡️ রিকোয়েস্ট/KV-লেখা সেভিং (২০২৬-১০): ৩০০ (৫ মিনিট) → ৮৬৪০০ (২৪ ঘণ্টা)। ফ্রি প্ল্যানে KV লেখার সীমা কম;
// প্রতিটা নবায়নে Supabase কোয়েরি + CPU + KV লেখা খরচ হয়। দাম/স্টক তাজা রাখে /api/live-products (৩ মিনিট পর পর),
// আর অ্যাডমিন বদলালে অন-ডিমান্ড পার্জ। অ্যাডমিন বদলালে অন-ডিমান্ড পার্জ হয়, আর দাম/স্টক /api/live-products থেকে তাজা থাকে।
// ⚠️ Next.js এর সেগমেন্ট কনফিগ — অবশ্যই সরাসরি সংখ্যা (৭২০০) লিখতে হবে, গাণিতিক এক্সপ্রেশন নয়।
export const revalidate = 86400;

// ⚡ বিল্ডে শুধু জনপ্রিয় ~৬০টা প্রোডাক্ট প্রি-রেন্ডার (অ্যাডমিনের সাজানো ক্রমের প্রথম ৬০ — হোম/ক্যাটাগরির সামনের সারির
// প্রোডাক্ট, যেগুলোতে ভিজিট সবচেয়ে বেশি), বাকিগুলো প্রথম ভিজিটে বানিয়ে CDN-এ ক্যাশ হয় ও `revalidate` অনুযায়ী নবায়ন হয়
// (dynamicParams ডিফল্ট true, তাই তালিকার বাইরের পেজও কাজ করে)। বিল্ডে ডাটাবেজ না পেলে/ব্যর্থ হলে [] — বিল্ড কখনো ভাঙে না।
// ৬০টা কেন: প্রতিটা প্রি-রেন্ডার বিল্ডে ২টা কোয়েরি + ISR-ক্যাশে ১টা লেখা; ১,০০০টা করলে ডিপ্লয়ই ধীর ও লেখা-সীমা-ঘেঁষা হতো।
const PRERENDER_COUNT = 60;
export async function generateStaticParams() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return [];
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('custom_products')
      .select('id,name')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .limit(PRERENDER_COUNT);
    if (error || !data) return [];
    return (data as { id: number | string; name: string | null }[]).map((r) => ({ slug: productSlug(r.name, r.id) }));
  } catch {
    return [];
  }
}


// 🆕 এক কলে প্রোডাক্ট + অনুমোদিত রিভিউ + প্রশ্নোত্তর (lib/productData.ts → fetchProductBundle)। আগে ৫টা আলাদা
// রাউন্ড-ট্রিপ ছিল (প্রোডাক্ট, রিভিউ-সারাংশ, রিভিউ, প্রশ্ন, উত্তর) — অথচ ডেটা প্রায় সবসময় খালি। generateMetadata ও পেজ
// দুজনেই React `cache` দিয়ে একই ফলাফল ভাগ করে, তাই এক রেন্ডারে কোয়েরি একটাই।
const getBundle = cache(async (id: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  const supabase = createClient(supabaseUrl, supabaseKey);
  return fetchProductBundle(supabase, id);
});

const getProduct = cache(async (id: string) => (await getBundle(id))?.product ?? null);

// পুরো ক্যাটালগ নয় — শুধু এই প্রোডাক্টের রিলেটেড (৫টা) + কালার-সিবলিং। ক্যাটাগরির ক্রম আসে ক্যাশ-করা হালকা সারি থেকে
// (ডাটাবেজে প্রতি রেন্ডারে পুরো-ক্যাটালগ স্ক্যান নেই); ক্যাশ ব্যর্থ হলে fetchRelatedProducts আগের সরাসরি-ডাটাবেজ পথে যায়।
const getRelatedProducts = cache(async (product: Product) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];
  const supabase = createClient(supabaseUrl, supabaseKey);
  const orderedRows = await getOrderedRowsCached();
  return fetchRelatedProducts(supabase, product, RELATED_NEIGHBOUR_COUNT, orderedRows);
});

// ফলব্যাক: বান্ডলে রিভিউ ৩০০-র সীমায় পৌঁছালে (বা বান্ডল-কোয়েরি ব্যর্থ হলে) সারাংশ আগের মতো আলাদা কোয়েরিতে
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

// রিভিউ ও প্রশ্নোত্তর এখন getBundle-এর এক কলেই আসে (আগে getInitialReviews/getInitialQuestions আলাদা কল ছিল)।
// anon ক্লায়েন্টে RLS শুধু অনুমোদিত রিভিউ দেখায়; লগইন-করা ইউজার ও অ্যাডমিন আগের মতোই ব্রাউজার থেকে সরাসরি ফ্রেশ ডেটা আনে।
// বান্ডল ব্যর্থ হলে বা সীমায় (৩০০/১৫০) পৌঁছালে reviews/questions null — তখন ক্লায়েন্ট আগের পথেই নিজে আনে।

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

  const canonicalSlug = productSlug(p.name, p.id);

  // OG ছবি: Worker-এ ছবি আঁকার বদলে প্রোডাক্টের নিজের প্রথম ছবির সরাসরি URL (CPU খরচ নেই)
  const ogImg = (p.imgs || []).find((img) => typeof img === 'string' && img.startsWith('http'));
  const ogImages = ogImg
    ? [{ url: ogImg, alt: p.name }]
    : [{ url: `${SITE_URL}/vangcur-logo.png`, width: 991, height: 365, alt: 'Vangcur' }];

  return {
    // F3: meta_title/autoTitle-এ ব্র্যান্ড আগে থেকেই আছে — layout-এর টেমপ্লেট যেন আবার না জোড়ে
    title: brandedTitle(title),
    description,
    alternates: { canonical: `/product/${canonicalSlug}` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/product/${canonicalSlug}`,
      title,
      description: ogDescription,
      locale: lang === 'en' ? 'en_US' : 'bn_BD',
      siteName: 'Vangcur',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: ogDescription,
      images: ogImages.map((i) => i.url),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idFromSlug(slug);

  if (!id) notFound();

  const bundle = await getBundle(id);
  if (!bundle) notFound();
  const initialProduct = bundle.product;

  // 🛡️ ক্যানোনিকাল স্লাগ যাচাই: `idFromSlug` শুধু শেষের আইডি নেয়, তাই আগে `/product/যেকোনো-কিছু-5` প্রতিটাই আলাদা
  // পেজ হয়ে ISR ক্যাশ-এন্ট্রি (KV লেখা + CPU) বানাত, আর SEO-তে ডুপ্লিকেট হতো। এখন আসল স্লাগ না মিললে ৩০৮ রিডাইরেক্ট।
  // (makeSlug শুধু [a-z0-9-] দেয়, তাই এনকোডিং-এর ঝামেলা নেই; ইনকামিং স্লাগ সুরক্ষিতভাবে ডিকোড করে ছোট হাতের করা হয়।)
  const canonicalSlug = productSlug(initialProduct.name, initialProduct.id);
  let normalizedIncoming = slug;
  try {
    normalizedIncoming = decodeURIComponent(slug);
  } catch {
    // ভাঙা পার্সেন্ট-এনকোডিং — যেমন আছে তেমনই তুলনা হবে (মিলবে না, রিডাইরেক্ট হবে)
  }
  if (normalizedIncoming.toLowerCase() !== canonicalSlug) {
    permanentRedirect(`/product/${canonicalSlug}`);
  }

  // সারাংশ: বান্ডলে রিভিউ থাকলে সেখান থেকেই; ৩০০-র সীমায় পৌঁছালে/বান্ডল ফলব্যাকে আগের আলাদা কোয়েরি
  const [liveReviewsSummary, relatedProducts] = await Promise.all([
    bundle.reviewsSummary === undefined ? getProductReviewsSummary(id) : Promise.resolve(bundle.reviewsSummary),
    getRelatedProducts(initialProduct),
  ]);
  const initialReviews = bundle.reviews ? { productId: id, reviews: bundle.reviews } : null;
  const initialQuestions = bundle.questions ? { productId: id, questions: bundle.questions } : null;
  // ক্লায়েন্টের `prods` তালিকায় বর্তমান প্রোডাক্ট নিজেও থাকতে হয় (baseProd এখান থেকেই খোঁজা হয়)
  const initialProducts = [initialProduct, ...relatedProducts];

  const validImgs = (initialProduct.imgs || []).filter(
    (img) => typeof img === 'string' && img.startsWith('http')
  );

  // F1: aggregateRating শুধু আসল অনুমোদিত রিভিউ (≥১) থাকলেই — আগে রিভিউ না থাকলে ডিফল্ট রেটিং
  // ও বানানো রিভিউ-সংখ্যা Google-কে পাঠানো হতো, যা structured-data নীতির পরিপন্থী।
  // 🆕 ব্যাচ ৮: শুধু যে ফিল্ডগুলোর আসল ডেটা আছে সেগুলোই যোগ করা হয়েছে (sku/mpn বাদ, ডেটা নেই)।
  const category = DEFAULT_CATEGORIES.find((c) => c.id === initialProduct.cat);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: initialProduct.name,
    image: validImgs.length ? validImgs : undefined,
    description: initialProduct.desc || initialProduct.metaDescription || initialProduct.name,
    ...(initialProduct.brand
      ? { brand: { '@type': 'Brand', name: initialProduct.brand } }
      : {}),
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
      // 🆕 সাইটের বর্তমান ডেলিভারি চার্জ (checkoutData.ts-এর DEFAULT_SHIP_CFG) থেকে — ঢাকা/বাইরে দুই রেট
      // deliveryTime: /shipping পেজ অনুযায়ী — পেমেন্ট যাচাইয়ের পর ২৪ কার্যঘণ্টার মধ্যে কুরিয়ারে হস্তান্তর (০–১ দিন),
      // তারপর ঢাকায় ১–২ কার্যদিবস, ঢাকার বাইরে ২–৪ কার্যদিবস।
      shippingDetails: [
        {
          '@type': 'OfferShippingDetails',
          shippingRate: { '@type': 'MonetaryAmount', value: DEFAULT_SHIP_CFG.dhaka, currency: 'BDT' },
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BD', addressRegion: 'Dhaka' },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
            transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
          },
        },
        {
          '@type': 'OfferShippingDetails',
          shippingRate: { '@type': 'MonetaryAmount', value: DEFAULT_SHIP_CFG.out, currency: 'BDT' },
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BD' },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
            transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 4, unitCode: 'DAY' },
          },
        },
      ],
      // মন পরিবর্তন/পছন্দ না হওয়ার কারণে কোনো রিটার্ন নেওয়া হয় না (/refund-policy পেজ অনুযায়ী) —
      // ওয়ারেন্টি/রিপ্লেসমেন্ট প্রোডাক্টভেদে আলাদা এবং প্রোডাক্ট ডিটেইলসে আছে, তাই এটা রিটার্ন পলিসি নয়।
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'BD',
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
        merchantReturnLink: `${SITE_URL}/refund-policy`,
      },
    },
    ...(liveReviewsSummary && liveReviewsSummary.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: liveReviewsSummary.ratingValue,
            reviewCount: liveReviewsSummary.reviewCount,
          },
        }
      : {}),
  };

  // 🆕 ব্যাচ ৮: BreadcrumbList — হোম → ক্যাটাগরি (থাকলে) → প্রোডাক্ট
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Vangcur', item: SITE_URL },
    ...(category
      ? [{ '@type': 'ListItem', position: 2, name: category.name, item: `${SITE_URL}/category/${makeCatSlug(category.id)}` }]
      : []),
    { '@type': 'ListItem', position: category ? 3 : 2, name: initialProduct.name, item: `${SITE_URL}/product/${canonicalSlug}` },
  ];
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  // 🆕 ব্যাচ ৮: FAQPage — প্রোডাক্টের ডাটাবেজ-ভিত্তিক FAQ থাকলেই শুধু যোগ হবে
  const faqJsonLd = initialProduct.faqs && initialProduct.faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: initialProduct.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
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

import { createClient } from '@supabase/supabase-js';
import { fetchProductsPage, PRODUCTS_PAGE_SIZE } from '@/lib/productData';
import { fetchCategories, DEFAULT_CATEGORIES } from '@/lib/categoryData';
import { fetchHeroCards, DEFAULT_HERO_CARDS } from '@/lib/heroSliderData';
import { fetchShowcase, DEFAULT_SHOWCASE } from '@/lib/showcaseData';
import { optimizeCloudinaryUrl, HERO_CARD_IMG_WIDTH } from '@/lib/cloudinaryUrl';
import { logError } from '@/lib/logger';
import type { Metadata } from 'next';
import { getServerLang } from '@/lib/i18n/getServerLang';
import { fetchSettingsBatch, HOME_SETTING_KEYS } from '@/lib/storeSettingsBatch';
import ClientHome from './ClientHome';
// ➕ নতুন ইম্পোর্ট — শুধু এই একটা লাইন যোগ হয়েছে (Google/crawler-এর জন্য
// sr-only purpose-description, দেখুন app/components/home/SeoIntro.tsx)
import SeoIntro from './components/home/SeoIntro';
import HomeJsonLd from './components/home/HomeJsonLd';

export const revalidate = 3600;

// ⚡ ব্যাচ ১: হোমের নিজস্ব title/description (আগে layout-এর ডিফল্ট — শুধু "Vangcur" — আসত)।
// getServerLang() layout-এও ব্যবহৃত, তাই এটা নতুন কোনো ডাটাবেজ/নেটওয়ার্ক কল যোগ করে না।
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  const title = lang === 'en'
    ? 'Vangcur — RGB Neon Lights, Crystal Ball Lamps & Gadgets in Bangladesh'
    : 'ভাঙচুর (Vangcur) — RGB নিওন লাইট, ক্রিস্টাল বল ল্যাম্প ও গ্যাজেট';
  const description = lang === 'en'
    ? 'Shop RGB neon lights, 3D crystal ball lamps, mini UPS and trendy gadgets at Vangcur — best prices with fast home delivery across Bangladesh.'
    : 'ভাঙচুর-এ পাবেন RGB নিওন লাইট, ৩ডি ক্রিস্টাল বল ল্যাম্প, মিনি UPS ও ট্রেন্ডি গ্যাজেট — সেরা দামে, সারা বাংলাদেশে দ্রুত হোম ডেলিভারি।';

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      url: 'https://vangcur.com',
      title,
      description,
      siteName: 'Vangcur',
      images: [{ url: '/vangcur-logo.png', width: 991, height: 365, alt: 'Vangcur' }],
      locale: lang === 'en' ? 'en_US' : 'bn_BD',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/vangcur-logo.png'],
    },
  };
}

// 🆕 কাস্টমার-গ্যালারির ছবি — হোম ISR-এর সাথে সার্ভারে একবার আনা হয় (আগে প্রতিটি নতুন ভিজিটরের
// ব্রাউজার থেকে আলাদা কোয়েরি যেত)। কোয়েরি হুবহু CustomerGallery-র আগের কোয়েরি; ব্যর্থ বা খালি হলে
// null — তখন কম্পোনেন্ট আগের মতো নিজে আনে।
async function fetchGalleryReviewsSafe(supabase: ReturnType<typeof createClient>) {
  try {
    const { data, error } = await supabase
      .from('customer_reviews')
      .select('id,image_url,alt_text,like_count,created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error || !data || data.length === 0) return null;
    return data as { id: number | string; image_url?: string | null; alt_text?: string | null; like_count?: number | string | null; created_at?: string }[];
  } catch {
    return null;
  }
}

export default async function HomePage() {
  // ⚠️ আগে createClient() কলটা কোনো try/catch ছাড়াই ছিল — এটাই একমাত্র
  // জায়গা যেখানে সরাসরি "throw" হতে পারত (যেমন env var কোনো একটা সার্ভার
  // রিকোয়েস্টে সাময়িকভাবে undefined এলে)। এই async Server Component-এর
  // ভেতরে uncaught throw ঘটলে পুরো Suspense boundary-টাই সার্ভারে ফেইল করে
  // যেত, আর Next.js পুরো পেজ ক্লায়েন্ট-সাইড রেন্ডারিং-এ পাঠিয়ে দিত (React
  // error #419 — কনসোলে যেটা দেখা যাচ্ছিল)।
  //
  // fetchCustomProducts/fetchCategories/fetchHeroCards — এই তিনটা ফাংশন
  // নিজেরাই আগে থেকে try/catch + রিট্রাই দিয়ে সুরক্ষিত এবং এরর হলে ফলব্যাক
  // ডেটা রিটার্ন করে, কখনো throw করে না। শুধু createClient()-এর এই একটা
  // ধাপই অরক্ষিত ছিল। নিচে ঠিক একই প্যাটার্নে (fetchCategories-এর মতোই)
  // try/catch দিয়ে ঘিরে দেওয়া হলো, এবং কোনো নতুন await/রিট্রাই/নেটওয়ার্ক
  // কল যোগ করা হয়নি — তাই স্বাভাবিক (সফল) কেসে লোড স্পিড অপরিবর্তিত থাকছে।
  // শুধু বিরল ব্যর্থতার কেসে পেজ ক্র্যাশ না করে ডিফল্ট ডেটা দিয়ে সার্ভারেই
  // সফলভাবে রেন্ডার হবে।
  let supabase: ReturnType<typeof createClient> | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
      logError('[Vangcur] HomePage: createClient() failed:', e);
      supabase = null;
    }
  } else {
    logError('[Vangcur] HomePage: Supabase env var missing at request time.');
  }

  // 🔒 ফিক্স (audit P1-16): আগে fetchCustomProducts() দিয়ে পুরো ক্যাটালগ SSR
  // পেলোডে যেত। এখন শুধু প্রথম পেজ (PRODUCTS_PAGE_SIZE) আসে — বাকিটা স্ক্রল
  // করলে ProductGrid.tsx ক্লায়েন্ট থেকে চেয়ে নেয়। প্রোডাক্ট সংখ্যা কম থাকা
  // অবস্থায় (যেমন এখন) আচরণ প্রায় একই থাকবে, কিন্তু ক্যাটালগ বড় হলে হোমপেজ
  // হালকা থেকে যাবে।
  // ⚡ store_settings এর তিনটা কী এক কলে (আগে ৩টা আলাদা কল)। ব্যাচ ব্যর্থ হলে settings = null,
  // তখন প্রতিটা ফেচার আগের মতো নিজে কোয়েরি করে — ফলব্যাক আচরণ অপরিবর্তিত।
  const [productsPage, settings, initialGallery] = supabase
    ? await Promise.all([
      fetchProductsPage(supabase, 'all', 0, PRODUCTS_PAGE_SIZE),
      fetchSettingsBatch(supabase, HOME_SETTING_KEYS),
      fetchGalleryReviewsSafe(supabase),
    ])
    : [{ products: [], hasMore: false }, null, null];
  const [initialCategories, initialHeroCards, initialShowcase] = supabase
    ? await Promise.all([
      fetchCategories(supabase, settings),
      fetchHeroCards(supabase, settings),
      fetchShowcase(supabase, settings),
    ])
    : [DEFAULT_CATEGORIES, DEFAULT_HERO_CARDS, DEFAULT_SHOWCASE];
  const initialProducts = productsPage.products;
  const initialHasMore = productsPage.hasMore;

  // LCP preload — derived from the same card data + the same
  // optimizeCloudinaryUrl() transform HeroSlider actually renders with,
  // so this URL can never drift out of sync with the real <img> src again.
  // Only rendered on the homepage (where the hero slider actually lives),
  // not site-wide, so other routes stop wastefully preloading it too.
  const lcpHeroImg = initialHeroCards[0]?.img
    ? optimizeCloudinaryUrl(initialHeroCards[0].img, HERO_CARD_IMG_WIDTH)
    : null;
  // ব্যাচ ২.১: ডেস্কটপে ৬টা হিরো-কার্ড একসাথে দেখা যায় (md:w-1/6), কিন্তু ৩–৬ নম্বর কার্ডের ছবি loading="lazy" —
  // PageSpeed ডেস্কটপে LCP এলিমেন্ট ছিল এমন একটা lazy ছবি, "resource load delay" ২.৩ সেকেন্ড। মোবাইলে মাত্র ২টা কার্ড
  // দেখা যায় (এগুলো আগে থেকেই eager), তাই বাকি ৪টা শুধু ≥768px-এ প্রিলোড হয় — মোবাইলে একটা বাড়তি বাইটও নামে না।
  // (নতুন কোনো ছবি/ট্রান্সফর্ম নয়: হুবহু একই URL যা HeroSlider পরে lazy করে চাইত।)
  const desktopHeroPreloads = initialHeroCards
    .slice(1, 6)
    .map((c) => (c?.img ? optimizeCloudinaryUrl(c.img, HERO_CARD_IMG_WIDTH) : null))
    .filter((h): h is string => !!h);

  return (
    <>
      {/* ➕ sr-only — কোনো ভিজুয়াল পরিবর্তন নেই, শুধু crawler/স্ক্রিন-রিডারের
          জন্য। দেখুন app/components/home/SeoIntro.tsx */}
      <SeoIntro />
      <HomeJsonLd />
      {lcpHeroImg && (
        <link
          rel="preload"
          as="image"
          href={lcpHeroImg}
          // @ts-expect-error - fetchpriority is standard in modern browsers
          fetchpriority="high"
        />
      )}
      {desktopHeroPreloads.map((href) => (
        <link key={href} rel="preload" as="image" href={href} media="(min-width: 768px)" />
      ))}
      <ClientHome
        initialProducts={initialProducts}
        initialCategories={initialCategories}
        initialHeroCards={initialHeroCards}
        initialHasMore={initialHasMore}
        initialShowcase={initialShowcase}
        initialGallery={initialGallery}
      />
    </>
  );
}

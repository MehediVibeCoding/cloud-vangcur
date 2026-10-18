import { createClient } from '@supabase/supabase-js';
import { fetchProductsPage, PRODUCTS_PAGE_SIZE } from '@/lib/productData';
import { fetchCategories, DEFAULT_CATEGORIES } from '@/lib/categoryData';
import { fetchHeroCards, DEFAULT_HERO_CARDS } from '@/lib/heroSliderData';
import { fetchShowcase, DEFAULT_SHOWCASE } from '@/lib/showcaseData';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { logError } from '@/lib/logger';
import ClientHome from './ClientHome';
// ➕ নতুন ইম্পোর্ট — শুধু এই একটা লাইন যোগ হয়েছে (Google/crawler-এর জন্য
// sr-only purpose-description, দেখুন app/components/home/SeoIntro.tsx)
import SeoIntro from './components/home/SeoIntro';
import HomeJsonLd from './components/home/HomeJsonLd';

export const revalidate = 120;

// 🆕 কাস্টমার-গ্যালারির ছবি — হোম ISR-এর সাথে সার্ভারে একবার আনা হয় (আগে প্রতিটি নতুন ভিজিটরের
// ব্রাউজার থেকে আলাদা কোয়েরি যেত)। কোয়েরি হুবহু CustomerGallery-র আগের কোয়েরি; ব্যর্থ বা খালি হলে
// null — তখন কম্পোনেন্ট আগের মতো নিজে আনে।
async function fetchGalleryReviewsSafe(supabase: ReturnType<typeof createClient>) {
  try {
    const { data, error } = await supabase
      .from('customer_reviews')
      .select('id,image_url,like_count,created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error || !data || data.length === 0) return null;
    return data as { id: number | string; image_url?: string | null; like_count?: number | string | null; created_at?: string }[];
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
  const [productsPage, initialCategories, initialHeroCards, initialShowcase, initialGallery] = supabase
    ? await Promise.all([
      fetchProductsPage(supabase, 'all', 0, PRODUCTS_PAGE_SIZE),
      fetchCategories(supabase),
      fetchHeroCards(supabase),
      fetchShowcase(supabase),
      fetchGalleryReviewsSafe(supabase),
    ])
    : [{ products: [], hasMore: false }, DEFAULT_CATEGORIES, DEFAULT_HERO_CARDS, DEFAULT_SHOWCASE, null];
  const initialProducts = productsPage.products;
  const initialHasMore = productsPage.hasMore;

  // LCP preload — derived from the same card data + the same
  // optimizeCloudinaryUrl() transform HeroSlider actually renders with,
  // so this URL can never drift out of sync with the real <img> src again.
  // Only rendered on the homepage (where the hero slider actually lives),
  // not site-wide, so other routes stop wastefully preloading it too.
  const lcpHeroImg = initialHeroCards[0]?.img
    ? optimizeCloudinaryUrl(initialHeroCards[0].img, 360)
    : null;

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

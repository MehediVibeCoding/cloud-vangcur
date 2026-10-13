import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 🛠️ বিল্ড-টাইম ফিক্স:
// Next.js static prerendering-এর সময় Navbar/Footer/CartSidebar-সহ অনেক
// 'use client' কম্পোনেন্ট সার্ভারেও একবার রেন্ডার হয় (initial HTML বানানোর জন্য)।
// সেই মুহূর্তে কোনো কারণে env var অনুপস্থিত থাকলে আগে পুরো `next build` ক্র্যাশ
// করত। প্রকৃতপক্ষে এই prerender পাসে supabase দিয়ে কোনো আসল নেটওয়ার্ক কল হয়
// না — সেগুলো সব useEffect/ইভেন্ট হ্যান্ডলারের ভেতরে, যা সার্ভারে রান হয় না।
// তাই সার্ভার-সাইডে (build/prerender) placeholder ভ্যালু দিয়ে client বানানো
// সম্পূর্ণ নিরাপদ। ব্রাউজারে আসলেই env var না থাকলে এখনো স্পষ্ট এরর থ্রো হয়,
// যাতে misconfiguration চোখ এড়িয়ে না যায়।
export function createClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      SUPABASE_URL || 'https://placeholder.supabase.co',
      SUPABASE_ANON_KEY || 'placeholder-anon-key'
    );
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase env var পাওয়া যায়নি — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ব্রাউজার বান্ডলে সেট করা নেই।'
    );
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

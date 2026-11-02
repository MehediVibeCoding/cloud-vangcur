import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCachedCatalogIndex, getCachedCategories } from '@/lib/catalogIndex';
import { searchProducts, matchCategories } from '@/lib/searchData';
import { DEFAULT_CATEGORIES } from '@/lib/categoryData';
import { getServerLang } from '@/lib/i18n/getServerLang';
import SearchClient from './SearchClient';
import SearchSkeleton from './SearchSkeleton';
import { chipWidthFor } from './skeletonUtil';

const MAX_SEARCH_LEN = 60;
// সার্ভার থেকে সর্বোচ্চ এতগুলো ম্যাচ পাঠানো হয় (পুরো ক্যাটালগ না)। এর বেশি মিললে
// ক্লায়েন্ট পরে হালকা ইনডেক্স এনে বাকিটা সম্পূর্ণ করে।
const MAX_SERVER_RESULTS = 120;

function cleanQuery(q: string | undefined): string {
  return (q || '').replace(/[<>`]/g, '').trim().slice(0, MAX_SEARCH_LEN);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const [{ q }, lang] = await Promise.all([searchParams, getServerLang()]);
  const query = cleanQuery(q);
  const title = lang === 'en'
    ? (query ? `Search results for "${query}" - Vangcur` : 'Search Results - Vangcur')
    : (query ? `"${query}" এর সার্চ ফলাফল - Vangcur` : 'সার্চ ফলাফল - Vangcur');
  return {
    title,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = cleanQuery(q);

  // একই ৫ মিনিটের ক্যাশ — ডাটাবেসে বারবার যায় না। সার্চটা এখানে সার্ভারেই চলে, তাই
  // ব্রাউজারে শুধু মিলে যাওয়া প্রোডাক্টগুলো যায় এবং প্রথম HTML-এই প্রোডাক্ট থাকে
  // (আগের মতো স্কেলেটনের পর খালি পেজ, তারপর প্রোডাক্ট — এই ফাঁক আর থাকবে না)।
  const [catalog, initialCategories] = await Promise.all([
    getCachedCatalogIndex(),
    getCachedCategories(),
  ]);

  const matches = query ? searchProducts(catalog, query) : [];
  const truncated = matches.length > MAX_SERVER_RESULTS;
  const initialResults = truncated ? matches.slice(0, MAX_SERVER_RESULTS) : matches;

  // স্কেলেটন আসল পেজের মতোই: কোয়েরি/ক্যাটাগরি-মিল/ম্যাচ-সংখ্যা সার্ভারে জানা, তাই সঠিক অংশগুলোই আঁকা হয়
  const cats = initialCategories && initialCategories.length ? initialCategories : DEFAULT_CATEGORIES;
  const chipWidths = matchCategories(cats, query, 8).map((c) => chipWidthFor(c.name));

  return (
    <Suspense
      fallback={
        <SearchSkeleton
          hasQuery={query.length > 0}
          chipWidths={chipWidths}
          showCount={matches.length > 0 || chipWidths.length > 0}
          cardCount={Math.min(12, matches.length)}
        />
      }
    >
      <SearchClient
        initialQuery={query}
        initialResults={initialResults}
        initialTotal={matches.length}
        initialCategories={initialCategories}
      />
    </Suspense>
  );
}

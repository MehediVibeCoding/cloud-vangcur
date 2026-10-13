'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Footer from '@/app/components/layout/Footer';
import ProductCard from '@/app/components/home/ProductCard';
import { searchProducts, matchCategories } from '@/lib/searchData';
import { fetchProductsByIds } from '@/lib/productData';
import { DEFAULT_CATEGORIES } from '@/lib/categoryData';
import { sanitizeSvgHtml } from '@/lib/sanitize';
import { brandifyCategoryIcon } from '@/lib/categoryData';
import { showToast } from '@/lib/toast';
import { useT } from '@/lib/i18n/useT';
import { RippleLayer, rippleThen } from '@/lib/ripple';
import type { Category, Product } from '@/types';

const PRODS_PER_PAGE = 20;
const PRODS_AUTO_THRESHOLD = 2;
const MAX_SEARCH_LEN = 60;

function SearchHeader({ query, onQueryChange }: { query: string; onQueryChange: (v: string) => void }) {
  const { t, lang } = useT();
  const router = useRouter();
  const [value, setValue] = useState(query);
  const lastLimitToastRef = useRef(0);

  // ইউজার শব্দের শেষে স্পেস টাইপ করলে URL-এর (trim করা) মান যেন সেই স্পেস মুছে না দেয়
  useEffect(() => { setValue((prev) => (prev.trim() === query ? prev : query)); }, [query]);

  const handleBackToHome = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    rippleThen(e, () => {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.replace('/');
      }
    });
  };

  const handleChange = (rawVal: string) => {
    if (rawVal.length >= MAX_SEARCH_LEN) {
      const now = Date.now();
      if (now - lastLimitToastRef.current > 2200) {
        lastLimitToastRef.current = now;
        showToast(
          lang === 'en'
            ? 'Search limit reached (maximum 60 characters)'
            : 'সার্চের সর্বোচ্চ সীমা ৬০ অক্ষরে পৌঁছে গেছে',
          'error'
        );
      }
    }
    const clean = rawVal.replace(/[<>`]/g, '').slice(0, MAX_SEARCH_LEN);
    setValue(clean);
    onQueryChange(clean);
  };

  return (
    <div className="sticky top-[14px] z-[900] mx-2 mb-1.5 mt-[14px] max-[400px]:mx-1.5 sm:mx-3">
      <nav className="navbar-glass relative z-[900] rounded-[35px] border border-white/70 bg-white/80 shadow-sh1 backdrop-blur-[10px]">
        <div className="mx-auto flex h-[62px] max-w-[1300px] items-center gap-2.5 px-3 sm:gap-3 sm:px-5">
          <Link
            href="/"
            onClick={handleBackToHome}
            aria-label={lang === 'en' ? 'Back to Home' : 'ফিরে যান'}
            title={lang === 'en' ? 'Back to Home' : 'ফিরে যান'}
            className="vc-press group relative before:absolute before:content-[''] before:-inset-y-[10px] before:-left-3 before:-right-1 md:before:hidden flex h-11 shrink-0 items-center gap-1.5 min-[420px]:gap-2 rounded-full border border-border-base bg-white/80 pl-2 pr-3 min-[420px]:pr-3.5 backdrop-blur-md hover:border-brand-light hover:bg-brand-bg/40 no-underline max-[400px]:pr-2 max-[400px]:pl-1.5"
          >
            <RippleLayer />
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-light text-white shadow-xs transition-transform duration-brand group-hover:scale-105">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </div>
            <span className="hidden min-[420px]:inline font-body text-[13px] font-extrabold text-ink transition-colors duration-brand group-hover:text-brand-light">
              {lang === 'en' ? 'Back to Home' : 'ফিরে যান'}
            </span>
            <span className="min-[420px]:hidden font-body text-[12px] font-extrabold text-ink transition-colors duration-brand group-hover:text-brand-light">
              {lang === 'en' ? 'Back' : 'ফিরে যান'}
            </span>
          </Link>

          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-brand-light/70" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              maxLength={MAX_SEARCH_LEN}
              value={value}
              placeholder={t('পুনরায় সার্চ করুন...')}
              onChange={(e) => handleChange(e.target.value)}
              autoComplete="off"
              style={{ outline: 'none', WebkitAppearance: 'none' }}
              className={`h-11 w-full rounded-full border border-border-base bg-white text-[14px] font-medium text-ink outline-none focus:outline-none focus:ring-0 focus-visible:outline-none transition-colors duration-200 focus:border-brand-light pl-10 ${value ? 'pr-16' : 'pr-4'}`}
            />
            {value && (
              // 🛠️ ফিক্স: আগে এই বাটনে top-1/2 + -translate-y-1/2 (Tailwind ক্লাস)
              // আর framer-motion-এর whileTap স্কেল — দুটোই একসাথে CSS "transform"
              // প্রপার্টি নিয়ন্ত্রণ করার চেষ্টা করত। ট্যাপ করলে framer-motion নিজের
              // transform (scale) বসিয়ে Tailwind-এর translateY(-50%) মুছে ফেলত,
              // ফলে বাটনটা হঠাৎ অর্ধেক উচ্চতা নিচে "নেমে" যেত। এখন translateY
              // বাদ দিয়ে বাইরের একটা flex-centered wrapper (inset-y-0 + items-center)
              // দিয়ে ভার্টিক্যাল সেন্টারিং করা হচ্ছে, তাই ভেতরের motion.button-এর
              // নিজের transform শুধু স্কেল-অ্যানিমেশনের জন্যই ফাঁকা থাকে — পজিশন
              // আর নড়ে না। পাশাপাশি চোখে-লাগা নীল সার্কেল X বাদ দিয়ে একটা হালকা
              // "মুছুন" টেক্সট-বাটন বসানো হয়েছে, যেটা কম জোরালো/কম বিরক্তিকর লাগবে।
              <div className="absolute inset-y-0 right-2 flex items-center">
                <motion.button
                  type="button"
                  onClick={() => { setValue(''); onQueryChange(''); }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                  aria-label={t('মুছুন')}
                  className="flex h-7 items-center rounded-full px-2.5 font-body text-[11.5px] font-bold text-muted transition-colors duration-brand hover:bg-surface-muted hover:text-brand-light"
                >
                  {t('মুছুন')}
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}

function SearchGlyph() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-bg/50 to-surface-muted text-brand-light/60">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12h15M13 5.5 20 12l-7 6.5" />
    </svg>
  );
}

const brandCtaBtnClass = 'inline-flex items-center gap-2 rounded-full border-none bg-gradient-to-r from-info to-brand-light px-7 py-3 font-body text-sm font-bold text-white no-underline shadow-sh2 transition-colors duration-brand hover:brightness-[1.03]';

function CategoryIcon({ icon }: { icon?: string }) {
  const isSvg = typeof icon === 'string' && icon.trim().startsWith('<svg');
  if (isSvg) {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center vc-cat-icon text-brand-light [&_svg]:!h-5 [&_svg]:!w-5"
        dangerouslySetInnerHTML={{ __html: sanitizeSvgHtml(brandifyCategoryIcon(icon)) }}
      />
    );
  }
  return <span className="text-base leading-none">{icon || '📂'}</span>;
}

function NoQueryState() {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-20 text-center">
      <SearchGlyph />
      <p className="text-[15px] font-bold text-ink">{t('কিছু লিখে সার্চ করুন')}</p>
      <div className="my-1 flex w-full max-w-xs items-center gap-3 text-[12px] text-muted">
        <span className="h-px flex-1 bg-border-base" />
        {t('অথবা')}
        <span className="h-px flex-1 bg-border-base" />
      </div>
      <Link href="/" className={brandCtaBtnClass}>
        {t('ওয়েবসাইটের হোম পেইজে ফিরে যান')} <ArrowRightIcon />
      </Link>
    </div>
  );
}

function ZeroResultsState({ query }: { query: string }) {
  const { t, lang } = useT();
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
      <SearchGlyph />
      <p className="text-[15px] font-bold text-ink">
        {lang === 'en' ? <>No products found for &quot;{query}&quot;</> : <>&quot;{query}&quot; এর জন্য কোনো পণ্য পাওয়া যায়নি</>}
      </p>
      <p className="max-w-sm text-[13px] text-muted">{t('অন্য কোনো নাম দিয়ে উপরের সার্চ বক্সে খুঁজে দেখুন, অথবা নিচের বাটনে ক্লিক করে ওয়েবসাইটের হোম পেইজে ফিরে যান।')}</p>
      <Link href="/" className={`mt-1 ${brandCtaBtnClass}`}>
        {t('ওয়েবসাইটের হোম পেইজে ফিরে যান')} <ArrowRightIcon />
      </Link>
    </div>
  );
}

function EndOfResults() {
  const { t } = useT();
  return (
    <div className="col-span-full flex flex-col items-center gap-3.5 px-4 pb-2 pt-7 text-center">
      <p className="font-body text-[13.5px] font-medium text-muted">{t('আর কোনো প্রোডাক্ট নেই')}</p>
      <Link href="/" className={brandCtaBtnClass}>
        {t('ওয়েবসাইটের হোম পেইজে ফিরে যান')} <ArrowRightIcon />
      </Link>
    </div>
  );
}

function cleanQuery(raw: string): string {
  return raw.replace(/[<>`]/g, '').trim().slice(0, MAX_SEARCH_LEN);
}

// ফলাফলের তালিকা + "আরো লোড" লজিক। `key={query}` দিয়ে বসানো হয়, তাই শুধু সার্চ শব্দ বদলালেই
// এটা নতুন করে শুরু হয় — দাম/স্টকের আপডেট বা ইনডেক্স লোড হওয়ায় তালিকা আর খালি/রিসেট হয় না।
function ResultsList({ results, total }: { results: Product[]; total: number }) {
  const { t } = useT();
  const supabase = useRef(createClient()).current;

  // প্রথম রেন্ডারেই (সার্ভার HTML-এও) প্রথম ব্যাচ থাকে — আগের মতো useEffect/setTimeout-এর অপেক্ষা নেই
  const [renderedCount, setRenderedCount] = useState(() => Math.min(PRODS_PER_PAGE, results.length));
  const [showLoadMoreBtn, setShowLoadMoreBtn] = useState(false);
  const [showSpinner, setShowSpinner] = useState(results.length > PRODS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const batchCountRef = useRef(1);
  const loadMorePausedRef = useRef(false);
  const renderedCountRef = useRef(Math.min(PRODS_PER_PAGE, results.length));
  const listRef = useRef<Product[]>(results);

  useEffect(() => { listRef.current = results; }, [results]);

  const appendNextBatch = useCallback(() => {
    const currentList = listRef.current;
    const cur = renderedCountRef.current;
    if (cur >= currentList.length) return;
    const nextCount = Math.min(cur + PRODS_PER_PAGE, currentList.length);
    batchCountRef.current += 1;
    renderedCountRef.current = nextCount;
    setRenderedCount(nextCount);

    if (nextCount >= currentList.length) {
      loadMorePausedRef.current = false;
      setShowLoadMoreBtn(false);
      setShowSpinner(false);
    } else if (batchCountRef.current % PRODS_AUTO_THRESHOLD === 0) {
      loadMorePausedRef.current = true;
      setShowLoadMoreBtn(true);
      setShowSpinner(false);
    } else {
      loadMorePausedRef.current = false;
      setShowLoadMoreBtn(false);
      setShowSpinner(true);
    }
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && renderedCountRef.current < listRef.current.length && !loadMorePausedRef.current) {
        appendNextBatch();
      }
    }, { rootMargin: '300px' });
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [appendNextBatch]);

  // সার্ভার থেকে প্রথমে সীমিত ম্যাচ এলে, পরে পুরো ইনডেক্স লোড হয়ে তালিকা বড় হলে —
  // আমরা যদি আগের তালিকার শেষে এসে অপেক্ষা করতে থাকি, তাহলে পরের ব্যাচ চালু করি
  const prevLenRef = useRef(results.length);
  useEffect(() => {
    const prevLen = prevLenRef.current;
    prevLenRef.current = results.length;
    if (results.length <= prevLen) return;
    if (renderedCountRef.current >= prevLen && !loadMorePausedRef.current) {
      const el = sentinelRef.current;
      const nearView = !!el && el.getBoundingClientRect().top < window.innerHeight + 300;
      if (nearView) appendNextBatch();
      else setShowSpinner(false);
    }
  }, [results.length, appendNextBatch]);

  const handleLoadMoreClick = () => {
    setShowLoadMoreBtn(false);
    batchCountRef.current = 0;
    loadMorePausedRef.current = false;
    appendNextBatch();
  };

  // 🔒 দাম/স্টক আপডেট (প্রতি ৩০ সেকেন্ডে, ট্যাব দৃশ্যমান থাকলে) — শুধু যে প্রোডাক্টগুলো
  // এখন স্ক্রিনে আছে সেগুলোর জন্য। ফলাফল আলাদা `fresh` ম্যাপে থাকে; ব্যর্থ হলে বা ফাঁকা
  // এলে কিছুই মোছা হয় না (আগে ব্যর্থ হলে পুরো তালিকা মুছে "০টি পণ্য" হয়ে যেত)।
  const [fresh, setFresh] = useState<Map<string, Product>>(() => new Map());
  const visibleIdsRef = useRef<(number | string)[]>([]);
  visibleIdsRef.current = results.slice(0, renderedCount).map((p) => p.id);

  useEffect(() => {
    let cancelled = false;
    const POLL_MS = 30000;
    const MAX_POLL_IDS = 60;

    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const ids = visibleIdsRef.current.slice(0, MAX_POLL_IDS);
      if (!ids.length) return;
      const rows = await fetchProductsByIds(supabase, ids);
      if (cancelled || !rows.length) return;
      setFresh((prev) => {
        const next = new Map(prev);
        for (const r of rows) next.set(String(r.id), r);
        return next;
      });
    };

    const timer = setInterval(tick, POLL_MS);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [supabase]);

  const visibleItems = useMemo(
    () => results.slice(0, renderedCount).map((p) => {
      const f = fresh.get(String(p.id));
      return f ? { ...p, ...f } : p;
    }),
    [results, renderedCount, fresh],
  );

  const pending = results.length < total; // বাকি ম্যাচ ইনডেক্স থেকে আসছে
  const isDone = renderedCount >= results.length && !pending;
  const spinnerOn = showSpinner || (pending && renderedCount >= results.length);

  return (
    <>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {visibleItems.map((p, i) => (
          <ProductCard key={p.id} prod={p} isFirst={i === 0} />
        ))}
        {isDone && !spinnerOn && !showLoadMoreBtn && <EndOfResults />}
      </div>
      <div className="mt-2.5 flex h-[60px] items-center justify-center" ref={sentinelRef}>
        {spinnerOn && (
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            {t('লোড হচ্ছে...')}
          </div>
        )}
        {showLoadMoreBtn && (
          <button
            onClick={handleLoadMoreClick}
            className="inline-flex items-center gap-2 rounded-full border-none bg-gradient-to-r from-info to-brand-light px-8 py-[13px] font-body text-sm font-bold text-white shadow-sh2 transition-colors duration-brand hover:brightness-[1.03]"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
            {t('আরো প্রোডাক্ট দেখুন')}
          </button>
        )}
      </div>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-[18px] bg-white p-1 shadow-[0_4px_14px_rgba(0,88,199,.12)]">
          <div className="aspect-[0.57] animate-pulse rounded-[14px] bg-brand-bg/30" />
        </div>
      ))}
    </div>
  );
}

interface SearchClientProps {
  initialQuery: string;
  initialResults: Product[];
  initialTotal: number;
  initialCategories?: Category[];
}

export default function SearchClient({ initialQuery, initialResults, initialTotal, initialCategories }: SearchClientProps) {
  const { t, lang } = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = cleanQuery(searchParams.get('q') || '');

  const cats = initialCategories && initialCategories.length ? initialCategories : DEFAULT_CATEGORIES;

  // সার্ভার শুধু প্রথম সার্চের মিলে যাওয়া প্রোডাক্ট পাঠায়। ব্যবহারকারী এই পেজেই নতুন শব্দ লিখলে
  // (অথবা ম্যাচ অনেক হলে) তখনই — একবার — হালকা ইনডেক্স আনা হয় (/api/search-index, সার্ভারের
  // একই ক্যাশ), আর পরের সব সার্চ ব্রাউজারেই চলে।
  const truncated = initialTotal > initialResults.length;
  const needIndex = query !== initialQuery || truncated;
  const [index, setIndex] = useState<Product[] | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!needIndex || index || fetchingRef.current) return;
    fetchingRef.current = true;
    fetch('/api/search-index')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { products?: Product[] } | null) => {
        const list = d && Array.isArray(d.products) && d.products.length ? d.products : initialResults;
        setIndex(list);
      })
      .catch(() => setIndex(initialResults))
      .finally(() => { fetchingRef.current = false; });
  }, [needIndex, index, initialResults]);

  // null = এখনো লোড হচ্ছে
  const results = useMemo<Product[] | null>(() => {
    if (!query) return [];
    if (index) return searchProducts(index, query);
    if (query === initialQuery) return initialResults;
    return null;
  }, [query, index, initialQuery, initialResults]);

  // URL আপডেট শুধু ব্রাউজারের history-তে — Next.js-এর সার্ভার-রিকোয়েস্ট ছাড়া (router.replace
  // প্রতিবার সার্ভার থেকে পুরো পেজ আবার আনত)। useSearchParams এটা নিজে ধরে নেয়।
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleQueryChange = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const clean = cleanQuery(value);
      const url = clean ? `/search?q=${encodeURIComponent(clean)}` : '/search';
      window.history.replaceState(window.history.state, '', url);
    }, 300);
  }, []);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const goToHomeCategory = useCallback((catId: string) => {
    // হোমে গিয়ে ক্যাটাগরির পণ্য দেখানোর সময় হিরো কার্ডের এন্ট্রি অ্যানিমেশন যেন না চলে —
    // <html>-এ সাময়িক একটা অ্যাট্রিবিউট বসাই (HeroSlider-এর CSS এটা দেখে অ্যানিমেশন বন্ধ রাখে),
    // কয়েক সেকেন্ড পর সরিয়ে দিই, যাতে পরের স্বাভাবিক হোম-ভিজিটে অ্যানিমেশন আগের মতো চলে।
    const root = document.documentElement;
    root.setAttribute('data-skip-home-anim', '');
    window.setTimeout(() => root.removeAttribute('data-skip-home-anim'), 3000);
    router.push(`/?cat=${encodeURIComponent(catId)}`);
  }, [router]);

  const matchedCats = useMemo(() => matchCategories(cats, query, 8), [cats, query]);
  const hasQuery = query.length > 0;
  const count = results === null ? null : (index || query !== initialQuery ? results.length : initialTotal);
  const total = count ?? 0;
  const showCategorySection = matchedCats.length > 0;
  const showCountLine = count !== null && (matchedCats.length > 0 || count > 0);

  return (
    <>
      <SearchHeader query={query} onQueryChange={handleQueryChange} />

      <div className="mx-auto mb-11 mt-3 min-h-[40vh] max-w-[1300px] px-5">
        {!hasQuery ? (
          <NoQueryState />
        ) : (
          <>
            {showCategorySection && (
              <div className="mb-4">
                <h2 className="mb-2.5 text-[13px] font-bold text-ink">{t('ক্যাটাগরি')}</h2>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {matchedCats.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => goToHomeCategory(c.id)}
                      className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border-base bg-white px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors duration-brand hover:border-brand-light hover:bg-brand-bg hover:text-brand-light"
                    >
                      <CategoryIcon icon={c.icon} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showCountLine && (
              <p className="mb-4 text-[13px] text-muted">{lang === 'en' ? `${count} products found` : `${count}টি পণ্য পাওয়া গেছে`}</p>
            )}

            {results === null ? (
              <ResultsSkeleton />
            ) : results.length === 0 ? (
              <ZeroResultsState query={query} />
            ) : (
              <ResultsList key={query} results={results} total={total} />
            )}
          </>
        )}
      </div>

      <Footer />
    </>
  );
}

'use client';

import Link from 'next/link';
import { scrollToProductsSection } from '@/lib/scrollToProducts';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CATEGORY_FILTER_EVENT, FOCUS_PRODUCT_EVENT, makeCatSlug, DEFAULT_CATEGORIES,
} from '@/lib/categoryData';
import { PRODUCTS_PAGE_SIZE, PRODUCTS_LOAD_MORE_BATCHES } from '@/lib/productData';
import { fetchProductsPageAction } from '@/app/actions/products';
import { useT } from '@/lib/i18n/useT';
import type { Category, Product } from '@/types';
import ProductCard from './ProductCard';

function EmptyBoxIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 8.5v7L12 20l9-4.5v-7" />
      <path d="M12 13v7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12h15M13 5.5 20 12l-7 6.5" />
    </svg>
  );
}

// "সকল প্রোডাক্ট দেখুন" CTA — ফ্ল্যাট, পরিচ্ছন্ন পিল: কোনো শ্যাডো/থ্রিডি/গ্লো নেই। হালকা সাদা→স্কাই-ব্লু গ্রেডিয়েন্ট,
// ১.৫px ব্র্যান্ড-ব্লু বর্ডার, ব্র্যান্ড-ব্লু লেখা আর সলিড #44A7FC তীর-চিপ। হোভারে শুধু রং গাঢ় হয়, তীর সামান্য ডানে যায়।
const viewAllBtnClass =
  'group relative inline-flex h-12 cursor-pointer items-center gap-3 overflow-hidden whitespace-nowrap rounded-full border-[1.5px] border-brand-light/55 bg-gradient-to-r from-white via-white to-brand-bg/70 py-1.5 pl-6 pr-1.5 font-body text-[15px] font-bold tracking-[0.1px] text-[#0284C7] no-underline transition-[background-color,border-color,color] duration-300 ease-brand hover:border-brand-light hover:from-brand-bg/50 hover:via-brand-bg/60 hover:to-brand-bg active:scale-[0.98]';

function ViewAllLabel({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span className="relative z-[1]">{children}</span>
      <span className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-white transition-transform duration-300 ease-brand group-hover:translate-x-0.5">
        <ArrowRightIcon />
      </span>
    </>
  );
}

interface ProductGridProps {
  initialProducts: Product[];
  initialCategory?: string;
  initialHasMore?: boolean;
  categoryName?: string;
}

// 🔒 ফিক্স (audit P1-16): আগে এই কম্পোনেন্ট পুরো ক্যাটালগ props হিসেবে পেত আর
// ক্যাটাগরি বদল/স্ক্রল — দুটোই client-এ থাকা সেই একই পুরো অ্যারে থেকে
// filter/slice করত। এখন শুধু বর্তমান পেজের প্রোডাক্টগুলোই state-এ থাকে —
// ক্যাটাগরি বদলালে বা স্ক্রল করলে সার্ভার থেকে নতুন পেজ আনা হয়
// (fetchProductsPageAction)। প্রোডাক্ট কয়েকশো হয়ে গেলেও হোমপেজ হালকা থাকবে।
export default function ProductGrid({ initialProducts, initialCategory, initialHasMore, categoryName }: ProductGridProps) {
  const { t, lang } = useT();
  const searchParams = useSearchParams();
  const startCat = initialCategory || 'all';

  const [items, setItems] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState<number>(initialProducts.length);
  const [hasMore, setHasMore] = useState<boolean>(!!initialHasMore);
  const [switching, setSwitching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCat, setActiveCat] = useState(startCat);
  const [cats] = useState<Category[]>(DEFAULT_CATEGORIES);

  const prevCatRef = useRef(startCat);
  const reqIdRef = useRef(0);
  const activeCatRef = useRef(startCat);
  const offsetRef = useRef(initialProducts.length);
  const hasMoreRef = useRef(!!initialHasMore);
  const loadingRef = useRef(false);
  const batchIdxRef = useRef(0);
  const catFetchInFlightRef = useRef(false);
  const pendingFocusRef = useRef<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  useEffect(() => { activeCatRef.current = activeCat; }, [activeCat]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  // ক্যাটাগরি বদলালে নতুন করে প্রথম পেজ আনা হয় — প্রথম মাউন্টে (SSR-এর
  // initialCategory-এর সাথে মিলে গেলে) এই effect কিছু করে না, SSR ডেটাই থাকে
  useEffect(() => {
    if (prevCatRef.current === activeCat) return;
    prevCatRef.current = activeCat;

    const myReqId = ++reqIdRef.current;
    batchIdxRef.current = 0;
    setSwitching(true);
    setLoadingMore(false);
    catFetchInFlightRef.current = true;

    fetchProductsPageAction(activeCat, 0, PRODUCTS_PAGE_SIZE)
      .then((res) => {
        if (reqIdRef.current !== myReqId) return; // ইতিমধ্যে আরেকবার ক্যাটাগরি বদলেছে — পুরনো রেসপন্স উপেক্ষা
        catFetchInFlightRef.current = false;
        setItems(res.products);
        setTotal(res.total);
        setHasMore(res.hasMore);
        offsetRef.current = res.products.length;
        hasMoreRef.current = res.hasMore;
        setSwitching(false);
      })
      .catch(() => {
        if (reqIdRef.current !== myReqId) return;
        catFetchInFlightRef.current = false;
        setItems([]);
        setTotal(0);
        setHasMore(false);
        offsetRef.current = 0;
        hasMoreRef.current = false;
        setSwitching(false);
      });
  }, [activeCat]);

  const appendNextBatch = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);

    const myReqId = reqIdRef.current;
    const cat = activeCatRef.current;
    const offset = offsetRef.current;
    const batchSize = PRODUCTS_LOAD_MORE_BATCHES[Math.min(batchIdxRef.current, PRODUCTS_LOAD_MORE_BATCHES.length - 1)];

    fetchProductsPageAction(cat, offset, batchSize)
      .then((res) => {
        if (reqIdRef.current !== myReqId) return; // এর মধ্যে ক্যাটাগরি বদলে গেছে — বাতিল
        batchIdxRef.current += 1;
        offsetRef.current = offset + res.products.length;
        hasMoreRef.current = res.hasMore;
        setItems((prev) => [...prev, ...res.products]);
        setTotal(res.total);
        setHasMore(res.hasMore);
        loadingRef.current = false;
        setLoadingMore(false);
      })
      .catch(() => {
        if (reqIdRef.current !== myReqId) return;
        loadingRef.current = false;
        setLoadingMore(false);
      });
  }, []);

  // 🔒 ফিক্স (পারফরম্যান্স অপটিমাইজেশন, ২০২৬-১০): আগে এখানে IntersectionObserver
  // দিয়ে sentinel-এ পৌঁছালেই পরের ব্যাচ অটো-লোড হতো (ইনফিনিটি স্ক্রল) — প্রোডাক্ট
  // কয়েকশো হয়ে গেলে `items` অসীম বড় হয়ে যেত আর মোবাইলে স্ক্রল করার সময় FPS কমে
  // যেত। হোমপেজ এখন সবসময় প্রথম PRODUCTS_PAGE_SIZE-টুকুই দেখায় — বাকিটা দেখতে হলে
  // নিচের "সব প্রোডাক্ট দেখুন" বাটন দিয়ে আলাদা, হালকা /products পেজে যেতে হয়
  // (সেখানে নাম্বার পেজিনেশন + virtualization আছে)। appendNextBatch() ফাংশনটা এখনো
  // আছে শুধু "নির্দিষ্ট প্রোডাক্টে ফোকাস" ডিপ-লিংক ফিচারের জন্য (নিচের effect দেখুন)।

  useEffect(() => {
    const onFilter = (e: Event) => {
      const detail = (e as CustomEvent<{ catId?: string }>).detail;
      setActiveCat(detail?.catId || 'all');
    };
    window.addEventListener(CATEGORY_FILTER_EVENT, onFilter);
    return () => window.removeEventListener(CATEGORY_FILTER_EVENT, onFilter);
  }, []);

  // হিরো কার্ড (লিংক ধরন: প্রোডাক্ট গ্রিডে) — ক্যাটাগরি ফিল্টার হওয়ার পর ওই প্রোডাক্ট কার্ডে স্ক্রল ও হাইলাইট
  useEffect(() => {
    const onFocus = (e: Event) => {
      const detail = (e as CustomEvent<{ productId?: string }>).detail;
      if (!detail?.productId) return;
      pendingFocusRef.current = String(detail.productId);
      setFocusTick((n) => n + 1);
    };
    window.addEventListener(FOCUS_PRODUCT_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_PRODUCT_EVENT, onFocus);
  }, []);

  useEffect(() => {
    const pid = pendingFocusRef.current;
    if (!pid || switching || catFetchInFlightRef.current) return;
    const el = document.querySelector<HTMLElement>(`[data-pid="${pid}"]`);
    if (el) {
      pendingFocusRef.current = null;
      const t = setTimeout(() => {
        const targetY = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + el.offsetHeight / 2;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
        const cls = ['ring-4', 'ring-brand-light/60'];
        el.classList.add(...cls);
        setTimeout(() => el.classList.remove(...cls), 2200);
      }, 120);
      void t;
      return undefined;
    }
    if (hasMore) {
      appendNextBatch(); // প্রোডাক্টটা এখনো লোড হয়নি — পরের ব্যাচ আনা হচ্ছে
    } else {
      pendingFocusRef.current = null; // গ্রিডে নেই — গ্রিডের শুরুতে নিয়ে যাওয়া হচ্ছে
      scrollToProductsSection();
    }
  }, [items, switching, hasMore, focusTick, appendNextBatch]);

  useEffect(() => {
    const catFromUrl = searchParams.get('cat');
    if (!catFromUrl) return;
    setActiveCat(catFromUrl);
    try {
      const cosmeticUrl = catFromUrl === 'all' ? '/' : `/category/${makeCatSlug(catFromUrl)}`;
      window.history.replaceState({ vcStack: [], homeCurrent: true, vcCat: catFromUrl }, '', cosmeticUrl);
    } catch {
      // ignore
    }
    scrollToProductsSection();
  }, [searchParams]);

  const handleShowAll = () => {
    setActiveCat('all');
    window.dispatchEvent(new CustomEvent(CATEGORY_FILTER_EVENT, { detail: { catId: 'all' } }));
    try { window.history.replaceState({ vcStack: [], homeCurrent: true }, '', '/'); } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🆕 (পারফরম্যান্স অপটিমাইজেশন, ২০২৬-১০): ইনফিনিটি স্ক্রলের বদলে — হোমপেজে সবসময়
  // প্রথম PRODUCTS_PAGE_SIZE-টুকু দেখানো হয়, আরও থাকলে (hasMore) /products পেজের
  // লিংক দেখানো হয় (সব প্রোডাক্ট হলে /products, নির্দিষ্ট ক্যাটাগরি হলে /products?cat=..)।
  const showViewAllCta = !switching && items.length > 0 && hasMore;
  const viewAllHref = activeCat === 'all' ? '/products' : `/products?cat=${encodeURIComponent(activeCat)}`;
  // ক্যাটাগরিতে এখানেই (২৪-এর মধ্যে) সব প্রোডাক্ট দেখানো শেষ — সাইটের বাকি ক্যাটাগরিতে
  // ফিরে যাওয়ার সাজেশন
  const showCategoryEndBtn = !switching && !hasMore && activeCat !== 'all' && items.length > 0;
  const activeCategoryName = categoryName || cats.find((c) => c.id === activeCat)?.name;

  return (
    <div className="mx-auto mb-11 min-h-[400px] max-w-[1300px] px-5 scroll-mt-20 sm:scroll-mt-24" id="prodSec">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="border-l-[3px] border-brand-light pl-3 text-xl font-bold">
          {activeCategoryName && activeCat !== 'all' ? (
            lang === 'en' ? (
              <>{activeCategoryName} <span className="text-brand-light">Products</span></>
            ) : (
              <>{activeCategoryName} <span className="text-brand-light">সমূহ</span></>
            )
          ) : (
            <>{t('সকল')} <span className="text-brand-light">{t('প্রোডাক্ট')}</span></>
          )}
        </h2>
        <span className="text-[13px] text-muted">{lang === 'en' ? `${total} Products` : `${total}টি প্রোডাক্ট`}</span>
      </div>

      {items.length === 0 && !switching ? (
        <div className="col-span-full flex flex-col items-center gap-3.5 px-5 py-[60px] text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-bg/50 to-surface-muted text-brand-light/60">
            <EmptyBoxIcon />
          </div>
          <p className="text-sm text-muted">{t('এই ক্যাটাগরিতে এখন কোনো পণ্য নেই')}</p>
          <button onClick={handleShowAll} className={viewAllBtnClass}>
            <ViewAllLabel>{t('সব পণ্য দেখুন')}</ViewAllLabel>
          </button>
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-3.5 transition-brand duration-brand sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 ${switching ? 'opacity-40' : 'opacity-100'}`}>
          {items.map((p, i) => (
            <ProductCard key={`${activeCat}-${p.id}`} prod={p} isFirst={i === 0} index={i} />
          ))}
          {showCategoryEndBtn && (
            <div className="col-span-full flex flex-col items-center gap-3.5 px-4 pb-2 pt-7 text-center">
              <p className="font-body text-[13.5px] font-medium text-muted">
                {t('এই ক্যাটাগরিতে আর কোনো প্রোডাক্ট নেই')}
              </p>
              <button onClick={handleShowAll} className={viewAllBtnClass}>
                <ViewAllLabel>{t('ওয়েবসাইটের সকল প্রোডাক্ট দেখুন')}</ViewAllLabel>
              </button>
            </div>
          )}
        </div>
      )}

      {showViewAllCta && (
        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <Link href={viewAllHref} className={viewAllBtnClass}>
            <ViewAllLabel>
              {activeCat === 'all' ? t('সকল প্রোডাক্ট দেখুন') : t('এই ক্যাটাগরির সকল প্রোডাক্ট দেখুন')}
            </ViewAllLabel>
          </Link>
        </div>
      )}

      {loadingMore && (
        <div className="mt-2.5 flex items-center justify-center gap-2 text-[13px] text-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-brand-light">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          {t('লোড হচ্ছে...')}
        </div>
      )}
    </div>
  );
}

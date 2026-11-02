'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navbar from '@/app/components/layout/Navbar';
import Footer from '@/app/components/layout/Footer';
import VirtualizedProductGrid from '@/app/components/product/VirtualizedProductGrid';
import { useCartStore, cartCount } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useAuthStore } from '@/lib/store/authStore';
import { OPEN_CART_EVENT, OPEN_WISHLIST_EVENT, OPEN_TRACK_ORDER_EVENT } from '@/lib/uiEvents';
import { useT } from '@/lib/i18n/useT';
import type { Product } from '@/types';
import type { ProductsListPaging } from '@/lib/productData';

const LoginModal = dynamic(() => import('@/app/components/auth/LoginModal'));

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function EmptyBoxIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 8.5v7L12 20l9-4.5v-7" />
      <path d="M12 13v7" />
    </svg>
  );
}

function buildHref(page: number, activeCat: string): string {
  const qs = new URLSearchParams();
  if (activeCat !== 'all') qs.set('cat', activeCat);
  if (page > 1) qs.set('page', String(page));
  const q = qs.toString();
  return `/products${q ? `?${q}` : ''}`;
}

// পেজ নাম্বার তালিকা — অনেক পেজ হলে (…) দিয়ে সংক্ষিপ্ত করে, সবসময় প্রথম/শেষ/বর্তমানের
// আশেপাশে কয়েকটা দেখায় (ক্লাসিক পেজিনেশন UX)
function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | 'ellipsis')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('ellipsis');
    out.push(p);
  });
  return out;
}

interface ProductsPageClientProps {
  products: Product[];
  paging: ProductsListPaging;
  activeCat: string;
  categoryName?: string;
}

export default function ProductsPageClient({ products, paging, activeCat, categoryName }: ProductsPageClientProps) {
  const { t, lang } = useT();
  const cartQty = useCartStore((s) => cartCount(s.cart));
  const wishQty = useWishlistStore((s) => s.wishlist.length);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loginOpen, setLoginOpen] = useState(false);

  const { page, totalPages } = paging;
  const pageNumbers = getPageNumbers(page, totalPages);
  const heading = categoryName
    ? (lang === 'en' ? `${categoryName} Products` : <>{categoryName} <span className="text-brand-light">সমূহ</span></>)
    : (lang === 'en' ? 'All Products' : <>{t('সকল')} <span className="text-brand-light">{t('প্রোডাক্ট')}</span></>);

  const pagerBtnClass = 'flex h-9 min-w-9 items-center justify-center rounded-full border border-border-base/70 bg-white/80 px-2.5 font-body text-[13px] font-bold text-ink shadow-2xs transition-colors duration-150 hover:border-brand-light hover:bg-brand-bg/40 no-underline';
  const pagerBtnDisabledClass = 'flex h-9 min-w-9 items-center justify-center rounded-full border border-border-base/40 bg-surface-muted px-2.5 text-muted/50 cursor-not-allowed';
  const pagerBtnActiveClass = 'flex h-9 min-w-9 items-center justify-center rounded-full bg-gradient-to-r from-info to-brand-light px-2.5 font-body text-[13px] font-bold text-white shadow-sh1 no-underline';

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-brand-bg/35 via-[#DCEBFD]/45 to-white flex flex-col justify-between">
      <div className="relative z-10">
        <Navbar
          showHomeButton
          cartCount={cartQty}
          wishCount={wishQty}
          currentUser={currentUser}
          onCartClick={() => window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT))}
          onWishClick={() => window.dispatchEvent(new CustomEvent(OPEN_WISHLIST_EVENT))}
          onTrackClick={() => window.dispatchEvent(new CustomEvent(OPEN_TRACK_ORDER_EVENT))}
          onLoginClick={() => setLoginOpen(true)}
        />

        <main className="mx-auto mb-11 mt-4 max-w-[1300px] px-5">
          <h1 className="mb-5 border-l-[3px] border-brand-light pl-3 text-xl font-bold">
            {heading}
          </h1>

          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-3.5 px-5 py-[60px] text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-bg/50 to-surface-muted text-brand-light/60">
                <EmptyBoxIcon />
              </div>
              <p className="text-sm text-muted">{t('এই ক্যাটাগরিতে এখন কোনো পণ্য নেই')}</p>
              <Link prefetch={false}
                href="/"
                className="inline-flex items-center gap-2 rounded-full border-none bg-gradient-to-r from-info to-brand-light px-7 py-3 font-body text-sm font-bold text-white shadow-sh2 transition-brand duration-brand hover:brightness-[1.03] no-underline"
              >
                {lang === 'en' ? 'Back to Home' : 'হোমে ফিরে যান'}
              </Link>
            </div>
          ) : (
            <>
              <VirtualizedProductGrid products={products} />

              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-9 flex flex-wrap items-center justify-center gap-1.5">
                  {page > 1 ? (
                    <Link prefetch={false} href={buildHref(page - 1, activeCat)} className={pagerBtnClass} aria-label={lang === 'en' ? 'Previous page' : 'আগের পেজ'}>
                      <ChevronLeftIcon />
                    </Link>
                  ) : (
                    <span className={pagerBtnDisabledClass}><ChevronLeftIcon /></span>
                  )}

                  {pageNumbers.map((p, i) =>
                    p === 'ellipsis' ? (
                      <span key={`e${i}`} className="flex h-9 min-w-9 items-center justify-center text-[13px] text-muted">…</span>
                    ) : p === page ? (
                      <span key={p} className={pagerBtnActiveClass} aria-current="page">{p}</span>
                    ) : (
                      <Link prefetch={false} key={p} href={buildHref(p, activeCat)} className={pagerBtnClass}>{p}</Link>
                    )
                  )}

                  {page < totalPages ? (
                    <Link prefetch={false} href={buildHref(page + 1, activeCat)} className={pagerBtnClass} aria-label={lang === 'en' ? 'Next page' : 'পরের পেজ'}>
                      <ChevronRightIcon />
                    </Link>
                  ) : (
                    <span className={pagerBtnDisabledClass}><ChevronRightIcon /></span>
                  )}
                </nav>
              )}
            </>
          )}
        </main>
      </div>

      <Footer />

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

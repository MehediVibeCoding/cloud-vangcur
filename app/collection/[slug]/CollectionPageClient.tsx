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

const LoginModal = dynamic(() => import('@/app/components/auth/LoginModal'));

function EmptyBoxIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 8.5v7L12 20l9-4.5v-7" />
      <path d="M12 13v7" />
    </svg>
  );
}

interface Props {
  title: string;
  titleEn: string;
  products: Product[];
}

/**
 * কালেকশন পেজ (/collection/<id>) — শুধু ওই কালেকশনে রাখা প্রোডাক্টগুলো, ক্যাটাগরির মতো আলাদা
 * সিস্টেম। লেআউট /products পেজের সাথে এক: একই নেভবার, প্রোডাক্ট গ্রিড ও ফুটার।
 */
export default function CollectionPageClient({ title, titleEn, products }: Props) {
  const { lang } = useT();
  const en = lang === 'en';
  const name = en && titleEn ? titleEn : title;

  const cartQty = useCartStore((s) => cartCount(s.cart));
  const wishQty = useWishlistStore((s) => s.wishlist.length);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-gradient-to-b from-brand-bg/35 via-[#DCEBFD]/45 to-white">
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
          <h1 className="mb-5 border-l-[3px] border-brand-light pl-3 font-body text-xl font-bold text-ink">
            {name}
          </h1>

          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-3.5 px-5 py-[60px] text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-bg/50 to-surface-muted text-brand-light/60">
                <EmptyBoxIcon />
              </div>
              <p className="text-sm text-muted">{en ? 'No products in this collection yet' : 'এই কালেকশনে এখন কোনো পণ্য নেই'}</p>
              <Link prefetch={false}
                href="/"
                className="inline-flex items-center gap-2 rounded-full border-none bg-gradient-to-r from-info to-brand-light px-7 py-3 font-body text-sm font-bold text-white no-underline shadow-sh2 transition-brand duration-brand hover:brightness-[1.03]"
              >
                {en ? 'Back to Home' : 'হোমে ফিরে যান'}
              </Link>
            </div>
          ) : (
            <VirtualizedProductGrid products={products} />
          )}
        </main>
      </div>

      <Footer />

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

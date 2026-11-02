'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/app/components/layout/Navbar';
import Footer from '@/app/components/layout/Footer';
import { useCartStore, cartCount } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useAuthStore } from '@/lib/store/authStore';
import {
  OPEN_CART_EVENT, OPEN_WISHLIST_EVENT, OPEN_TRACK_ORDER_EVENT,
} from '@/lib/uiEvents';

const LoginModal = dynamic(() => import('@/app/components/auth/LoginModal'));

function DesktopSideDecor() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden lg:block" aria-hidden="true">
      <div className="absolute left-[6%] top-[14%] text-brand-light/[0.14] -rotate-12">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <div className="absolute right-[6%] top-[18%] text-brand-light/[0.14] rotate-12">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="7" y="2.5" width="10" height="15" rx="3" />
          <path d="M10 5.5h4" />
          <circle cx="12" cy="20" r="1.6" />
        </svg>
      </div>
      <div className="absolute left-[5%] bottom-[24%] text-brand-light/[0.14] rotate-6">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 14.5a8 8 0 0 1 16 0" />
          <rect x="2.7" y="14.5" width="4.3" height="7" rx="1.6" />
          <rect x="17" y="14.5" width="4.3" height="7" rx="1.6" />
        </svg>
      </div>
      <div className="absolute right-[5%] bottom-[22%] text-brand-light/[0.14] -rotate-6">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>
    </div>
  );
}

export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  const cartQty = useCartStore((s) => cartCount(s.cart));
  const wishQty = useWishlistStore((s) => s.wishlist.length);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-brand-bg/35 via-[#DCEBFD]/45 to-white flex flex-col justify-between">
      <DesktopSideDecor />

      <div className="relative z-10">
        <Navbar
          sticky={false}
          cartCount={cartQty}
          wishCount={wishQty}
          currentUser={currentUser}
          onCartClick={() => window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT))}
          onWishClick={() => window.dispatchEvent(new CustomEvent(OPEN_WISHLIST_EVENT))}
          onTrackClick={() => window.dispatchEvent(new CustomEvent(OPEN_TRACK_ORDER_EVENT))}
          onLoginClick={() => setLoginOpen(true)}
        />

        <main className="mx-auto w-full max-w-[840px] px-4 sm:px-6 pb-16 pt-3.5 sm:pt-5">
          {children}
        </main>
      </div>

      <Footer />

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

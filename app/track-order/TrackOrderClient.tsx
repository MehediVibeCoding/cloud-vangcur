'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/app/components/layout/Navbar';
import Footer from '@/app/components/layout/Footer';
import { fetchFullOrder, readPendingOrder, readLatestGuestOrder } from '@/lib/orderStatus';
import { mapSupabaseOrderRow } from '@/lib/orderMapping';
import { useCartStore, cartCount } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useAuthStore } from '@/lib/store/authStore';
import { OPEN_CART_EVENT, OPEN_WISHLIST_EVENT } from '@/lib/uiEvents';
import { useT } from '@/lib/i18n/useT';
import OrderCard from '@/app/components/orders/OrderCard';
import SkeletonTransition from '@/app/components/ui/SkeletonTransition';
import { OrderListSkeleton } from '@/app/components/ui/Skeletons';
import type { Order } from '@/types';

const LoginModal = dynamic(() => import('@/app/components/auth/LoginModal'));

function ClearTrackSvgIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ReceiptEmptySvgIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

function SparklesCrownSvgIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-light">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

export default function TrackOrderClient() {
  const { t, lang } = useT();
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const cartQty = useCartStore((s) => cartCount(s.cart));
  const wishQty = useWishlistStore((s) => s.wishlist.length);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loginOpen, setLoginOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.replace('/account/orders');
      return;
    }
    setLoading(true);
    setNotFound(false);
    setOrders([]);

    const guestList: { id?: string; orderNum?: string; phone?: string }[] = (() => {
      try {
        const list = JSON.parse(localStorage.getItem('vc_guest_orders') || '[]');
        if (Array.isArray(list) && list.length > 0) return list;
      } catch {
        // ignore
      }
      const pending = readPendingOrder();
      if (pending && pending.phone) return [pending];
      const latest = readLatestGuestOrder();
      if (latest && latest.phone) return [latest];
      return [];
    })();

    if (guestList.length === 0) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    (async () => {
      const validGuests = guestList.filter((g) => g.id && g.phone);
      const results = await Promise.allSettled(
        validGuests.map((g) => fetchFullOrder(supabase, String(g.id), g.phone!))
      );

      const fetched: Order[] = [];
      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          const mapped = mapSupabaseOrderRow(res.value as Record<string, unknown>);
          // 🚫 বাতিল/রিজেক্টেড অর্ডার ট্র্যাকিং লিস্টে দেখানো হয় না — এডমিন
          // থেকে কনফার্ম করা চলমান অর্ডারই শুধু গ্রাহক ট্র্যাক করতে পারবেন।
          if (mapped.status !== 'cancelled' && mapped.status !== 'rejected') {
            fetched.push(mapped);
          }
        }
      });

      if (fetched.length > 0) {
        setOrders(fetched);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [currentUser, router, supabase]);

  const handleOpenLogin = () => {
    setLoginOpen(true);
  };

  if (currentUser) return null;

  return (
    <>
      <Navbar
        showHomeButton
        sticky={false}
        cartCount={cartQty}
        wishCount={wishQty}
        currentUser={currentUser}
        onCartClick={() => window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT))}
        onWishClick={() => window.dispatchEvent(new CustomEvent(OPEN_WISHLIST_EVENT))}
        onLoginClick={() => setLoginOpen(true)}
      />

      <div className="mx-auto w-full max-w-[520px] px-5 pb-16 pt-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
            <ClearTrackSvgIcon />
          </div>
          <h1 className="font-body text-xl font-extrabold text-ink">
            {lang === 'en' ? 'Track Your Order' : 'অর্ডার ট্র্যাক করুন'}
          </h1>
          <p className="mt-1 font-body text-[13px] text-muted">
            {lang === 'en'
              ? 'Orders placed in this browser will appear here automatically.'
              : 'আপনি এই ব্রাউজারে যে অর্ডার করেছেন সেটি এখানে স্বয়ংক্রিয়ভাবে দেখা যাবে।'}
          </p>
        </div>

        <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-sh2 backdrop-blur-md">
          <SkeletonTransition isReady={!loading} skeleton={<OrderListSkeleton count={2} />}>
            {notFound ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white text-brand-light shadow-sm">
                  <ReceiptEmptySvgIcon className="h-8 w-8 text-brand-light" />
                </div>
                <div className="mb-1.5 font-body text-[16px] font-bold text-ink">
                  {lang === 'en' ? 'No orders placed yet' : 'এখনো কোনো অর্ডার করেননি'}
                </div>
                <p className="mx-auto mb-5 max-w-xs font-body text-[12.5px] leading-relaxed text-muted">
                  {lang === 'en'
                    ? 'Orders will appear here automatically once placed. Log in to track from any device.'
                    : 'অর্ডার করলে সেটি এখানে স্বয়ংক্রিয়ভাবে দেখা যাবে। ভবিষ্যতে যেকোনো ডিভাইস থেকে অর্ডার ট্র্যাক করতে লগইন করে রাখুন।'}
                </p>
                <button
                  onClick={handleOpenLogin}
                  className="rounded-full bg-gradient-to-r from-brand-light to-brand-light-hover px-7 py-2.5 font-body text-xs font-bold text-white shadow-sh2 transition-brand hover:brightness-[1.03] active:scale-95"
                >
                  {t('লগইন করুন')}
                </button>
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3.5">
                  {orders.map((o) => (
                    <OrderCard key={o.id} order={o} from="track" />
                  ))}
                </div>

                <div className="rounded-[22px] border border-brand-light/35 bg-white/75 p-4 shadow-xs backdrop-blur-md">
                  <div className="flex items-start gap-3">
                    <SparklesCrownSvgIcon />
                    <div className="flex-1">
                      <div className="mb-1 font-body text-[13.5px] font-extrabold text-ink">
                        {lang === 'en' ? 'Unlock VIP Features & Discounts' : 'ভিআইপি মেম্বারশিপ ও অফার সুবিধা পান'}
                      </div>
                      <p className="font-body text-[12px] leading-[1.7] text-ink/75">
                        {lang === 'en'
                          ? 'This order information is temporarily stored in this browser. Log in now to track & manage orders across all devices, switch languages (Bangla/English), save invoice history, and unlock VIP membership rewards & exclusive coupon discounts.'
                          : 'এই অর্ডারের তথ্য শুধুমাত্র সাময়িক সময়ের জন্য এই ব্রাউজারে সংরক্ষিত রয়েছে। যেকোনো ডিভাইস থেকে অর্ডার ট্র্যাক ও হিস্টোরি সংরক্ষণ, ভাষা পরিবর্তন (বাংলা/English), মেম্বারশিপ রিওয়ার্ড ও স্পেশাল কুপন ডিসকাউন্ট সুবিধা পেতে এখনই অ্যাকাউন্টে লগইন করে নিন।'}
                      </p>
                      <button
                        onClick={handleOpenLogin}
                        className="mt-2.5 inline-flex items-center gap-1 font-body text-[12.5px] font-extrabold text-brand-light transition-colors hover:text-brand-light-hover active:scale-95"
                      >
                        <span>{lang === 'en' ? 'Login to Account →' : 'অ্যাকাউন্টে লগইন করুন →'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </SkeletonTransition>
        </div>
      </div>

      <Footer />

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

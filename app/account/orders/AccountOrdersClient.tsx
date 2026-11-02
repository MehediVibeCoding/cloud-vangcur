'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/app/components/layout/Navbar';
import Footer from '@/app/components/layout/Footer';
import OrderCard from '@/app/components/orders/OrderCard';
import SkeletonTransition from '@/app/components/ui/SkeletonTransition';
import { OrderListSkeleton } from '@/app/components/ui/Skeletons';
import { fetchMyOrders, orderStats } from '@/lib/accountData';
import { getLiveUser } from '@/lib/authData';
import { useCartStore, cartCount } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useAuthStore } from '@/lib/store/authStore';
import {
  OPEN_CART_EVENT, OPEN_WISHLIST_EVENT, OPEN_TRACK_ORDER_EVENT,
} from '@/lib/uiEvents';
import { useT } from '@/lib/i18n/useT';
import type { Order } from '@/types';

const LoginModal = dynamic(() => import('@/app/components/auth/LoginModal'));

const MAX_ORDER_QUERY_LEN = 20;

export default function AccountOrdersClient() {
  const { t, lang } = useT();
  const supabase = useRef(createClient()).current;

  const cartQty = useCartStore((s) => cartCount(s.cart));
  const wishQty = useWishlistStore((s) => s.wishlist.length);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loginOpen, setLoginOpen] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 🛡️ ক্যাশ করা তথ্য বিশ্বাস না করে সরাসরি সার্ভারের কাছে আসল/লাইভ সেশন যাচাই করা হচ্ছে
      const liveUser = await getLiveUser(supabase);
      if (cancelled) return;

      if (!liveUser) {
        // আসল সেশন নেই — ক্যাশে পুরনো লগইন তথ্য থাকলে সেটা মুছে ফেলা হচ্ছে
        if (currentUser) useAuthStore.getState().setCurrentUser(null);
        setOrders([]);
        setLoading(false);
        return;
      }

      // ক্যাশ আর আসল সেশন না মিললে ক্যাশ আপডেট করা হচ্ছে
      if (!currentUser || currentUser.id !== liveUser.id) {
        useAuthStore.getState().setCurrentUser(liveUser);
      }

      setLoading(true);
      const data = await fetchMyOrders(supabase, liveUser);
      if (!cancelled) {
        setOrders(data);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, supabase]);

  const stats = useMemo(() => orderStats(orders), [orders]);

  // 🛡️ সুরক্ষিত ও ফিল্টার্ড অর্ডার নম্বর ম্যাচিং
  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => String(o.orderNum).toLowerCase().includes(q));
  }, [orders, query]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white">
      <Navbar
        showHomeButton
        sticky={false}
        cartCount={cartQty}
        wishCount={wishQty}
        currentUser={currentUser}
        onCartClick={() => window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT))}
        onWishClick={() => window.dispatchEvent(new CustomEvent(OPEN_WISHLIST_EVENT))}
        onTrackClick={() => window.dispatchEvent(new CustomEvent(OPEN_TRACK_ORDER_EVENT))}
        onLoginClick={() => setLoginOpen(true)}
      />

      <div className="mx-auto w-full max-w-[760px] px-5 pb-16 pt-6">
        {!currentUser ? (
          <div className="mx-auto my-10 max-w-[400px] rounded-[28px] border border-white/80 bg-white/85 p-8 text-center shadow-sh2 backdrop-blur-md animate-section-reveal">
            <div className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-bg/50 text-brand-light shadow-xs">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <h1 className="mb-1.5 font-body text-[17px] font-bold text-ink">{t('অর্ডার দেখতে লগইন করুন')}</h1>
            <p className="mb-5 font-body text-[13px] leading-relaxed text-muted">
              {lang === 'en'
                ? 'Please log in to your account to view your complete order history and status.'
                : 'আপনার অর্ডার ইতিহাস ও সর্বশেষ অবস্থা দেখতে অ্যাকাউন্টে লগইন করা প্রয়োজন।'}
            </p>
            <button
              onClick={() => setLoginOpen(true)}
              className="w-full rounded-full bg-gradient-to-r from-info to-brand-light py-2.5 font-body text-[13.5px] font-bold text-white shadow-sh2 transition-all hover:brightness-105 active:scale-95"
            >
              {t('লগইন করুন')}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-body text-xl font-extrabold text-ink">
                {t('আমার অর্ডার সমূহ')}
              </h1>
              {!loading && orders.length > 0 && (
                <div className="flex gap-2 font-body text-[11.5px] font-bold text-muted">
                  <span className="rounded-full border border-border-base bg-white/80 px-3 py-1 shadow-2xs">
                    {t('মোট:')} {stats.total}
                  </span>
                  <span className="rounded-full border border-border-base bg-white/80 px-3 py-1 shadow-2xs text-brand-light">
                    {t('চলমান:')} {stats.running}
                  </span>
                  <span className="rounded-full border border-border-base bg-white/80 px-3 py-1 shadow-2xs text-emerald-600">
                    {t('সম্পন্ন:')} {stats.completed}
                  </span>
                </div>
              )}
            </div>

            {!loading && orders.length > 0 && (
              <div className="mb-5">
                <input
                  type="text"
                  maxLength={MAX_ORDER_QUERY_LEN}
                  placeholder={t('অর্ডার নম্বর দিয়ে খুঁজুন (যেমন: VC-1082)')}
                  value={query}
                  onChange={(e) => {
                    // 🛡️ শুধুমাত্র অর্ডার নম্বর উপযোগী ক্যারেক্টার গ্রহণ ও ২০ লেন্থ লক
                    const clean = e.target.value.replace(/[^a-zA-Z0-9#\-_ ]/g, '').slice(0, MAX_ORDER_QUERY_LEN);
                    setQuery(clean);
                  }}
                  className="w-full rounded-full border border-border-base bg-white px-5 py-2.5 font-body text-[13px] text-ink outline-none transition-brand focus:border-brand-light/60 focus:shadow-[0_0_0_3px_rgba(68,167,252,.12)]"
                />
              </div>
            )}

            <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-xs backdrop-blur-md">
              <SkeletonTransition isReady={!loading} skeleton={<OrderListSkeleton />}>
                {orders.length === 0 ? (
                  <div className="py-12 text-center">
                    <svg className="mx-auto mb-3 text-border-base" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.5 7.3 12 3 3.5 7.3 12 11.6l8.5-4.3Z" />
                      <path d="M3.5 7.3v9.4L12 21l8.5-4.3V7.3" />
                      <path d="M12 11.6V21" />
                    </svg>
                    <div className="mb-1 font-body text-sm font-bold text-ink">{t('এখনো কোনো অর্ডার নেই')}</div>
                    <div className="mb-5 font-body text-xs text-muted">{t('অর্ডার করলে এখানে দেখাবে')}</div>
                    <Link prefetch={false}
                      href="/"
                      className="inline-block rounded-full bg-gradient-to-r from-info to-brand-light px-6 py-2.5 font-body text-[13px] font-bold text-white shadow-sh1 transition-all hover:brightness-105 active:scale-95"
                    >
                      {t('কেনাকাটা শুরু করুন')} →
                    </Link>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="py-10 text-center">
                    <svg className="mx-auto mb-2 text-border-base" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    <div className="font-body text-sm font-bold text-ink">{t('এই নম্বরে কোনো অর্ডার পাওয়া যায়নি')}</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredOrders.map((o) => (
                      <OrderCard key={o.id} order={o} />
                    ))}
                  </div>
                )}
              </SkeletonTransition>
            </div>
          </>
        )}
      </div>

      <Footer />

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
         }

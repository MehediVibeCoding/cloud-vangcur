'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { fetchFullOrder, readPendingOrder, readLatestGuestOrder } from '@/lib/orderStatus';
import { mapSupabaseOrderRow } from '@/lib/orderMapping';
import { useAuthStore } from '@/lib/store/authStore';
import { useT } from '@/lib/i18n/useT';
import useHistoryModal, { suppressHistoryCleanup } from '@/lib/useHistoryModal';
import OrderCard from '@/app/components/orders/OrderCard';
import SkeletonTransition from '@/app/components/ui/SkeletonTransition';
import { OrderListSkeleton } from '@/app/components/ui/Skeletons';
import type { Order } from '@/types';

const LoginModal = dynamic(() => import('@/app/components/auth/LoginModal'));

export interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ClearTrackSvgIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ReceiptEmptySvgIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
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

function HeaderDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]">
      <svg width="34" height="34" className="absolute -left-1 top-2 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 13a8 8 0 0 1 16 0" />
        <rect x="3" y="13" width="4" height="6" rx="1.5" />
        <rect x="17" y="13" width="4" height="6" rx="1.5" />
      </svg>
      <svg width="26" height="26" className="absolute right-14 top-3 rotate-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
    </div>
  );
}

type GuestRef = { id?: string; orderNum?: string; phone?: string };

// এই ডিভাইসে সেভ থাকা গেস্ট-অর্ডারের তালিকা (সিঙ্ক্রোনাস, শুধু localStorage/sessionStorage পড়ে)।
function readGuestList(): GuestRef[] {
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
}

function hasGuestOrdersSync(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return readGuestList().length > 0;
  } catch {
    return false;
  }
}

export default function TrackOrderModal({ isOpen, onClose }: TrackOrderModalProps) {
  const { t, lang } = useT();
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const currentUser = useAuthStore((s) => s.currentUser);

  // 🛠️ ফিক্স (প্রথমবার খুললে ঝাঁকুনি): আগে loading সবসময় `true` দিয়ে শুরু হতো, তাই প্রথমবার
  // খুললে আগে স্কেলেটন দেখাত, তারপর "কোনো অর্ডার নেই" কনটেন্টে ক্রসফেড হয়ে মডালের উচ্চতা
  // বদলাত (পরের বার state আগেরটাই থাকত বলে মসৃণ লাগত)। এখন শুরুতেই localStorage দেখে ঠিক
  // করা হয়: অর্ডার না থাকলে প্রথম রেন্ডারেই চূড়ান্ত "অর্ডার নেই" স্টেট — কোনো স্কেলেটন নেই।
  const [loading, setLoading] = useState<boolean>(() => hasGuestOrdersSync());
  const [orders, setOrders] = useState<Order[]>([]);
  const [notFound, setNotFound] = useState<boolean>(() => !hasGuestOrdersSync());
  const [loginOpen, setLoginOpen] = useState(false);

  // 🛡️ এটি শুধুমাত্র এই ডিভাইসে আগেই অটোমেটিকভাবে লোড হওয়া (localStorage-ভিত্তিক,
  // ইতিমধ্যে সার্ভার থেকে যাচাই করা) অর্ডারের ওপর ক্লায়েন্ট-সাইড ফিল্টার — এখানে
  // কোনো arbitrary ফোন নম্বর/অর্ডার নম্বর দিয়ে সরাসরি ডাটাবেজে নতুন করে কোয়েরি
  // করা হয় না, তাই অন্য কারো অর্ডার খোঁজার কোনো সুযোগ নেই।
  const [query, setQuery] = useState('');
  const MAX_QUERY_LEN = 20;

  useHistoryModal(isOpen && !currentUser, onClose, 'track-order-modal');

  useEffect(() => {
    if (isOpen) lockBody();
    else unlockBody();
    return () => unlockBody();
  }, [isOpen]);

  const loadGuestOrders = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setOrders([]);
    setQuery('');

    const guestList = readGuestList();

    if (guestList.length === 0) {
      setLoading(false);
      setNotFound(true);
      return;
    }

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
      setNotFound(false);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }, [supabase]);

  // useLayoutEffect: খোলার মুহূর্তের সিঙ্ক্রোনাস state (লোডিং/অর্ডার-নেই) প্রথম পেইন্টের আগেই বসে যায়
  useLayoutEffect(() => {
    if (!isOpen) return;

    if (currentUser) {
      onClose();
      // মডাল বন্ধ হওয়ার effect cleanup যেন নিচের router.push()-কে
      // deferred history.back() দিয়ে উল্টে না দেয়।
      suppressHistoryCleanup();
      router.push('/account/orders');
      return;
    }

    loadGuestOrders();
  }, [isOpen, currentUser, router, onClose, loadGuestOrders]);

  // 🛡️ এই ডিভাইসে ইতিমধ্যে fetch হওয়া অর্ডারের মধ্যেই শুধু ফিল্টার — নতুন কোনো
  // ডাটাবেজ কোয়েরি হয় না (account/orders পেজের মতোই নিরাপদ প্যাটার্ন), তাই
  // arbitrary অর্ডার নম্বর/ফোন নম্বর দিয়ে অন্য কারো অর্ডার খোঁজার সুযোগ নেই।
  const filteredOrders = orders.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return String(o.orderNum).toLowerCase().includes(q);
  });

  const openInvoice = (_orderId: string | number) => {
    onClose();
    // মডাল বন্ধ হওয়ার effect cleanup যেন নিচের OrderCard-এর নিজস্ব
    // router.push()-কে (যেটা এখন এই কলব্যাকের বাইরে ঘটে) deferred
    // history.back() দিয়ে উল্টে না দেয়। এখানে আমরা নিজেরা আর push
    // করছি না — সেটা করলে ইনভয়েস পেজে দুটো ডুপ্লিকেট হিস্ট্রি এন্ট্রি
    // জমত, যেটার কারণে "ফিরে যান" চাপলে লুপে আটকে যাওয়ার বাগ হতো।
    suppressHistoryCleanup();
  };

  const handleOpenLogin = () => {
    onClose();
    setTimeout(() => {
      setLoginOpen(true);
    }, 150);
  };

  if (currentUser) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[965] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-0 bg-ink/55 backdrop-blur-[3px]"
              onClick={onClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 flex max-h-[88vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white shadow-sh3 ring-1 ring-white/80"
            >
              <div className="relative shrink-0 overflow-hidden border-b border-ink/10 px-6 pb-3.5 pt-5 text-left">
                <HeaderDecor />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
                      <ClearTrackSvgIcon />
                    </span>
                    <h3 className="font-body text-[17px] font-extrabold text-ink">
                      {lang === 'en' ? 'Track Order' : 'অর্ডার ট্র্যাক করুন'}
                    </h3>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-ink/60 shadow-sh1 backdrop-blur-[8px] transition-colors hover:bg-white hover:text-ink focus-visible:outline-none"
                    aria-label="Close"
                  >
                    ✕
                  </motion.button>
                </div>
              </div>

              <div className="sleek-scrollbar flex-1 overflow-y-auto px-6 py-4">
                <SkeletonTransition isReady={!loading} skeleton={<OrderListSkeleton count={2} />}>
                  {notFound ? (
                    <div className="py-2 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white text-brand-light shadow-sm">
                        <ReceiptEmptySvgIcon className="h-7 w-7 text-brand-light" />
                      </div>

                      <div className="mb-1 font-body text-[15.5px] font-bold text-ink">
                        {lang === 'en' ? 'No orders yet' : 'এখনো কোনো অর্ডার নেই'}
                      </div>
                      <p className="mx-auto mb-4 max-w-xs font-body text-[13px] leading-relaxed text-muted">
                        {lang === 'en'
                          ? 'Orders will appear here automatically once placed. This device has no order information yet — meaning you haven\'t placed an order so far.'
                          : 'অর্ডার করলে সেটি এখানে দেখা যাবে। এই ডিভাইসে এখন পর্যন্ত কোনো অর্ডারের তথ্য নেই, অর্থাৎ আপনি এখন পর্যন্ত অর্ডার করেননি।'}
                      </p>

                      <div className="mb-4 rounded-[14px] border border-brand-light/30 bg-white/70 p-3.5 text-left">
                        <p className="font-body text-[12.5px] leading-relaxed text-ink/80">
                          {lang === 'en'
                            ? 'Please log in before placing your order — this keeps your order secure and unlocks membership benefits, free delivery, discounts, and coupons.'
                            : 'অর্ডার প্লেস করার আগে অবশ্যই লগইন করে অর্ডার প্লেস করবেন। এতে আপনার অর্ডারের সুরক্ষা নিশ্চিত হয়, এবং আপনি মেম্বারশিপ সুবিধা, ফ্রি ডেলিভারি চার্জ, ডিসকাউন্ট ও কুপনের মতো সুবিধা পেতে পারেন।'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenLogin}
                        className="w-full rounded-full bg-gradient-to-r from-info to-brand-light py-2.5 font-body text-xs font-bold text-white shadow-sh1 transition-all hover:brightness-[1.03] active:scale-95"
                      >
                        {t('লগইন করুন')}
                      </button>
                    </div>
                  ) : orders.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <input
                          type="text"
                          value={query}
                          maxLength={MAX_QUERY_LEN}
                          onChange={(e) => {
                            // 🛡️ শুধুমাত্র অর্ডার নম্বর উপযোগী ক্যারেক্টার গ্রহণ ও লেন্থ লক
                            const clean = e.target.value.replace(/[^a-zA-Z0-9#\-_ ]/g, '').slice(0, MAX_QUERY_LEN);
                            setQuery(clean);
                          }}
                          placeholder={lang === 'en' ? 'Search by Order Number (e.g. VC-1082)' : 'অর্ডার নম্বর দিয়ে খুঁজুন (যেমন: VC-1082)'}
                          className="w-full rounded-full border border-border-base bg-white/90 px-4 py-2.5 font-body text-xs text-ink outline-none transition-brand focus:border-brand-light"
                        />
                      </div>

                      {filteredOrders.length === 0 ? (
                        <div className="py-6 text-center">
                          <div className="mb-2 text-2xl">🔍</div>
                          <div className="font-body text-[13px] font-bold text-ink">
                            {lang === 'en' ? 'No order found with this number' : 'এই নম্বরে কোনো অর্ডার পাওয়া যায়নি'}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {/* from="track-modal" (পপআপ) ↔ from="track" (পুরো /track-order পেজ) — আলাদা
                              রাখা হচ্ছে, যাতে ইনভয়েস পেজ থেকে "ফিরে যান" চাপলে সঠিক জায়গায় ফেরত যায় */}
                          {filteredOrders.map((o) => (
                            <OrderCard key={o.id} order={o} onInvoice={openInvoice} from="track-modal" />
                          ))}
                        </div>
                      )}

                      <div className="rounded-[18px] border border-brand-light/35 bg-white/75 p-4 shadow-xs backdrop-blur-md">
                        <div className="flex items-start gap-3">
                          <SparklesCrownSvgIcon />
                          <div className="flex-1">
                            <div className="mb-1 font-body text-[13.5px] font-extrabold text-ink">
                              {lang === 'en' ? 'Unlock VIP Features & Discounts' : 'ভিআইপি মেম্বারশিপ ও অফার সুবিধা পান'}
                            </div>
                            <p className="font-body text-[13px] leading-[1.7] text-ink/75">
                              {lang === 'en'
                                ? 'This order information is temporarily stored in this browser. Log in now to track & manage orders across all devices, switch languages (Bangla/English), save invoice history, and unlock VIP membership rewards & exclusive coupon discounts.'
                                : 'এই অর্ডারের তথ্য শুধুমাত্র সাময়িক সময়ের জন্য এই ব্রাউজারে সংরক্ষিত রয়েছে। যেকোনো ডিভাইস থেকে অর্ডার ট্র্যাক ও হিস্টোরি সংরক্ষণ, ভাষা পরিবর্তন (বাংলা/English), মেম্বারশিপ রিওয়ার্ড ও স্পেশাল কুপন ডিসকাউন্ট সুবিধা পেতে এখনই অ্যাকাউন্টে লগইন করে নিন।'}
                            </p>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={handleOpenLogin}
                              className="mt-2.5 inline-flex items-center gap-1 font-body text-[12.5px] font-extrabold text-brand-light transition-colors hover:text-brand-light-hover"
                            >
                              <span>{lang === 'en' ? 'Login to Account →' : 'অ্যাকাউন্টে লগইন করুন →'}</span>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </SkeletonTransition>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

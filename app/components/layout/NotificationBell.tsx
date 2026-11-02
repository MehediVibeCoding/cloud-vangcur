'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { useT } from '@/lib/i18n/useT';
import {
  fetchLiveOfferNotification,
  fetchStockBackNotifications,
  buildDraftOrderNotifications,
  buildReviewRequestNotifications,
  dismissReviewNotification,
  buildTierUpgradeNotification,
  buildSecretCodeNotifications,
  setLastNotifiedTier,
  buildNotifSignature,
  getNotifSeenSignature,
  setNotifSeenSignature,
  getDismissedNotifIds,
  dismissNotification,
  type NotificationItem,
} from '@/lib/notificationsData';
import { fetchMyOrders, fetchDrafts, orderStats } from '@/lib/accountData';

function IconBell({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconOfferTag({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function IconStockBox({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconDraftEdit({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconStar({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2l2.9 6.26 6.9.6-5.2 4.6 1.6 6.74L12 16.9l-6.2 3.3 1.6-6.74-5.2-4.6 6.9-.6L12 2z" />
    </svg>
  );
}

function IconCrown({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" />
    </svg>
  );
}

function IconTicket({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
      <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
    </svg>
  );
}

function IconTrashSmall({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function IconCloseX({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function NotificationRow({
  item,
  isMobile,
  onNavigate,
  onDismiss,
}: {
  item: NotificationItem;
  isMobile: boolean;
  onNavigate: (item: NotificationItem) => void;
  onDismiss: (id: string) => void;
}) {
  const { t } = useT();
  const [dragX, setDragX] = useState(0);
  const [removing, setRemoving] = useState(false);
  const DELETE_THRESHOLD = 64;
  const MAX_DRAG = 96;

  const leftReveal = Math.max(0, Math.min(1, dragX / DELETE_THRESHOLD));
  const rightReveal = Math.max(0, Math.min(1, -dragX / DELETE_THRESHOLD));

  return (
    <div className="relative overflow-hidden bg-white">
      {isMobile && (
        <div className="absolute inset-0 flex items-center justify-between bg-red-50 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white transition-opacity" style={{ opacity: leftReveal }}>
            <IconTrashSmall className="h-4 w-4" />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white transition-opacity" style={{ opacity: rightReveal }}>
            <IconTrashSmall className="h-4 w-4" />
          </span>
        </div>
      )}

      <motion.div
        drag={isMobile ? 'x' : false}
        dragConstraints={{ left: -MAX_DRAG, right: MAX_DRAG }}
        dragElastic={0.15}
        animate={removing ? { x: dragX > 0 ? 400 : -400, opacity: 0 } : { x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) >= DELETE_THRESHOLD) {
            setDragX(info.offset.x);
            setRemoving(true);
            setTimeout(() => onDismiss(item.id), 180);
          } else {
            setDragX(0);
          }
        }}
        className="relative bg-white"
      >
        <Link prefetch={false}
          href={item.href}
          onClick={(e) => {
            if (Math.abs(dragX) > 6) {
              e.preventDefault();
              return;
            }
            onNavigate(item);
          }}
          className="group flex items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-surface-muted/70"
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tileColorForType(item.type)}`}>
            {iconForType(item.type)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-body text-[13px] font-bold text-ink">{item.title}</p>
            {item.subtitle && (
              <p className="truncate font-body text-[11.5px] text-muted">{item.subtitle}</p>
            )}
          </div>

          {!isMobile && (
            <button
              type="button"
              title={t('মুছুন')}
              aria-label={t('মুছুন')}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDismiss(item.id);
              }}
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 sm:flex cursor-pointer"
            >
              <IconTrashSmall className="h-3.5 w-3.5" />
            </button>
          )}

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-muted ${!isMobile ? 'group-hover:hidden' : ''}`}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </motion.div>
    </div>
  );
}

function iconForType(type: NotificationItem['type']) {
  if (type === 'offer') return <IconOfferTag className="h-4 w-4" />;
  if (type === 'stock') return <IconStockBox className="h-4 w-4" />;
  if (type === 'draft') return <IconDraftEdit className="h-4 w-4" />;
  if (type === 'review') return <IconStar className="h-4 w-4" />;
  if (type === 'tier') return <IconCrown className="h-4 w-4" />;
  return <IconTicket className="h-4 w-4" />;
}

function tileColorForType(type: NotificationItem['type']) {
  if (type === 'offer') return 'bg-red-50 text-red-500';
  if (type === 'stock') return 'bg-emerald-50 text-emerald-600';
  if (type === 'draft') return 'bg-amber-50 text-amber-600';
  if (type === 'review') return 'bg-yellow-50 text-yellow-500';
  if (type === 'tier') return 'bg-purple-50 text-purple-600';
  return 'bg-blue-50 text-blue-600';
}

export default function NotificationBell({ className = '' }: { className?: string }) {
  const { lang } = useT();
  const currentUser = useAuthStore((s) => s.currentUser);
  const supabase = useRef(createClient()).current;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const loadNotifications = useCallback(async () => {
    const [offer, stock, orders, drafts] = await Promise.all([
      fetchLiveOfferNotification(supabase, lang),
      fetchStockBackNotifications(supabase, lang),
      currentUser ? fetchMyOrders(supabase, currentUser) : Promise.resolve([]),
      currentUser ? fetchDrafts(supabase, currentUser) : Promise.resolve([]),
    ]);
    const draftNotifs = buildDraftOrderNotifications(drafts, lang);
    const reviewNotifs = buildReviewRequestNotifications(orders, lang);
    const tierNotif = buildTierUpgradeNotification(orderStats(orders).completed, lang);
    const codeNotifs = await buildSecretCodeNotifications(supabase, lang);

    const dismissed = getDismissedNotifIds();
    const next = [
      ...(offer ? [offer] : []),
      ...(tierNotif ? [tierNotif] : []),
      ...stock,
      ...draftNotifs,
      ...reviewNotifs,
      ...codeNotifs,
    ].filter((n) => !dismissed.includes(n.id));
    setItems(next);
    const sig = buildNotifSignature(next);
    setHasUnread(next.length > 0 && sig !== getNotifSeenSignature());
  }, [supabase, lang, currentUser]);

  const handleDismissItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    dismissNotification(id);
    if (id.startsWith('review:')) {
      const orderId = id.split(':')[1];
      if (orderId) dismissReviewNotification(orderId);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // আগে সবার জন্য (গেস্টসহ) প্রতি ৬০ সেকেন্ডে পোলিং হতো, ট্যাব ব্যাকগ্রাউন্ডে থাকলেও।
    // এখন: ট্যাব দৃশ্যমান না থাকলে পোলিং স্কিপ, আর ইন্টারভাল বাড়ানো (৬০সে → ৩ মিনিট লগইন
    // ইউজারের জন্য, ৬০সে → ১০ মিনিট গেস্টের জন্য — গেস্টের নোটিফিকেশন কম সময়-সংবেদনশীল)।
    // ট্যাব আবার visible হলে সাথে সাথে একবার রিফ্রেশ হয়, তাই দীর্ঘ ইন্টারভাল থাকলেও তথ্য বাসি থাকে না।
    const pollMs = currentUser ? 180000 : 600000;

    const poll = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadNotifications();
    };

    const interval = setInterval(poll, pollMs);
    const onVisible = () => { if (!document.hidden) loadNotifications(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadNotifications, currentUser]);

  useEffect(() => {
    if (!open) return undefined;
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    if (open) lockBody(); else unlockBody();
    return () => unlockBody();
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setHasUnread(false);
      setNotifSeenSignature(buildNotifSignature(items));
      const tierItem = items.find((i) => i.type === 'tier');
      if (tierItem) {
        const tierKey = tierItem.id.split(':')[1];
        if (tierKey) setLastNotifiedTier(tierKey);
      }
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    setOpen(false);
    if (item.type === 'review') {
      const orderId = item.id.split(':')[1];
      if (orderId) dismissReviewNotification(orderId);
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <motion.button
        whileTap={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 500, damping: 24 }}
        onClick={handleToggle}
        title={lang === 'en' ? 'Notifications' : 'নোটিফিকেশন'}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-ink transition-colors hover:bg-surface-muted hover:text-brand-light cursor-pointer"
      >
        <IconBell />
        {hasUnread && (
          <span className="absolute right-[6px] top-[6px] h-2 w-2 rounded-full bg-red-500 ring-2 ring-white animate-badge-hot-glow" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* স্বচ্ছ ব্যাকড্রপ (ক্লিক করলে বন্ধ হবে কিন্তু স্ক্রিন ডার্ক বা ব্লার করবে না) */}
            <div
              className="fixed inset-0 z-[940] bg-transparent"
              onClick={() => setOpen(false)}
            />

            {/* ১০০% সলিড ড্রপডাউন প্যানেল (জিরো ট্রান্সপারেন্সি ও কোনো ওভারল্যাপ ছাড়া) */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.26 }}
              className="fixed inset-x-3 top-[84px] z-[960] max-h-[75vh] overflow-hidden rounded-[24px] border border-border-base bg-white shadow-sh3 sm:absolute sm:inset-x-auto sm:top-[calc(100%+20px)] sm:right-0 sm:w-[360px] sm:rounded-[22px]"
            >
              <div className="flex items-center justify-between border-b border-border-base bg-white px-4 py-3">
                <span className="font-body text-[14px] font-extrabold text-ink">
                  {lang === 'en' ? 'Notifications' : 'নোটিফিকেশন'}
                </span>
                <motion.button
                  onClick={() => setOpen(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-base/70 bg-surface-muted text-muted shadow-2xs transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 sm:hidden cursor-pointer"
                  aria-label="close"
                >
                  <IconCloseX />
                </motion.button>
              </div>

              <div className="max-h-[calc(75vh-52px)] overflow-y-auto bg-white sm:max-h-[420px] sleek-scrollbar">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 bg-white px-4 py-10 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-muted">
                      <IconBell className="h-5 w-5" />
                    </span>
                    <p className="font-body text-[12.5px] text-muted">
                      {lang === 'en' ? 'No notifications right now' : 'এই মুহূর্তে কোনো নোটিফিকেশন নেই'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-border-base/70 bg-white">
                    <AnimatePresence initial={false}>
                      {items.map((item) => (
                        <NotificationRow
                          key={item.id}
                          item={item}
                          isMobile={isMobile}
                          onNavigate={handleItemClick}
                          onDismiss={handleDismissItem}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

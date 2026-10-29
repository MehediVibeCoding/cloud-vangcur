'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { OPEN_BULK_ORDER_EVENT, OPEN_QUICK_CART_MODAL_EVENT } from '@/lib/uiEvents';
import { useCartStore, cartTotal } from '@/lib/store/cartStore';
import {
  DEFAULT_WA_LINK,
  computeWaLink,
  fetchContactSettings,
} from '@/lib/floatButtonsData';
import useHistoryModal from '@/lib/useHistoryModal';
import { useT } from '@/lib/i18n/useT';

const lineIcon = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function BulkShieldIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function HeaderDecor() {
  const deco = { ...lineIcon, strokeWidth: 1.4 };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]">
      <svg {...deco} width="34" height="34" className="absolute -left-1 top-2 -rotate-12" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <svg {...deco} width="26" height="26" className="absolute right-14 top-3 rotate-6" viewBox="0 0 24 24">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
    </div>
  );
}

export default function BulkOrderModal() {
  const { lang } = useT();
  const [open, setOpen] = useState(false);
  const [waLink, setWaLink] = useState(DEFAULT_WA_LINK);
  const [customTotal, setCustomTotal] = useState<number | null>(null);

  const cart = useCartStore((s) => s.cart);
  const totalBill = customTotal ?? cartTotal(cart);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setCustomTotal(null);
  }, []);

  useHistoryModal(open, close, 'bulk-order-modal');

  useEffect(() => {
    const onTrigger = (e: Event) => {
      const detail = (e as CustomEvent<{ total?: number }>).detail;
      if (detail && typeof detail.total === 'number') {
        setCustomTotal(detail.total);
      } else {
        setCustomTotal(null);
      }
      setOpen(true);
    };
    window.addEventListener(OPEN_BULK_ORDER_EVENT, onTrigger);
    return () => window.removeEventListener(OPEN_BULK_ORDER_EVENT, onTrigger);
  }, []);

  useEffect(() => {
    if (open) lockBody();
    else unlockBody();
    return () => unlockBody();
  }, [open]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const contact = await fetchContactSettings(supabase);
      if (!cancelled && contact) setWaLink(computeWaLink(contact));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleModifyCart = () => {
    close();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OPEN_QUICK_CART_MODAL_EVENT));
    }
  };

  const handleWhatsAppOrder = () => {
    close();

    const itemsSummary = cart.length > 0
      ? cart.map((i, idx) => `${idx + 1}. ${i.name} × ${i.qty} — ৳${(i.price * i.qty).toLocaleString('en-US')}`).join('\n')
      : (lang === 'en' ? 'Custom Bulk Products' : 'বাল্ক প্রোডাক্ট অর্ডার');

    const msg = lang === 'en'
      ? `Hello Vangcur Support! I would like to place a large/bulk order over 20,000 BDT:\n\n📦 Products:\n${itemsSummary}\n\n💰 Total Bill: ৳${totalBill.toLocaleString('en-US')}\n\nPlease assist me in processing this bulk order.`
      : `হ্যালো Vangcur সাপোর্ট! আমি ২০,০০০ টাকার বেশি মূল্যের একটি বাল্ক/লার্জ অর্ডার করতে চাই:\n\n📦 পণ্যসমূহ:\n${itemsSummary}\n\n💰 সর্বমোট বিল: ৳${totalBill.toLocaleString('en-US')}\n\nঅনুগ্রহ করে আমার অর্ডারটি সরাসরি কনফার্ম করতে সহযোগিতা করুন।`;

    window.open(`${waLink}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[1300] bg-ink/55 backdrop-blur-[3px] transition-opacity duration-brand"
        onClick={close}
      />

      <div className="fixed inset-0 z-[1305] flex items-center justify-center p-4">
        <div className="relative flex max-h-[90vh] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-6 text-center shadow-sh3 transition-all duration-300 ease-brand animate-section-reveal">
          
          <HeaderDecor />
          <motion.button
            onClick={close}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 480, damping: 28 }}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-ink/60 shadow-sh1 backdrop-blur-[8px] transition-brand hover:bg-white hover:text-ink focus-visible:outline-none"
            aria-label="Close"
          >
            ✕
          </motion.button>

          <div className="relative z-10 mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-brand-light/35 bg-white text-brand-light shadow-sm">
            <BulkShieldIcon />
          </div>

          <h3 className="relative z-10 font-body text-[17.5px] font-extrabold text-ink">
            {lang === 'en' ? 'Bulk & Large Order Notice' : 'বাল্ক ও লার্জ অর্ডার নোটিশ'}
          </h3>

          <p className="relative z-10 mt-2 font-body text-[13px] leading-relaxed text-ink/80">
            {lang === 'en' ? (
              <>Your order total is <strong className="font-bold text-brand-light">৳{totalBill.toLocaleString('en-US')}</strong> (exceeds the ৳20,000 online checkout limit). For security, customized delivery packaging, and bulk discount verification, large orders are processed directly via WhatsApp.</>
            ) : (
              <>আপনার মোট অর্ডারের পরিমাণ <strong className="font-bold text-brand-light">৳{totalBill.toLocaleString('en-US')}</strong> (যা ওয়েবসাইটের অনলাইন চেকআউট সীমা ২০,০০০ টাকার বেশি)। পার্সেল নিরাপত্তা, বিশেষ প্যাকেজিং ও লার্জ অর্ডার সুবিধার জন্য সরাসরি WhatsApp-এর মাধ্যমে অর্ডার গ্রহণ করা হয়।</>
            )}
          </p>

          <div className="relative z-10 my-4 rounded-[12px] border border-brand-light/35 bg-white/85 p-3.5 text-left shadow-xs backdrop-blur-md">
            <div className="font-body text-[13px] leading-relaxed text-ink/85">
              {lang === 'en' ? (
                <>✨ Our dedicated support manager will immediately assist you on WhatsApp to confirm your items, apply bulk deals, and arrange secure fast home delivery.</>
              ) : (
                <>✨ নিচের বাটনে ক্লিক করলেই আপনার কার্টের সকল প্রোডাক্টের তালিকা সহ সরাসরি আমাদের অফিসিয়াল WhatsApp সাপোর্ট ম্যানেজারের সাথে চ্যাট ওপেন হবে।</>
              )}
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-2.5 pt-1">
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              onClick={handleWhatsAppOrder}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-[13px] font-body text-[14.5px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-105"
            >
              <WhatsAppIcon />
              <span>{lang === 'en' ? 'Order via WhatsApp' : 'WhatsApp-এ অর্ডার কনফার্ম করুন'}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              onClick={handleModifyCart}
              className="w-full rounded-full border border-border-base bg-white/80 py-[11.5px] font-body text-[13.5px] font-bold text-ink transition-colors duration-brand hover:bg-white"
            >
              {lang === 'en' ? 'Modify Cart' : 'কার্ট পরিবর্তন করুন'}
            </motion.button>
          </div>

        </div>
      </div>
    </>
  );
}

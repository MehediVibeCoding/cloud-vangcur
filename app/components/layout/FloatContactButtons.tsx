'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_MSG_LINK, DEFAULT_WA_LINK } from '@/lib/floatButtonsData';
import { useT } from '@/lib/i18n/useT';

function MessengerIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="white" viewBox="0 0 24 24">
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.9 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.57.61.94 1.13.7l1.98-.87c.17-.08.36-.09.54-.04.9.25 1.87.38 2.89.38C17.64 21.4 22 17.27 22 11.7 22 6.13 17.64 2 12 2zm6.11 7.37l-2.96 4.7c-.47.74-1.47.93-2.17.41l-2.36-1.76c-.22-.16-.51-.16-.72 0l-3.18 2.41c-.42.32-.97-.16-.69-.62l2.96-4.7c.47-.74 1.47-.93 2.17-.41l2.36 1.76c.22.16.51.16.72 0l3.18-2.41c.43-.32.97.17.69.62z" />
    </svg>
  );
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="white" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function FloatContactButtons() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // মোবাইলে hover নেই, তাই ট্যাপে টগল হওয়ার জন্য বাইরে ট্যাপ/ক্লিক করলে
  // প্যানেল বন্ধ হয়ে যায়।
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [open]);

  const waLink = DEFAULT_WA_LINK;
  const msgLink = DEFAULT_MSG_LINK;

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // মাউস main বাটন থেকে পাশের অপশনে সরানোর সময় সাথে সাথে বন্ধ না হয়ে যায়
  // তাই বন্ধ হওয়াটা সামান্য দেরি করে (debounce) করা হচ্ছে।
  const handleEnter = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const handleLeave = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 220);
  };

  useEffect(() => () => clearCloseTimer(), []);

  // 🛡️ iOS Safari / মোবাইল ফার্স্ট-ট্যাপ ফিক্স: আগে onMouseEnter/onMouseLeave
  // সরাসরি wrapper div-এ বসানো ছিল। WebKit-এ কোনো element-এর (বা তার parent-এর)
  // mouse hover handler থাকলে টাচ ডিভাইসে প্রথম ট্যাপে সেটাকে শুধু "hover" হিসেবে
  // ধরে নেয় (click fire হয় না) — দ্বিতীয় ট্যাপে গিয়ে আসল ক্লিক কাজ করে। তাই
  // মেসেঞ্জার বাটনে প্রথমবার ট্যাপ করলে কিছু হতো না। এখন শুধু hover-সাপোর্টেড
  // ডিভাইসে (আসল মাউস থাকা ডেস্কটপ) hover handler অ্যাটাচ করা হচ্ছে — টাচ
  // ডিভাইসে পুরোপুরি বাটনের নিজের onClick-এর ওপর নির্ভর করবে।
  const supportsHover = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;
  const hoverHandlers = supportsHover
    ? { onMouseEnter: handleEnter, onMouseLeave: handleLeave }
    : {};

  return (
    <div
      ref={wrapRef}
      className="fixed bottom-5 right-5 z-40"
      {...hoverHandlers}
    >
      <div
        className={`absolute bottom-0 right-[68px] flex flex-col items-end gap-2 transition-all duration-brand ease-brand ${
          open ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-4 opacity-0'
        }`}
      >
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          title={t('WhatsApp এ মেসেজ করুন')}
          className="flex shrink-0 items-center rounded-full shadow-sh3 transition-transform duration-brand ease-brand hover:scale-105"
        >
          <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]">
            <WhatsAppIcon size={14} />
          </span>
          <span className="-ml-2.5 whitespace-nowrap rounded-full border border-border-base/70 bg-white/95 py-1 pl-4 pr-3 font-body text-[10.5px] font-normal tracking-wide text-ink">
            WhatsApp
          </span>
        </a>
        <a
          href={msgLink}
          target="_blank"
          rel="noopener noreferrer"
          title={t('Messenger এ মেসেজ করুন')}
          className="flex shrink-0 items-center rounded-full shadow-sh3 transition-transform duration-brand ease-brand hover:scale-105"
        >
          <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0084FF]">
            <MessengerIcon size={13} />
          </span>
          <span className="-ml-2.5 whitespace-nowrap rounded-full border border-border-base/70 bg-white/95 py-1 pl-4 pr-3 font-body text-[10.5px] font-normal tracking-wide text-ink">
            Messenger
          </span>
        </a>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t('আমাদের সাথে চ্যাট করুন')}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-light shadow-sh3 transition-transform duration-brand ease-brand hover:scale-105"
      >
        <MessengerIcon />
      </button>
    </div>
  );
}

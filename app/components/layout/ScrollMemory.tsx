'use client';

// ফাইলের পাথ: app/components/layout/ScrollMemory.tsx
// [NEW ব্যাচ ১৪] পলিসি/গ্রাহক-সেবা লিংকে ক্লিকের আগে স্ক্রল-পজিশন সেভ; "ফিরে যান"-এর পর গন্তব্য পেজে ফেরানো।
// কোনো UI নেই। GlobalOverlays-এ একবার বসানো থাকে, তাই ফুটারের বাইরের লিংক (যেমন কার্ট/মডাল) থেকে ঢুকলেও কাজ করে।

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  forgetSavedScroll, isListingPath, isPolicyPath, restoreScrollIfRequested, restoreScrollOnBack, saveScrollPosition,
} from '@/lib/scrollMemory';
import { clearPolicyNavHint, policyBasePath, setPolicyNavHint } from '@/lib/policyNavHint';

// ব্যাক/ফরওয়ার্ড (popstate) এর পর এতক্ষণের মধ্যে পাথ বদলালে সেটাকে ব্যাক ধরি। মডাল বন্ধ করতে history-pop হলে (পাথ বদলায় না)
// পতাকা আটকে থাকে — TTL তাই পরের সাধারণ ক্লিককে ভুল করে ব্যাক ধরা আটকায়।
const POP_TTL_MS = 4000;

export default function ScrollMemory() {
  const pathname = usePathname();
  const popAtRef = useRef(0);
  const firstRef = useRef(true);

  useEffect(() => {
    const onPop = () => { popAtRef.current = Date.now(); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ক্যাপচার-ফেজে ক্লিক ধরি — Next.js Link নেভিগেট করার আগেই বর্তমান পজিশন সেভ হয়ে যায়
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      let path = '';
      try {
        const u = new URL(a.href, window.location.href);
        if (u.origin !== window.location.origin) return;
        path = u.pathname;
      } catch {
        return;
      }
      if (isPolicyPath(path) && !isPolicyPath(window.location.pathname)) {
        // ক্লিক করা লিংকটাও দিই — ফুটারের লিংক হলে ফেরার সময় সেটাই নোঙর হয় (lib/scrollMemory.ts)
        saveScrollPosition(a);
        // সঠিক পলিসি-স্কেলেটনের হিন্ট (app/loading.tsx পড়ে): নতুন ট্যাব/মডিফায়ার/ডাউনলোড হলে সাধারণ নেভিগেশন নয়
        const plain =
          e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented &&
          (!a.target || a.target === '_self') && !a.hasAttribute('download');
        const base = policyBasePath(path);
        if (plain && base && path !== window.location.pathname) setPolicyNavHint(base, window.location.pathname);
        else clearPolicyNavHint();
      } else {
        // অন্য যেকোনো লিংকে ক্লিক — আটকে থাকা পুরনো পলিসি-হিন্ট সরাই, যাতে ভুল স্কেলেটন না আসে
        clearPolicyNavHint();
        // তালিকা-পেজ (হোম, /products, ক্যাটাগরি…) ছেড়ে অন্য পেজে (প্রোডাক্ট/গাইড ইত্যাদি) যাচ্ছি — ব্যাকে একই জায়গায় ফেরার জন্য
        // পজিশন সেভ। প্রোডাক্ট-কার্ড হলে ওই কার্ডটাই নোঙর। নতুন ট্যাব/মডিফায়ার ক্লিকে বর্তমান পেজ বদলায় না, তাই বাদ।
        const plainClick = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey &&
          (!a.target || a.target === '_self') && !a.hasAttribute('download');
        if (plainClick && isListingPath(window.location.pathname) && path !== window.location.pathname) {
          saveScrollPosition(a);
        }
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // পেজ বদলালে (ব্যাক করে গন্তব্যে পৌঁছালে) অনুরোধ থাকলে পজিশন ফেরাই
  useEffect(() => {
    // নেভিগেশন শেষ (URL বদলেছে) — পলিসি-হিন্টের কাজ শেষ
    clearPolicyNavHint();
    restoreScrollIfRequested(); // পলিসি "ফিরে যান" বাটনের অনুরোধ (পতাকা) আগে সামলাই

    if (firstRef.current) { firstRef.current = false; return; }
    if (!isListingPath(pathname)) return;
    const wasPop = Date.now() - popAtRef.current < POP_TTL_MS;
    popAtRef.current = 0;
    if (wasPop) {
      // ব্রাউজারের ব্যাক/জেসচারে তালিকা-পেজে ফিরলাম — সেভ করা জায়গায় ফেরাই (আগে উপরে চলে যেত)
      restoreScrollOnBack();
    } else {
      // নতুন নেভিগেশনে ঢুকলাম — এই পেজের পুরনো সেভ করা পজিশন বাসি, মুছে ফেলি (নতুন ভিজিট উপর থেকে)
      forgetSavedScroll();
    }
  }, [pathname]);

  return null;
}

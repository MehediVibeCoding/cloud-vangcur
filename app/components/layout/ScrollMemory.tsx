'use client';

// ফাইলের পাথ: app/components/layout/ScrollMemory.tsx
// [NEW ব্যাচ ১৪] পলিসি/গ্রাহক-সেবা লিংকে ক্লিকের আগে স্ক্রল-পজিশন সেভ; "ফিরে যান"-এর পর গন্তব্য পেজে ফেরানো।
// কোনো UI নেই। GlobalOverlays-এ একবার বসানো থাকে, তাই ফুটারের বাইরের লিংক (যেমন কার্ট/মডাল) থেকে ঢুকলেও কাজ করে।

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isPolicyPath, restoreScrollIfRequested, saveScrollPosition } from '@/lib/scrollMemory';
import { clearPolicyNavHint, policyBasePath, setPolicyNavHint } from '@/lib/policyNavHint';

export default function ScrollMemory() {
  const pathname = usePathname();

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
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // পেজ বদলালে (ব্যাক করে গন্তব্যে পৌঁছালে) অনুরোধ থাকলে পজিশন ফেরাই
  useEffect(() => {
    // নেভিগেশন শেষ (URL বদলেছে) — পলিসি-হিন্টের কাজ শেষ
    clearPolicyNavHint();
    restoreScrollIfRequested();
  }, [pathname]);

  return null;
}

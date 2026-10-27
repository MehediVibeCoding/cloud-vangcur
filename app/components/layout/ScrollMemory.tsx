'use client';

// ফাইলের পাথ: app/components/layout/ScrollMemory.tsx
// [NEW ব্যাচ ১৪] পলিসি/গ্রাহক-সেবা লিংকে ক্লিকের আগে স্ক্রল-পজিশন সেভ; "ফিরে যান"-এর পর গন্তব্য পেজে ফেরানো।
// কোনো UI নেই। GlobalOverlays-এ একবার বসানো থাকে, তাই ফুটারের বাইরের লিংক (যেমন কার্ট/মডাল) থেকে ঢুকলেও কাজ করে।

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isPolicyPath, restoreScrollIfRequested, saveScrollPosition } from '@/lib/scrollMemory';

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
      if (isPolicyPath(path) && !isPolicyPath(window.location.pathname)) saveScrollPosition();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // পেজ বদলালে (ব্যাক করে গন্তব্যে পৌঁছালে) অনুরোধ থাকলে পজিশন ফেরাই
  useEffect(() => {
    restoreScrollIfRequested();
  }, [pathname]);

  return null;
}

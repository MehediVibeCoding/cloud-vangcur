'use client';

// 🧭 প্রোডাক্ট ও গাইড পেজের (ডিটেইল পেজ) সব ইন-সাইট লিংকে একই ব্যাক-হিস্ট্রি নিয়ম — GlobalOverlays থেকে একবার ডাকা হয়।
//
// ১) ক্লিক: window-capture লিসেনার (ProductNavOverlay-এর document-capture আর React-এর onClick-এর আগে চলে) যেকোনো
//    <a> ধরে। বর্তমান পেজ ও গন্তব্য — দুটোই ডিটেইল পেজ হলে lib/navBack.ts-এর handleVariantClick চলে: আগে-দেখা পেজ →
//    history.go(দূরত্ব) (নতুন এন্ট্রি নয়), নতুন পেজ → সাধারণ push। তাই বর্ণনার টেক্সট-লিংক, কালার-ভেরিয়েন্ট, নিচের
//    রিলেটেড কার্ড, গাইড↔প্রোডাক্ট — সবখানে A↔B ঘুরলে হিস্ট্রিতে প্রতিটা পেজ মাত্র একবার থাকে।
// ২) ব্যাকে ফিরলে: ডিটেইল পেজ থেকে ডিটেইল পেজে (ব্রাউজার ব্যাক/ফরওয়ার্ড/আমাদের লাফ) এলে পেজ একদম উপর থেকে শুরু।
//    ফুটারের পলিসি-লিংক ও তার "ফিরে যান" (lib/scrollMemory.ts) এর আওতায় পড়ে না — ওগুলো ডিটেইল পেজ নয়।
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DETAIL_GROUP, handleVariantClick, isDetailPath, noteCentralHandled } from './navBack';

const POP_FLAG_TTL_MS = 3000;
const TOP_HOLD_MS = 2500;

export function useDetailNavHistory(): void {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  const popRef = useRef(false);
  const popTimerRef = useRef<number | undefined>(undefined);
  const stopHoldRef = useRef<(() => void) | null>(null);

  // ── ১) ক্লিক ──
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const a = target && typeof target.closest === 'function' ? (target.closest('a[href]') as HTMLAnchorElement | null) : null;
      if (!a) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // একই পেজ / #অ্যাঙ্কর — নেভিগেশন নয়
      if (!isDetailPath(window.location.pathname) || !isDetailPath(url.pathname)) return;

      noteCentralHandled(); // একই ক্লিকে কালার-ভেরিয়েন্ট বাটনের পুরনো onClick যেন দ্বিতীয়বার এন্ট্রি না বানায়
      const handled = handleVariantClick(e, DETAIL_GROUP, url.pathname + url.search, (href) => routerRef.current.push(href));
      if (handled) {
        // হিস্ট্রিতে লাফ নিজে সামলেছি — Next.js <Link>-এর নেভিগেশন আটকাও
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, []);

  // ── ২) ব্যাকে ফিরলে একদম উপরে ──
  useEffect(() => {
    const onPop = () => {
      popRef.current = true;
      window.clearTimeout(popTimerRef.current);
      popTimerRef.current = window.setTimeout(() => {
        popRef.current = false;
      }, POP_FLAG_TTL_MS);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.clearTimeout(popTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (prev === null || prev === pathname) return;
    const wasPop = popRef.current;
    popRef.current = false;
    if (!wasPop) return;
    if (!isDetailPath(prev) || !isDetailPath(pathname)) return;

    // ব্রাউজার/Next.js পুরনো স্ক্রল-পজিশন ফেরানোর চেষ্টা করে (পেজ আঁকার পরও) — তাই কিছুক্ষণ উপরে ধরে রাখি;
    // কাস্টমার নিজে স্ক্রল/টাচ করলেই ছেড়ে দিই।
    stopHoldRef.current?.();
    let stopped = false;
    const t0 = performance.now();
    const events = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
    const stop = () => {
      stopped = true;
      events.forEach((ev) => window.removeEventListener(ev, stop));
      stopHoldRef.current = null;
    };
    stopHoldRef.current = stop;
    events.forEach((ev) => window.addEventListener(ev, stop, { passive: true }));
    const tick = () => {
      if (stopped) return;
      if (window.scrollY > 0) window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (performance.now() - t0 > TOP_HOLD_MS) {
        stop();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [pathname]);

  useEffect(() => () => stopHoldRef.current?.(), []);
}

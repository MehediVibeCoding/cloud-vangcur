'use client';

// 🧭 প্রোডাক্ট লিংকে (কার্ড, রিলেটেড, সার্চ — যেকোনো জায়গা) ক্লিক হলে:
//   ১) সঙ্গে সঙ্গে ছোট্ট একটা হিন্ট রাখে (কার্ডে কয়টা ছবি) — lib/productNavHint.ts, যাতে সব স্কেলেটন
//      ঠিক আকৃতির হয়।
//   ২) যদি ১৫০ms পরও নেভিগেশন শেষ না হয় (URL বদলায়নি — অর্থাৎ Next.js এখনো কোনো fallback দেখায়নি),
//      তখন তবেই প্রোডাক্ট-স্কেলেটন ওভারলে দেখায়। পেজ দ্রুত এলে/ক্যাশে থাকলে ওভারলে কখনোই আসে না।
//   ৩) URL বদলালেই (পেজ বা তার নিজস্ব loading এসে গেছে — দুটোতেই একই স্কেলেটন) ওভারলে সরে যায়।
//
// কোনো নেটওয়ার্ক রিকোয়েস্ট/প্রিফেচ করে না। ব্যর্থ নেভিগেশনে ৮ সেকেন্ড পর নিজে থেকেই সরে যায়।
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { setProductNavHint, clearProductNavHint } from '@/lib/productNavHint';
import ProductDetailSkeleton from '@/app/components/product/ProductDetailSkeleton';

const OVERLAY_DELAY_MS = 150;
const OVERLAY_MAX_MS = 8000;

export default function ProductNavOverlay() {
  const pathname = usePathname();
  const [overlay, setOverlay] = useState<{ imgCount: number | null } | null>(null);
  const fromPathRef = useRef<string | null>(null);
  const delayTimerRef = useRef<number | undefined>(undefined);
  const maxTimerRef = useRef<number | undefined>(undefined);

  const hide = useCallback(() => {
    window.clearTimeout(delayTimerRef.current);
    window.clearTimeout(maxTimerRef.current);
    fromPathRef.current = null;
    setOverlay(null);
  }, []);

  // নেভিগেশন শেষ (URL বদলেছে) → ওভারলে সরাও
  useEffect(() => {
    if (fromPathRef.current !== null && pathname !== fromPathRef.current) hide();
  }, [pathname, hide]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // নতুন ট্যাব/মডিফায়ার/ডান-ক্লিক হলে সাধারণ নেভিগেশন নয় — কিছু করার দরকার নেই
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const a =
        target && typeof target.closest === 'function'
          ? (target.closest('a[href^="/product/"]') as HTMLAnchorElement | null)
          : null;
      if (!a) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;

      const fromPath = window.location.pathname;
      // নিজের পেজের লিংকে ক্লিক — নেভিগেশন হবে না, ওভারলে আটকে যাবে — তাই বাদ
      if (a.pathname === fromPath) return;

      // কার্ড নিজের ছবির সংখ্যা data-product-imgs এ জানায় (ProductCard); অন্য জায়গায় অজানা (null)
      const holder = a.closest('[data-product-imgs]') as HTMLElement | null;
      const n = holder ? parseInt(holder.dataset.productImgs || '', 10) : NaN;
      const imgCount = Number.isFinite(n) && n > 0 ? n : null;

      setProductNavHint(imgCount, fromPath);
      fromPathRef.current = fromPath;
      window.clearTimeout(delayTimerRef.current);
      window.clearTimeout(maxTimerRef.current);
      delayTimerRef.current = window.setTimeout(() => {
        // ১৫০ms পরও URL একই = নেভিগেশন এখনো চলছে এবং Next.js কিছু দেখায়নি → আমাদের স্কেলেটন
        if (window.location.pathname !== fromPathRef.current) return;
        setOverlay({ imgCount });
        maxTimerRef.current = window.setTimeout(() => {
          clearProductNavHint();
          hide();
        }, OVERLAY_MAX_MS);
      }, OVERLAY_DELAY_MS);
    };
    const onPop = () => hide(); // ব্যাক/ফরওয়ার্ড চাপলে আটকে থাকা ওভারলে সরাও

    // capture=true: Next.js <Link> এর নিজের onClick (router.push) এর আগেই চলবে
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPop);
      window.clearTimeout(delayTimerRef.current);
      window.clearTimeout(maxTimerRef.current);
    };
  }, [hide]);

  if (!overlay) return null;
  return (
    <div
      className="fixed inset-0 z-[950] overflow-y-auto overscroll-contain bg-white dark:bg-[#0B111E]"
      data-product-nav-overlay=""
    >
      <ProductDetailSkeleton imgCount={overlay.imgCount} />
    </div>
  );
}

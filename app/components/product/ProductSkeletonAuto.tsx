'use client';

// ক্লিকের সময় রাখা হিন্ট (কার্ডের ছবির সংখ্যা ও তথ্য) থেকে সঠিক আকৃতির প্রোডাক্ট-স্কেলেটন/প্রিভিউ বসায়। দুই রূপ:
//
// • overlay (ProductNavOverlay): পুরনো পেজের ওপর ভিউপোর্টে আটকানো (fixed inset-0) — পেছনের পেজ ঢাকতে এটা দরকার।
//   নিজের স্ক্রল-বক্স থাকে; ভেতরের স্ক্রল-অবস্থান lib/productSkeletonScroll.ts-এ জমা থাকে।
// • flow (loading.tsx, app/loading.tsx): ডকুমেন্টের স্বাভাবিক ফ্লোতে, আসল পেজ যেখানে বসবে ঠিক সেখানে। স্কেলেটন আর আসল
//   পেজ একই ডকুমেন্ট-স্ক্রলে থাকে, তাই কন্টেন্ট এলে স্ক্রল-অবস্থান বদলায় না (উপরে লাফ নেই)।
//   বসার মুহূর্তে একবার স্ক্রল ঠিক করা হয়: ওভারলে থেকে আসা অবস্থান, না থাকলে একদম উপরে — Next.js পুরনো পেজের
//   স্ক্রল ধরে রেখে ছোট ডকুমেন্টের শেষে ক্ল্যাম্প করলে যে স্কেলেটন নিচের অংশ দেখাত (নেভবার/ছবি ছাড়া), সেটা ঠেকাতে।
// 🎨 overlay-এর ব্যাকগ্রাউন্ড: পেছনের পেজ ঢাকতে অস্বচ্ছ থাকতেই হয়, তাই সাইটের ট্রাই-কালার গ্রেডিয়েন্ট নিজেই আঁকে।
// z-[950]: নেভবার (z-[900]) ও ফ্লোটিং বাটনের উপরে, মোডাল/ড্রয়ারের (z-[1100]+) নিচে।
import { useEffect, useLayoutEffect } from 'react';
import { useProductNavHint } from '@/lib/productNavHint';
import {
  markOverlayEnd, markOverlayScroll, markOverlayStart, takeOverlayScrollTop,
} from '@/lib/productSkeletonScroll';
import ProductDetailSkeleton from './ProductDetailSkeleton';

interface Props {
  /** `overlay` = পুরনো পেজের ওপর ফিক্সড (ডিফল্ট), `flow` = ডকুমেন্টের ফ্লোতে */
  mode?: 'overlay' | 'flow';
}

export default function ProductSkeletonAuto({ mode = 'overlay' }: Props) {
  const hint = useProductNavHint();

  useEffect(() => {
    if (mode !== 'overlay') return undefined;
    markOverlayStart();
    return () => markOverlayEnd();
  }, [mode]);

  useLayoutEffect(() => {
    if (mode !== 'flow') return;
    const top = takeOverlayScrollTop();
    try {
      window.scrollTo({ top, left: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      window.scrollTo(0, top);
    }
  }, [mode]);

  if (mode === 'flow') {
    return (
      <div data-product-skeleton="">
        <ProductDetailSkeleton imgCount={hint?.imgCount} product={hint?.product} />
      </div>
    );
  }

  return (
    <div
      onScroll={(e) => markOverlayScroll(e.currentTarget.scrollTop)}
      className="fixed inset-0 z-[950] overflow-y-auto overscroll-contain bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white dark:from-[#090D16] dark:via-[#0F172A] dark:to-[#0B0F19]"
      data-product-skeleton=""
    >
      <ProductDetailSkeleton imgCount={hint?.imgCount} product={hint?.product} />
    </div>
  );
}

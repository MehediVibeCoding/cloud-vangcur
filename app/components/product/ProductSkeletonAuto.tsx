'use client';

// ক্লিকের সময় রাখা হিন্ট (কার্ডের ছবির সংখ্যা ও তথ্য) থেকে সঠিক আকৃতির প্রোডাক্ট-স্কেলেটন/প্রিভিউ বসায়।
//
// 📌 ভিউপোর্টে আটকানো (fixed inset-0): রুট-লেভেল fallback হিসেবে এটা বসলে Next.js পুরনো পেজের স্ক্রল-পজিশন
// ধরে রাখে এবং ছোট স্কেলেটন-ডকুমেন্টের শেষ পর্যন্ত স্ক্রল ক্ল্যাম্প করে — ফলে স্কেলেটন নিচের অংশ দেখিয়ে
// (নেভবার/ছবি ছাড়া) আসত। fixed হলে ডকুমেন্টের স্ক্রলের সাথে কোনো সম্পর্ক নেই, সবসময় উপর থেকে দেখায়।
// z-[950]: নেভবার (z-[900]) ও ফ্লোটিং বাটনের উপরে, মোডাল/ড্রয়ারের (z-[1100]+) নিচে।
import { useProductNavHint } from '@/lib/productNavHint';
import ProductDetailSkeleton from './ProductDetailSkeleton';

export default function ProductSkeletonAuto() {
  const hint = useProductNavHint();
  return (
    <div
      className="fixed inset-0 z-[950] overflow-y-auto overscroll-contain bg-white dark:bg-[#0B111E]"
      data-product-skeleton=""
    >
      <ProductDetailSkeleton imgCount={hint?.imgCount} product={hint?.product} />
    </div>
  );
}

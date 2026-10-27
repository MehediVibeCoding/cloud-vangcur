'use client';

// GitHub পাথ: app/loading.tsx
//
// রুট-লেভেল fallback। আগে এটা সবসময় হোমপেজের স্কেলেটন দেখাত — ফলে কার্ডে ট্যাপ করলে (প্রোডাক্ট পেজের নিজস্ব
// loading.tsx প্রিফেচ না থাকলে) প্রোডাক্টের বদলে হোমের গ্রিড-স্কেলেটন ভেসে উঠত।
// এখন গন্তব্য /product/... হলে (অথবা কার্ড-ক্লিকের হিন্ট থাকলে) প্রোডাক্ট-স্কেলেটন দেখানো হয়;
// [NEW] গন্তব্য পলিসি/গ্রাহক-সেবা পেজ (/guide, /shipping, /warranty, /refund-policy, /privacy-policy, /terms) হলে
// (অথবা ফুটার-লিংক ক্লিকের হিন্ট থাকলে) সেই পেজেরই স্কেলেটন দেখানো হয় — হোমের গ্রিড নয়;
// বাকি সব রুটে আগের মতোই হোম স্কেলেটন।
import type { ComponentType } from 'react';
import { usePathname } from 'next/navigation';
import SkeletonNavbar from '@/app/components/ui/SkeletonNavbar';
import ProductSkeletonAuto from '@/app/components/product/ProductSkeletonAuto';
import { useProductNavHint } from '@/lib/productNavHint';
import { policyBasePath, usePolicyNavHint } from '@/lib/policyNavHint';
import GuideLoading from '@/app/(policies)/guide/loading';
import ShippingLoading from '@/app/(policies)/shipping/loading';
import WarrantyLoading from '@/app/(policies)/warranty/loading';
import RefundPolicyLoading from '@/app/(policies)/refund-policy/loading';
import PrivacyPolicyLoading from '@/app/(policies)/privacy-policy/loading';
import TermsLoading from '@/app/(policies)/terms/loading';
import PolicyLoading from '@/app/(policies)/loading';

const POLICY_SKELETONS: Record<string, ComponentType> = {
  '/guide': GuideLoading,
  '/shipping': ShippingLoading,
  '/warranty': WarrantyLoading,
  '/refund-policy': RefundPolicyLoading,
  '/privacy-policy': PrivacyPolicyLoading,
  '/terms': TermsLoading,
};

export default function RootLoading() {
  const pathname = usePathname();
  const hint = useProductNavHint();
  const policyHint = usePolicyNavHint();
  const goingToProduct =
    (pathname ? pathname.startsWith('/product/') : false) ||
    // নিরাপত্তা-জাল: ফলব্যাকে pathname পুরনোটা এলেও (ক্লিকের আগের পাথ) হিন্ট থাকলে প্রোডাক্ট-স্কেলেটন
    (hint !== null && pathname === hint.fromPath);
  if (goingToProduct) return <ProductSkeletonAuto />;

  // পলিসি পেজ: pathname গন্তব্য হলে সেটাই; পুরনো থাকলে ফুটার-লিংকের হিন্ট (একই নিরাপত্তা-জাল)
  const policyDest =
    policyBasePath(pathname) ?? (policyHint !== null && pathname === policyHint.fromPath ? policyHint.to : null);
  if (policyDest) return <PolicyFallback dest={policyDest} />;

  return <HomeLoading />;
}

// (policies)/layout.tsx-এর চেহারা (গ্রেডিয়েন্ট + নেভবার + ৮৪০px কলাম) — ভেতরে সেই পেজের নিজস্ব স্কেলেটন,
// তাই আসল পেজ এলে নেভবার/কলাম নড়ে না।
function PolicyFallback({ dest }: { dest: string }) {
  const Skeleton = POLICY_SKELETONS[dest] ?? PolicyLoading;
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-brand-bg/35 via-[#DCEBFD]/45 to-white">
      <div className="relative z-10">
        <SkeletonNavbar sticky={false} />
        <main className="mx-auto w-full max-w-[840px] px-4 pb-16 pt-3.5 sm:px-6 sm:pt-5">
          <Skeleton />
        </main>
      </div>
    </div>
  );
}

function HomeLoading() {
  return (
    <div className="min-h-screen bg-transparent">
      {/* ================= Navbar: আসল নেভবার (ব্যাচ ২) ================= */}
      <SkeletonNavbar />

      {/* ================= Hero Slider Skeleton ================= */}
      <div className="relative mx-auto max-w-[1300px] bg-transparent px-3.5 pt-3.5 sm:px-5 2xl:max-w-[1560px]">
        <div className="relative w-full overflow-hidden">
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-[9/16] w-[calc((100%-12px)/2)] min-h-[220px] shrink-0 animate-pulse rounded-[14px] bg-brand-bg/40 shadow-[0_4px_16px_rgba(0,0,0,.08)] sm:min-h-[280px] md:w-[calc((100%-60px)/6)]"
              />
            ))}
          </div>
        </div>
      </div>

      {/* ================= TrustStrip Skeleton (আগে বাদ পড়েছিল) ================= */}
      <div className="mx-auto mb-[26px] mt-4 max-w-[1300px] px-5">
        <div className="grid grid-cols-3 gap-x-2 gap-y-0 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sh1 backdrop-blur-[10px] md:grid-cols-5 md:gap-x-4 md:px-7 md:py-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex items-center gap-2 ${i > 3 ? 'hidden md:flex' : ''}`}>
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-brand-bg/50 md:h-10 md:w-10" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-2.5 w-4/5 animate-pulse rounded bg-brand-bg/50" />
                <div className="h-2 w-3/5 animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= Categories Carousel Skeleton ================= */}
      <div className="mx-auto mb-11 min-h-[140px] max-w-[1300px] overflow-hidden px-3.5 sm:px-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-[26px] w-36 animate-pulse rounded-md bg-brand-bg/50 sm:h-7" />
        </div>

        <div className="relative px-8 sm:px-[38px] md:px-[44px]">
          <div className="absolute left-0 top-1/2 h-8 w-8 -translate-y-1/2 animate-pulse rounded-full border-2 border-border-base bg-white md:h-9 md:w-9" />

          <div className="grid grid-cols-2 gap-2 py-1 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className={`flex min-h-[58px] items-center gap-2 rounded-2xl border-[1.5px] border-border-base bg-white p-2 shadow-xs md:min-h-[66px] md:gap-3 md:p-3 ${i > 4 ? 'hidden md:flex' : ''}`}
              >
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-brand-bg/50 md:h-12 md:w-12" />
                <div className="h-3.5 w-14 animate-pulse rounded bg-surface-muted" />
              </div>
            ))}
          </div>

          <div className="absolute right-0 top-1/2 h-8 w-8 -translate-y-1/2 animate-pulse rounded-full border-2 border-border-base bg-white md:h-9 md:w-9" />
        </div>

        <div className="mt-3.5 flex justify-center gap-1.5">
          <div className="h-1.5 w-5 animate-pulse rounded-full bg-brand-bg/50" />
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-bg/40" />
        </div>
      </div>

      {/* ================= Product Grid Skeleton ================= */}
      <div className="mx-auto mb-11 min-h-[400px] max-w-[1300px] px-5 scroll-mt-20 sm:scroll-mt-24">
        <div className="mb-5 flex items-center justify-between">
          <div className="h-6 w-40 animate-pulse rounded-md bg-brand-bg/50" />
          <div className="h-4 w-20 animate-pulse rounded bg-surface-muted" />
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-[18px] bg-white p-1 shadow-[0_4px_14px_rgba(0,88,199,.12)]">
              <div className="relative aspect-[0.57] animate-pulse overflow-hidden rounded-[14px] bg-brand-bg/30">
                {/* wishlist heart placeholder */}
                <div className="absolute right-[4.5%] top-[4.5%] h-7 w-7 rounded-full bg-white/30 sm:h-8 sm:w-8" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-2 sm:p-3">
                  <div className="h-3 w-4/5 rounded bg-white/60 sm:h-3.5" />
                  <div className="h-2 w-1/3 rounded bg-white/40" />
                  <div className="mt-0.5 h-4 w-2/5 rounded bg-white/70 sm:h-5" />
                  <div className="mt-1 flex items-center gap-1 sm:mt-1.5">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-white/40 sm:h-9 sm:w-9 lg:h-10 lg:w-10" />
                    <div className="h-8 flex-1 rounded-full bg-white/50 sm:h-9 lg:h-10" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

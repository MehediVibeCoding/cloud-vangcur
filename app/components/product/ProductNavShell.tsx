'use client';
// ফাইলের পাথ: app/components/product/ProductNavShell.tsx (নতুন ফাইল)
//
// কেন: কার্ডে প্রিফেচ বন্ধ থাকায় ক্লিকের পর আসল পেজ আসতে নেটওয়ার্ক-সময় লাগে, আর Next.js সেই
// সময়ে পুরনো পেজই দেখায় (loading.tsx তখনও দেখা যায় না)। তাই ক্লিকের সাথে সাথেই এই ফুল-স্ক্রিন
// শেল দেখানো হয় — কার্ডের নাম/দাম/ছবি সহ, বাকিটা স্কেলিটন। আসল পেজ পৌঁছালে (pathname মিললে) শেল সরে যায়।
//
// 🛡️ নিরাপত্তা-জাল (কখনো আটকে থাকবে না):
//  • সর্বোচ্চ MAX_WAIT_MS পরে নিজে থেকেই সরে যায় • ব্যাক/ফরওয়ার্ড (popstate) এ সরে যায়
//  • শুধু সাধারণ বাঁ-ক্লিকে চালু (Ctrl/Cmd/Shift/মিডল-ক্লিক = নতুন ট্যাব, তখন শেল নেই) — ProductCard এ দেখুন
//  • lib/store/productSeedStore.ts এর OPTIMISTIC_PRODUCT_SHELL_ENABLED=false করলে পুরো ফিচার বন্ধ
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  useProductSeedStore,
  OPTIMISTIC_PRODUCT_SHELL_ENABLED,
  type ProductSeed,
} from '@/lib/store/productSeedStore';
import {
  WishlistIconSkeleton,
  CartIconSkeleton,
  TrackIconSkeleton,
  SearchIconSkeleton,
} from '@/app/components/ui/Skeletons';

const MAX_WAIT_MS = 6000;

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// ⚠️ লেআউট app/product/[slug]/loading.tsx এর সাথে হুবহু মেলানো (ছবি/টাইটেল/দাম বাদে) — যাতে
// শেল থেকে আসল পেজে গেলে লাফ না দেয়। loading.tsx বদলালে এখানেও মিলিয়ে নিন।
function ProductShell({ seed }: { seed: ProductSeed }) {
  const hasImg = !!seed.img && /^https?:\/\//.test(seed.img);
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white">
      <div className="mx-2 mb-1.5 mt-[14px] max-[400px]:mx-1.5 sm:mx-3">
        <div className="navbar-glass relative rounded-[35px] border border-white/70 bg-white/80 shadow-sh1 backdrop-blur-[10px]">
          <div className="mx-auto flex h-[62px] max-w-[1300px] items-center gap-[14px] px-3 max-[400px]:gap-2 sm:px-5 2xl:max-w-[1560px]">
            <div className="flex w-full items-center justify-between gap-2 max-[400px]:gap-1.5 sm:gap-3">
              <div className="flex shrink-0 items-center gap-1.5 min-[420px]:gap-2 rounded-full border border-border-base/70 bg-white/80 py-1.5 pl-2 pr-3 shadow-xs max-[400px]:pr-2 max-[400px]:pl-1.5 min-[420px]:pr-3.5">
                <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-brand-light/40" />
                <div className="hidden h-3.5 w-16 animate-pulse rounded bg-brand-bg/50 min-[420px]:block" />
                <div className="h-3.5 w-9 animate-pulse rounded bg-brand-bg/50 min-[420px]:hidden" />
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="hidden h-10 animate-pulse rounded-full bg-brand-bg/30 md:block md:w-[240px] lg:w-[300px]" />
                <div className="flex items-center gap-1.5">
                  <div className="flex h-9 w-9 items-center justify-center"><WishlistIconSkeleton /></div>
                  <div className="flex h-9 w-9 items-center justify-center"><CartIconSkeleton /></div>
                  <div className="h-9 w-[74px] animate-pulse rounded-full bg-brand-light/30 sm:w-20" />
                  <div className="hidden h-9 w-9 items-center justify-center min-[401px]:flex"><TrackIconSkeleton /></div>
                  <div className="flex h-9 w-9 items-center justify-center md:hidden"><SearchIconSkeleton /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-4 pb-6 pt-3.5 md:grid-cols-2 md:px-8 md:pb-10">
        <div>
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[14px] border border-border-base bg-white shadow-sh1">
            {hasImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seed.img}
                alt={seed.name}
                draggable={false}
                decoding="async"
                className="block h-full w-full select-none object-contain"
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-brand-bg/30" />
            )}
          </div>
          <div className="mt-4 flex justify-center gap-1.5">
            <div className="h-1.5 w-6 animate-pulse rounded-full bg-brand-light/40" />
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-border-base" />
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-border-base" />
          </div>
          <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 w-16 shrink-0 animate-pulse rounded-[10px] border-[1.5px] border-border-base bg-brand-bg/25 p-1" />
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <h1 className="mb-3 font-body text-[21px] font-bold leading-snug text-ink sm:text-2xl">{seed.name}</h1>

          <div className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="font-body text-[28px] font-bold text-brand-light sm:text-[32px]">৳{seed.price.toLocaleString('en-US')}</span>
            {seed.old && seed.old > seed.price ? (
              <span className="text-[15px] text-muted line-through">৳{seed.old.toLocaleString('en-US')}</span>
            ) : null}
          </div>

          <div className="mb-3 h-4 w-44 animate-pulse rounded bg-surface-muted" />
          <div className="mb-5 h-11 w-full animate-pulse rounded-[10px] border border-success/30 bg-success/10" />

          <div className="mb-5">
            <div className="mb-2.5 h-2.5 w-36 animate-pulse rounded bg-surface-muted" />
            <div className="flex flex-wrap gap-2">
              <div className="h-7 w-24 animate-pulse rounded-full bg-brand-bg/35" />
              <div className="h-7 w-32 animate-pulse rounded-full bg-brand-bg/35" />
              <div className="h-7 w-28 animate-pulse rounded-full bg-brand-bg/35" />
              <div className="h-7 w-20 animate-pulse rounded-full bg-brand-bg/35" />
            </div>
          </div>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-9 w-[108px] animate-pulse rounded-full bg-brand-bg/35" />
            <div className="ml-auto flex items-center gap-1">
              <div className="h-9 w-9 animate-pulse rounded-[10px] bg-brand-bg/35" />
              <div className="h-9 w-9 animate-pulse rounded-[10px] bg-[#25D366]/30" />
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2.5">
            <div className="h-[50px] w-full animate-pulse rounded-[14px] border-[1.5px] border-brand-light/30 bg-brand-bg/25" />
            <div className="h-[50px] w-full animate-pulse rounded-[14px] bg-brand-light/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductNavShell() {
  const pending = useProductSeedStore((s) => s.pending);
  const clear = useProductSeedStore((s) => s.clear);
  const pathname = usePathname();

  // আসল পেজ পৌঁছেছে → শেল সরাও
  useEffect(() => {
    if (!pending) return;
    if (pathname === pending.href || safeDecode(pathname) === safeDecode(pending.href)) clear();
  }, [pathname, pending, clear]);

  // নিরাপত্তা-জাল: টাইমআউট ও ব্যাক/ফরওয়ার্ড
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(clear, MAX_WAIT_MS);
    const onPop = () => clear();
    window.addEventListener('popstate', onPop);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('popstate', onPop);
    };
  }, [pending, clear]);

  if (!OPTIMISTIC_PRODUCT_SHELL_ENABLED || !pending) return null;

  return (
    <div
      className="fixed inset-0 z-[890] overflow-y-auto overscroll-contain bg-white"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <ProductShell seed={pending} />
    </div>
  );
}

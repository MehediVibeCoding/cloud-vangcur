import { OrderListSkeleton } from '@/app/components/ui/Skeletons';

// অ্যাকাউন্ট পেজের মূল অংশের স্কেলেটন (শিরোনাম + ২-কলাম ড্যাশবোর্ড)।
// দুই জায়গায় ব্যবহার হয়: app/account/loading.tsx এবং AccountClient (লগইন-স্টেট হাইড্রেট হওয়ার আগে —
// তখন সার্ভারের HTML-এ "লগইন করুন" কার্ড না দেখিয়ে এই স্কেলেটন দেখানো হয়, যাতে লগইন করা ইউজার ভুল স্টেট না দেখে)।
// markup আগের loading.tsx-এর ভেতরের অংশ থেকে হুবহু সরানো।
export default function AccountMainSkeleton() {
  return (
    <>
      {/* Header Title — শিরোনাম + শুভেচ্ছা লাইন + সময়/তারিখ লাইন (৩ লাইন, আগে ৩য়টা মিসিং ছিল) */}
      <div className="mb-6 text-center">
        <div className="mx-auto h-6 w-48 animate-pulse rounded-lg bg-brand-bg/60 sm:h-7" />
        <div className="mx-auto mt-1.5 h-3.5 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="mx-auto mt-1 h-3 w-32 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        {/* Left Column Skeleton */}
        <div className="flex flex-col gap-4">
          {/* Weather/Celestial Card — আসলটার সাথে মিলিয়ে minHeight:280px + shadow-sh2 */}
          <div className="w-full animate-pulse rounded-[24px] bg-brand-bg/40 shadow-sh2" style={{ minHeight: 280 }} />

          {/* ৩টা স্ট্যাট চিপ — আসলটার মতো সাদা ফ্রস্টেড-গ্লাস কার্ড (flat gray না) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="h-[68px] animate-pulse rounded-[20px] border border-white/80 bg-white/85 shadow-xs" />
            <div className="h-[68px] animate-pulse rounded-[20px] border border-white/80 bg-white/85 shadow-xs" />
            <div className="h-[68px] animate-pulse rounded-[20px] border border-white/80 bg-white/85 shadow-xs" />
          </div>

          {/* ভাষা উইজেট — radius 22px, border+shadow-xs সহ */}
          <div className="h-[108px] w-full animate-pulse rounded-[22px] border border-white/80 bg-white/85 shadow-xs" />
        </div>

        {/* Right Column Skeleton */}
        <div className="flex flex-col gap-4">
          <div className="mb-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-brand-light/40" />
              <div className="h-4 w-32 animate-pulse rounded bg-brand-bg/50" />
            </div>
            <div className="h-3.5 w-16 animate-pulse rounded bg-surface-muted" />
          </div>

          <div className="rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-xs backdrop-blur-md">
            <OrderListSkeleton count={2} />
          </div>
        </div>
      </div>
    </>
  );
}

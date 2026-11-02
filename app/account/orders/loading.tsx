// GitHub পাথ: app/account/orders/loading.tsx — পুরো ফাইলটা এটা দিয়ে replace করবে
import { OrderListSkeleton, WishlistIconSkeleton, CartIconSkeleton, TrackIconSkeleton, SearchIconSkeleton } from '@/app/components/ui/Skeletons';

export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white">
      {/* ================= Navbar Skeleton (showHomeButton, track-order আইকনসহ) ================= */}
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

      {/* ================= শিরোনাম + স্ট্যাটাস ব্যাজ ================= */}
      <div className="mx-auto w-full max-w-[760px] px-5 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="h-6 w-44 animate-pulse rounded-lg bg-brand-bg/60" />
          <div className="flex gap-2">
            <div className="h-6 w-[74px] animate-pulse rounded-full border border-border-base bg-white/80" />
            <div className="h-6 w-[74px] animate-pulse rounded-full border border-border-base bg-white/80" />
            <div className="h-6 w-[74px] animate-pulse rounded-full border border-border-base bg-white/80" />
          </div>
        </div>

        {/* সার্চ বার */}
        <div className="mb-5 h-[42px] w-full animate-pulse rounded-full border border-border-base bg-white" />

        {/* অর্ডার কার্ড — আসল পেজের মতোই সাদা রাউন্ডেড কার্ড-র‍্যাপারের ভেতরে, OrderCard-এর সাথে হুবহু মিলিয়ে */}
        <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-xs backdrop-blur-md">
          <OrderListSkeleton />
        </div>
      </div>
    </div>
  );
}

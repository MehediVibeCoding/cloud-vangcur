// GitHub পাথ: app/track-order/loading.tsx — পুরো ফাইলটা এটা দিয়ে replace করবে
import { OrderListSkeleton, WishlistIconSkeleton, CartIconSkeleton, SearchIconSkeleton } from '@/app/components/ui/Skeletons';

export default function TrackLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white">
      {/* ================= Navbar Skeleton (showHomeButton, ট্র্যাক আইকন ছাড়া) ================= */}
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
                  <div className="flex h-9 w-9 items-center justify-center md:hidden"><SearchIconSkeleton /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= শিরোনাম + সাবটাইটেল + কার্ড ================= */}
      <div className="mx-auto w-full max-w-[520px] px-5 pb-16 pt-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 h-10 w-10 animate-pulse rounded-full bg-brand-light/50" />
          <div className="mx-auto mb-1.5 h-6 w-52 animate-pulse rounded-lg bg-brand-bg/60" />
          <div className="mx-auto h-3.5 w-full max-w-[320px] animate-pulse rounded bg-surface-muted" />
        </div>

        <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-sh2 backdrop-blur-md">
          <OrderListSkeleton count={2} />
        </div>
      </div>
    </div>
  );
}

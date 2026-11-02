// GitHub পাথ: app/checkout/loading.tsx — পুরো ফাইলটা এটা দিয়ে replace করবে
import { DesktopBackdrop } from '@/app/components/ui/DesktopBackdrop';

export default function CheckoutLoading() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#EFF6FE] lg:bg-transparent lg:py-10">
      <DesktopBackdrop />
      <div className="relative z-10 mx-auto min-h-dvh w-full max-w-[640px] overflow-hidden bg-[#EFF6FE] sm:my-6 sm:min-h-0 sm:rounded-[22px] sm:shadow-sh3 sm:ring-1 sm:ring-border-base lg:min-h-0 lg:max-w-[580px] lg:rounded-[22px] lg:shadow-sh3 lg:ring-1 lg:ring-border-base">
        {/* ================= হেডার (গ্র্যাডিয়েন্ট + লক আইকন) ================= */}
        <div className="rounded-t-[20px] bg-gradient-to-br from-[#90C8FA] to-[#72B2F5] px-5 pb-3.5 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/70" />
              <div className="h-4 w-28 animate-pulse rounded-full bg-white/50" />
            </div>
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full border border-white/60 bg-white/35" />
          </div>
        </div>

        {/* ================= ৩-ধাপের স্টেপার ================= */}
        <div className="flex px-6 pb-2.5 pt-[13px]">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-[3px]">
              <div className="h-6 w-6 animate-pulse rounded-full border-[1.5px] border-info/40 bg-white" />
              <div className="h-2.5 w-10 animate-pulse rounded bg-surface-muted" />
            </div>
          ))}
        </div>

        {/* ================= প্রোগ্রেস বার ================= */}
        <div className="px-6 pb-1.5 pt-1.5">
          <div className="mb-[5px] h-[5px] overflow-hidden rounded-full bg-info/10">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-info/50" />
          </div>
          <div className="flex justify-end">
            <div className="h-2.5 w-24 animate-pulse rounded bg-info/20" />
          </div>
        </div>

        {/* ================= ফর্ম (ধাপ ১: তথ্য) ================= */}
        <div className="px-6 py-5">
          {/* পূর্ণ নাম */}
          <div className="mb-[15px] space-y-1.5">
            <div className="h-2.5 w-16 animate-pulse rounded bg-surface-muted" />
            <div className="h-11 w-full animate-pulse rounded-[12px] bg-brand-bg/20" />
          </div>
          {/* ফোন নম্বর */}
          <div className="mb-[15px] space-y-1.5">
            <div className="h-2.5 w-32 animate-pulse rounded bg-surface-muted" />
            <div className="h-11 w-full animate-pulse rounded-[12px] bg-brand-bg/20" />
          </div>
          {/* জেলা (select) */}
          <div className="mb-[15px] space-y-1.5">
            <div className="h-2.5 w-14 animate-pulse rounded bg-surface-muted" />
            <div className="h-11 w-full animate-pulse rounded-[12px] bg-brand-bg/20" />
          </div>
          {/* সম্পূর্ণ ঠিকানা (textarea, ৩ লাইন) */}
          <div className="mb-[15px] space-y-1.5">
            <div className="h-2.5 w-40 animate-pulse rounded bg-surface-muted" />
            <div className="h-[76px] w-full animate-pulse rounded-[12px] bg-brand-bg/20" />
          </div>
          {/* ইমেইল */}
          <div className="mb-[15px] space-y-1.5">
            <div className="h-2.5 w-44 animate-pulse rounded bg-surface-muted" />
            <div className="h-11 w-full animate-pulse rounded-[12px] bg-brand-bg/20" />
          </div>
          {/* শিপিং অপশন কার্ড */}
          <div className="mb-[15px] space-y-1.5">
            <div className="h-2.5 w-14 animate-pulse rounded bg-surface-muted" />
            <div className="flex flex-col gap-[9px]">
              <div className="h-[54px] w-full animate-pulse rounded-[10px] border-[1.5px] border-border-base bg-white" />
              <div className="h-[54px] w-full animate-pulse rounded-[10px] border-[1.5px] border-border-base bg-white" />
            </div>
          </div>

          {/* পরবর্তী ধাপ বাটন */}
          <div className="pt-3.5">
            <div className="h-12 w-full animate-pulse rounded-full bg-brand-light/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

// GitHub পাথ: app/reset-password/loading.tsx — নতুন ফাইল হিসেবে যোগ করবে
import { DesktopBackdrop } from '@/app/components/ui/DesktopBackdrop';

export default function ResetPasswordLoading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-4 lg:bg-none">
      <DesktopBackdrop />
      <div className="relative z-10 w-full max-w-[400px] overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white shadow-sh3 lg:shadow-[0_0_0_6px_#fff,0_0_0_7px_rgba(68,167,252,0.16),0_30px_70px_-24px_rgba(0,88,199,0.32)] dark:lg:shadow-[0_0_0_6px_rgba(255,255,255,0.07),0_0_0_7px_rgba(68,167,252,0.14),0_30px_70px_-24px_rgba(0,0,0,0.6)] lg:ring-0">
        {/* ================= হেডার (শিরোনাম + সাবটাইটেল) ================= */}
        <div className="relative overflow-hidden px-7 pb-5 pt-8 text-center">
          <div className="mx-auto mb-2.5 h-[21px] w-[220px] max-w-full animate-pulse rounded-lg bg-white/70" />
          <div className="mx-auto h-3 w-[260px] max-w-full animate-pulse rounded bg-white/50" />
        </div>

        {/* ================= ফর্ম (নতুন পাসওয়ার্ড + কনফার্ম পাসওয়ার্ড) ================= */}
        <div className="px-7 pb-8 pt-2">
          <div className="flex flex-col gap-3.5">
            {/* নতুন পাসওয়ার্ড */}
            <div>
              <div className="mb-1.5 h-[13px] w-28 animate-pulse rounded bg-surface-muted" />
              <div className="h-[46px] w-full animate-pulse rounded-full bg-brand-bg/25" />
            </div>
            {/* পাসওয়ার্ড আবার লিখুন */}
            <div>
              <div className="mb-1.5 h-[13px] w-36 animate-pulse rounded bg-surface-muted" />
              <div className="h-[46px] w-full animate-pulse rounded-full bg-brand-bg/25" />
            </div>
            {/* সাবমিট বাটন */}
            <div className="mt-1 h-[46px] w-full animate-pulse rounded-full bg-brand-light/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

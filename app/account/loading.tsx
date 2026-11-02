// GitHub পাথ: app/account/loading.tsx — পুরো ফাইলটা এটা দিয়ে replace করবে
import AccountMainSkeleton from './AccountMainSkeleton';
import { WishlistIconSkeleton, CartIconSkeleton, CrownIconSkeleton, TrackIconSkeleton, BellIconSkeleton } from '@/app/components/ui/Skeletons';

export default function AccountLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white">
      {/* Navbar Skeleton */}
      <div className="sticky top-[14px] z-[900] mx-2 mb-1.5 mt-[14px] max-[400px]:mx-1.5 sm:mx-3">
        <div className="navbar-glass relative rounded-[35px] border border-white/70 bg-white/80 shadow-sh1 backdrop-blur-[10px]">
          <div className="mx-auto flex h-[62px] max-w-[1300px] items-center gap-[14px] px-3 max-[400px]:gap-2 sm:px-5 2xl:max-w-[1560px]">
            <div className="flex w-full items-center justify-between gap-2 max-[400px]:gap-1.5 sm:gap-3">
              <div className="flex shrink-0 items-center gap-1.5 min-[420px]:gap-2 rounded-full border border-border-base/70 bg-white/80 py-1.5 pl-2 pr-3 shadow-xs max-[400px]:pr-2 max-[400px]:pl-1.5 min-[420px]:pr-3.5">
                <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-brand-light/40" />
                <div className="hidden h-3.5 w-16 animate-pulse rounded bg-brand-bg/50 min-[420px]:block" />
                <div className="h-3.5 w-9 animate-pulse rounded bg-brand-bg/50 min-[420px]:hidden" />
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                {/* ডেস্কটপ: লেবেলযুক্ত AccountNavTabs পিল + নোটিফিকেশন বেল (কোনো সার্চ বার নেই) */}
                <div className="hidden items-center gap-2 md:flex">
                  <div className="h-10 w-[300px] animate-pulse rounded-full border border-border-base/70 bg-surface-muted/50 lg:w-[340px]" />
                  <div className="flex h-9 w-9 items-center justify-center"><BellIconSkeleton /></div>
                </div>
                {/* মোবাইল: ৪টা আইকন বাটন (উইশলিস্ট, কার্ট, মেম্বারশিপ, ট্র্যাক অর্ডার) + নোটিফিকেশন বেল —
                    সবগুলোই আসলে ট্রান্সপারেন্ট আইকন-বাটন, তাই বৃত্তের বদলে হুবহু আইকন-শেপ */}
                <div className="flex items-center gap-1.5 md:hidden">
                  <div className="flex h-9 w-9 items-center justify-center"><WishlistIconSkeleton /></div>
                  <div className="flex h-9 w-9 items-center justify-center"><CartIconSkeleton /></div>
                  <div className="flex h-9 w-9 items-center justify-center"><CrownIconSkeleton /></div>
                  <div className="flex h-9 w-9 items-center justify-center"><TrackIconSkeleton /></div>
                  <div className="flex h-9 w-9 items-center justify-center"><BellIconSkeleton /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content Skeleton — AccountClient-এর লগইন-হাইড্রেশনের আগের স্কেলেটনের সাথে একই কম্পোনেন্ট */}
      <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-4 md:px-6">
        <AccountMainSkeleton />
      </div>
    </div>
  );
}

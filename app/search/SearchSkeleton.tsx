'use client';

// ফাইলের পাথ: app/search/SearchSkeleton.tsx
// সার্চ পেজের স্কেলেটন — loading.tsx (SearchSkeletonAuto) আর page.tsx-এর <Suspense fallback> (SearchSkeleton, সার্ভার-জানা মানসহ) ব্যবহার করে।
//
// [ব্যাচ ৯.৪-ফিক্স] আগে স্কেলেটন সবসময় ক্যাটাগরি-চিপ, ফলাফল-সংখ্যা, ফিল্টার বাটন আর ১২টা কার্ড দেখাত — অথচ আসল পেজে
// ক্যাটাগরি মিললেই কেবল চিপ-সারি থাকে, কোয়েরি না থাকলে ফিল্টার বাটন অদৃশ্য, ম্যাচ কম হলে কার্ডও কম। ফলে স্কেলেটন থেকে
// আসল পেজে গেলে অংশ উধাও/লাফিয়ে যেত। এখন স্কেলেটন আসল পেজের একই শর্তে আঁকে:
//   • চিপ-সারি শুধু যখন আসল পেজেও ক্যাটাগরি মিলবে (চিপের সংখ্যা ও প্রস্থ ক্যাটাগরির নাম থেকে)
//   • ফিল্টার বাটন শুধু কোয়েরি থাকলে (না থাকলে আসল পেজের মতোই অদৃশ্য কিন্তু জায়গা ধরা)
//   • কার্ডের সংখ্যা = ম্যাচের সংখ্যা (সর্বোচ্চ ১২); একটাও না মিললে গ্রিড নেই
//   • পেজের ব্যাকগ্রাউন্ড আলাদা গ্রেডিয়েন্ট নয় — আসল পেজের মতো সাদা

import { useSearchParams } from 'next/navigation';
import { matchCategories } from '@/lib/searchData';
import { DEFAULT_CATEGORIES } from '@/lib/categoryData';
import { chipWidthFor } from './skeletonUtil';

export interface SearchSkeletonProps {
  hasQuery?: boolean;
  /** প্রতিটা ক্যাটাগরি-চিপের আনুমানিক প্রস্থ (px); খালি = চিপ-সারি নেই */
  chipWidths?: number[];
  /** "N টি পণ্য পাওয়া গেছে" লাইন দেখাবে কিনা */
  showCount?: boolean;
  /** কার্ডের সংখ্যা (০ = গ্রিড নেই) */
  cardCount?: number;
}

export default function SearchSkeleton({
  hasQuery = true,
  chipWidths = [],
  showCount = true,
  cardCount = 12,
}: SearchSkeletonProps) {
  return (
    <div className="min-h-screen">
      {/* ================= সার্চ হেডার (ফিরে যান + সার্চ বার + ফিল্টার) ================= */}
      <div className="sticky top-[14px] z-[900] mx-2 mb-1.5 mt-[14px] max-[400px]:mx-1.5 sm:mx-3">
        <div className="navbar-glass relative rounded-[35px] border border-white/70 bg-white/80 shadow-sh1 backdrop-blur-[10px]">
          <div className="mx-auto flex h-[62px] max-w-[1300px] items-center gap-2.5 px-3 sm:gap-3 sm:px-5">
            <div className="flex h-11 shrink-0 items-center gap-1.5 min-[420px]:gap-2 rounded-full border border-border-base bg-white/80 pl-2 pr-3 max-[400px]:pr-2 max-[400px]:pl-1.5 min-[420px]:pr-3.5">
              <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-brand-light/40" />
              <div className="hidden h-3.5 w-16 animate-pulse rounded bg-brand-bg/50 min-[420px]:block" />
              <div className="h-3.5 w-9 animate-pulse rounded bg-brand-bg/50 min-[420px]:hidden" />
            </div>
            <div className="h-11 flex-1 animate-pulse rounded-full bg-brand-bg/25" />
            {/* আসল ফিল্টার বাটন: মোবাইলে শুধু আইকন, sm+ এ আইকন + "ফিল্টার"; কোয়েরি না থাকলে অদৃশ্য (জায়গা থাকে) */}
            <div className={`h-11 w-[42px] shrink-0 rounded-full sm:w-[98px] ${hasQuery ? 'animate-pulse bg-brand-bg/25' : 'invisible'}`} />
          </div>
        </div>
      </div>

      <div className="mx-auto mb-11 mt-3 min-h-[40vh] max-w-[1300px] px-5">
        {hasQuery && (
          <>
            {chipWidths.length > 0 && (
              <div className="mb-4">
                <div className="mb-2.5 flex h-5 items-center">
                  <div className="h-3 w-16 animate-pulse rounded bg-surface-muted" />
                </div>
                <div className="flex gap-2 overflow-hidden pb-1">
                  {chipWidths.map((w, i) => (
                    <div key={i} style={{ width: w }} className="h-10 shrink-0 animate-pulse rounded-full border border-border-base bg-white" />
                  ))}
                </div>
              </div>
            )}

            {showCount && (
              <div className="mb-4 flex h-5 items-center">
                <div className="h-[13px] w-32 animate-pulse rounded bg-surface-muted" />
              </div>
            )}

            {cardCount > 0 && (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {Array.from({ length: cardCount }).map((_, i) => (
                  <div key={i} className="rounded-[18px] bg-white p-1 shadow-[0_4px_14px_rgba(0,88,199,.12)]">
                    <div className="relative aspect-[0.57] animate-pulse overflow-hidden rounded-[14px] bg-brand-bg/30">
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
            )}
          </>
        )}
      </div>
    </div>
  );
}

// loading.tsx-এর জন্য: সার্ভারের ম্যাচ-সংখ্যা তখনো অজানা, তাই URL-এর ?q= দেখে কোয়েরি আছে কিনা ও ডিফল্ট
// ক্যাটাগরি মেলে কিনা (সাইটে এখন ডিফল্ট ক্যাটাগরিই চলে) বুঝে নেয়।
export function SearchSkeletonAuto() {
  const sp = useSearchParams();
  const q = (sp.get('q') || '').replace(/[<>`]/g, '').trim().slice(0, 60);
  const chips = q ? matchCategories(DEFAULT_CATEGORIES, q, 8).map((c) => chipWidthFor(c.name)) : [];
  return <SearchSkeleton hasQuery={!!q} chipWidths={chips} showCount cardCount={12} />;
}

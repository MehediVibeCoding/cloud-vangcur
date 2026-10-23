// প্রোডাক্ট ডিটেইল পেজের স্কেলেটন — loading.tsx, রুট-লেভেল fallback ও (ভবিষ্যতে) অন্য যেকোনো জায়গা
// থেকে একই কম্পোনেন্ট ব্যবহার হয়, যাতে সব জায়গায় পিক্সেল-পিক্সেল এক থাকে।
//
// 🎯 আসল পেজ (app/product/[slug]/ProductDetailClient.tsx) এর সাথে মাপ মেলানো আছে (মোবাইল, ১২px/১৬px বেস):
//   • ছবির বাক্সের ভেতরের রঙ আসল পেজের ছবি-প্লেসহোল্ডারের (GalleryImg) রঙের সাথে এক (bg-brand-bg/30, স্থির —
//     pulse নেই, যাতে স্কেলেটন → আসল পেজে বদলের সময় রঙের ধাপ/সাদা ঝলক না আসে)।
//   • ডট + থাম্বনেইল স্ট্রিপ শুধু একাধিক ছবি থাকলে (আসল পেজও তাই করে) — না মিললে পুরো ডান অংশ ~১০২px লাফ দিত।
//   • ডান কলামের প্রতিটা সারির উচ্চতা আসল সারির line-height/padding থেকে হিসাব করা (টাইটেল ২১px×leading-snug,
//     দাম ২৮px×১.৫, পরিমাণ-সারি ৪০px, বাটন py-3.5+২০px লাইন ইত্যাদি) — হেডলেস Chromium-এ মেপে দেখা: ০px ফারাক।
// ফাইলের মাপ বদলালে scripts-এর মতো করে আসল পেজের সাথে আবার মিলিয়ে নিতে হবে।
import {
  WishlistIconSkeleton,
  CartIconSkeleton,
  TrackIconSkeleton,
  SearchIconSkeleton,
} from '@/app/components/ui/Skeletons';

/** কার্ড থেকে ছবির সংখ্যা জানা না থাকলে (সরাসরি লিংক/ব্যাক-নেভিগেশন) যা ধরা হবে। */
export const DEFAULT_PRODUCT_SKELETON_IMG_COUNT = 1;
const MAX_STRIP_ITEMS = 8;

interface ProductDetailSkeletonProps {
  /** প্রোডাক্টে কয়টা ছবি — ১ হলে ডট/থাম্বনেইল স্ট্রিপ দেখানো হয় না (আসল পেজের মতো) */
  imgCount?: number | null;
}

export default function ProductDetailSkeleton({ imgCount }: ProductDetailSkeletonProps) {
  const count = Math.min(
    Math.max(Math.round(imgCount ?? DEFAULT_PRODUCT_SKELETON_IMG_COUNT), 1),
    MAX_STRIP_ITEMS,
  );
  const showStrip = count > 1;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-brand-bg/25 via-white to-white" aria-busy="true">
      {/* ================= Navbar Skeleton (showHomeButton ভ্যারিয়েন্ট) ================= */}
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

      {/* ================= মূল গ্রিড: গ্যালারি + ইনফো কলাম (আসল পেজের grid-এর হুবহু ক্লাস) ================= */}
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-4 pb-6 pt-3.5 md:grid-cols-2 md:px-8 md:pb-10">
        {/* ---------- বাম কলাম: ছবি গ্যালারি ---------- */}
        <div>
          {/* বাইরের বাক্স আসল পেজের সাথে এক (bg-white + border + shadow + radius); ভেতরের রঙ স্থির */}
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[14px] border border-border-base bg-white shadow-sh1">
            <div className="h-full w-full bg-brand-bg/30" />
          </div>

          {showStrip && (
            <>
              {/* ডট ইন্ডিকেটর — mt-4 + h-1.5 */}
              <div className="mt-4 flex justify-center gap-1.5">
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 animate-pulse rounded-full ${i === 0 ? 'w-6 bg-brand-light/40' : 'w-1.5 bg-border-base'}`}
                  />
                ))}
              </div>
              {/* থাম্বনেইল স্ট্রিপ — mt-3 + h-16 + pb-1 */}
              <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 w-16 shrink-0 animate-pulse rounded-[10px] border-[1.5px] border-border-base bg-brand-bg/25"
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ---------- ডান কলাম ---------- */}
        <div>
          {/* টাইটেল: ২১px (sm: ২৪px) × leading-snug(১.৩৭৫) = ২৮.৮৭৫px (sm: ৩৩px) প্রতি লাইন, ২ লাইন ধরা, mb-3 */}
          <div className="mb-3">
            {[100, 66].map((w) => (
              <div key={w} className="flex h-[28.875px] items-center sm:h-[33px]">
                <div className="h-[18px] animate-pulse rounded-lg bg-surface-muted sm:h-5" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>

          {/* দাম-সারি: ২৮px (sm: ৩২px) × line-height ১.৫ = ৪২px (sm: ৪৮px), mb-3 */}
          <div className="mb-3 flex h-[42px] items-center gap-x-2.5 sm:h-12">
            <div className="h-8 w-28 animate-pulse rounded-lg bg-brand-light/30 sm:h-9" />
            <div className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
          </div>

          {/* স্টক-লাইন: ১২.৫px × ১.৫ = ১৮.৭৫px, mb-3 */}
          <div className="mb-3 flex h-[18.75px] items-center">
            <div className="h-3.5 w-44 animate-pulse rounded bg-surface-muted" />
          </div>

          {/* ওয়ারেন্টি ব্যানার: py-2.5 + ২০px (আইকন-বৃত্ত) + বর্ডার ২px = ৪২px, mb-5 */}
          <div className="mb-5 h-[42px] w-full animate-pulse rounded-[10px] border border-success/30 bg-success/10" />

          {/* কুইক স্পেক: লেবেল ১১px×১.৫=১৬.৫px + mb-2.5; পিল py-1.5 + ১৩px×১.৫ = ৩১.৫px; সারির গ্যাপ ৮px; mb-5 */}
          <div className="mb-5">
            <div className="mb-2.5 flex h-[16.5px] items-center">
              <div className="h-2.5 w-36 animate-pulse rounded bg-surface-muted" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="h-[31.5px] w-24 animate-pulse rounded-full bg-brand-bg/35" />
                <div className="h-[31.5px] w-32 animate-pulse rounded-full bg-brand-bg/35" />
                <div className="h-[31.5px] w-28 animate-pulse rounded-full bg-brand-bg/35" />
              </div>
              <div className="flex gap-2">
                <div className="h-[31.5px] w-20 animate-pulse rounded-full bg-brand-bg/35" />
                <div className="h-[31.5px] w-32 animate-pulse rounded-full bg-brand-bg/35" />
              </div>
            </div>
          </div>

          {/* পরিমাণ + wishlist + share: পরিমাণ-পিল py-1 + ৩২px বাটন = ৪০px; ডানের বাটন ৩৬px; mb-5 */}
          <div className="mb-5 flex items-center gap-3">
            <div className="h-10 w-[162px] animate-pulse rounded-full bg-brand-bg/35" />
            <div className="ml-auto flex items-center gap-1">
              <div className="h-9 w-9 animate-pulse rounded-[10px] bg-brand-bg/35" />
              <div className="h-9 w-9 animate-pulse rounded-[10px] bg-brand-bg/35" />
            </div>
          </div>

          {/* কার্ট/অর্ডার বাটন: আসল বাটনের হুবহু বক্স-মডেল (py-3.5 + ২০px লাইন; কার্টে border-[1.5px]) —
              ফোনের DPR-এ ১.৫px বর্ডার যেভাবে পিক্সেলে গোল হয়, স্কেলেটনেও ঠিক সেভাবেই হয় */}
          <div className="flex flex-col gap-2.5">
            <div className="w-full animate-pulse rounded-[14px] border-[1.5px] border-brand-light/30 bg-brand-bg/25 py-3.5">
              <div className="h-5" />
            </div>
            <div className="w-full animate-pulse rounded-[14px] bg-brand-light/50 py-3.5">
              <div className="h-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

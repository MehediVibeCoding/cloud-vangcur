// ফাইলের পাথ: app/[...segments]/loading.tsx
// ৫টা গাইড সাব-পেজ (pillar/compare/install/app-remote/ideas) — সবকটাই এই
// একটা catch-all route দিয়ে সার্ভ হয়, তাই Next.js-এর loading.tsx কনভেনশন
// অনুযায়ী এই একটা স্কেলেটনই সবগুলোর জন্য দেখা যায় (কোন নির্দিষ্ট পেজ/কী কী
// ব্লক আসছে সেটা এই ফাইল আগে থেকে জানে না — ডেটা fetch হওয়ার আগেই এটা রেন্ডার
// হয়)। যেহেতু পেজভেদে ব্লকের ধরন/সংখ্যা/ক্রম ভিন্ন ভিন্ন (কোনোটায় টেবিল আছে,
// কোনোটায় নেই; কোনোটায় checklist আছে, কোনোটায় steps), তাই এই স্কেলেটন কোনো
// একটা নির্দিষ্ট পেজের হুবহু নকল করার চেষ্টা করে না।
//
// 🛠️ ফিক্স: আগের ভার্সনে (ক) "টেবিল" বোঝাতে একটা এলোমেলো চেকার্ড
// grid-cols-3/gap-px বক্স-প্যাটার্ন ছিল, যেটা আসল কোনো টেবিলের মতো দেখতেই
// লাগত না (কোনো header row, কোনো column separation স্পষ্ট ছিল না); (খ)
// কার্ড-গ্রিড স্কেলেটনে প্রতিটা কার্ডে একটা ফাঁকা বৃত্ত (আইকন) দেখানো হতো,
// অথচ আসল CardGridBlockView এখন আর কোনো কার্ডে আইকন দেখায়ই না (আগের একটা
// ফিক্সে বাদ দেওয়া হয়েছে) — তাই স্কেলেটনে সেই আইকন-বৃত্তটা আসল কনটেন্টে
// কখনোই না-থাকা একটা জিনিস দেখাচ্ছিল; (গ) কোনো section heading-ই আসল
// BlockHeading-এর মতো আইকন-বৃত্ত+টেক্সট শেপ অনুসরণ করত না, শুধু একটা বার
// ছিল; (ঘ) checklist/steps-স্টাইল লিস্ট ব্লকের কোনো প্রতিনিধিত্বই ছিল না,
// অথচ এই পাঁচ ধরনের পেজেই এটা খুব সাধারণ। এখন প্রতিটা স্কেলেটন-সেকশন আসল
// ব্লক-ভিউয়ের (GuideBlocks.tsx) ঠিক কন্টেইনার-প্রস্থ, প্যাডিং, বর্ডার-রেডিয়াস,
// আর হেডিং-শেপ অনুসরণ করে — যাতে (ক) প্রতিটা আলাদা টুকরা একা দেখতে
// পরিষ্কার/পেশাদার লাগে, আর (খ) স্কেলেটন থেকে আসল কনটেন্টে বদলানোর সময়
// width/spacing-এ কোনো আকস্মিক "লাফ" (layout shift) না হয়।

import { WishlistIconSkeleton, CartIconSkeleton, TrackIconSkeleton, SearchIconSkeleton } from '@/app/components/ui/Skeletons';

function IconCircleSkeleton() {
  return <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-brand-bg/60" />;
}

// BlockHeading (icon-circle + h2 বার) — GuideBlocks.tsx-এর BlockHeading-এর সাথে হুবহু মিলিয়ে
function HeadingSkeleton({ width = 'w-56' }: { width?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <IconCircleSkeleton />
      <div className={`h-5 ${width} animate-pulse rounded-lg bg-surface-muted sm:h-[22px]`} />
    </div>
  );
}

// RichTextBlockView-এর প্যারাগ্রাফ শেপ (Container = 880px)
function TextSectionSkeleton() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-8 sm:px-5">
      <HeadingSkeleton width="w-64" />
      <div className="space-y-3">
        <div className="h-3.5 w-full animate-pulse rounded bg-surface-muted" />
        <div className="h-3.5 w-11/12 animate-pulse rounded bg-surface-muted" />
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  );
}

// PriceTableBlockView-এর টেবিল শেপ (rounded-2xl border shadow-xs, হেডার রো + স্ট্রাইপড ডেটা রো)
function TableSectionSkeleton() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-8 sm:px-5">
      <HeadingSkeleton width="w-48" />
      <div className="overflow-hidden rounded-2xl border border-border-base shadow-xs">
        <div className="flex items-center gap-4 border-b border-border-base bg-brand-bg/40 px-4 py-3">
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-white/70" />
          <div className="h-3.5 w-1/4 animate-pulse rounded bg-white/70" />
          <div className="ml-auto h-3.5 w-1/5 animate-pulse rounded bg-white/70" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-4 px-4 py-3 ${i !== 3 ? 'border-b border-border-base' : ''} ${
              i % 2 ? 'bg-white' : 'bg-brand-bg/10'
            }`}
          >
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-surface-muted" />
            <div className="ml-auto h-3 w-1/5 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// CardGridBlockView-এর কার্ড শেপ (WideContainer = 1100px) — কোনো কার্ডেই আইকন নেই, আসল ব্লকের মতোই
function CardsSectionSkeleton() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-5">
      <HeadingSkeleton width="w-52" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border-base bg-white/95 p-5 shadow-xs">
            <div className="mb-2.5 h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
            <div className="space-y-1.5">
              <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ChecklistBlockView / compact StepsBlockView-এর লিস্ট শেপ (Container = 880px) — ডট + এক লাইন
function ListSectionSkeleton() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-8 sm:px-5">
      <HeadingSkeleton width="w-60" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand-light/60" />
            <div className={`h-3.5 animate-pulse rounded bg-surface-muted ${i % 2 ? 'w-2/3' : 'w-4/5'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// FaqBlockView-এর accordion শেপ (Container = 880px, rounded-[16px] border)
function FaqSectionSkeleton() {
  return (
    <div className="mx-auto max-w-[880px] px-4 pb-12 sm:px-5">
      <HeadingSkeleton width="w-40" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex h-14 items-center rounded-[16px] border border-border-base bg-white/95 px-4 shadow-xs sm:px-[17px]"
          >
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GuidePageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white">
      {/* ================= Navbar Skeleton (showHomeButton ভ্যারিয়েন্ট) ================= */}
      <div className="mx-2 mb-1.5 mt-[14px] max-[400px]:mx-1.5 sm:mx-3">
        <div className="navbar-glass relative rounded-[35px] border border-white/60 bg-white/80 shadow-sh1 backdrop-blur-[8px]">
          <div className="mx-auto flex h-[62px] max-w-[1300px] items-center gap-[14px] px-3 max-[400px]:gap-2 sm:px-5 2xl:max-w-[1560px]">
            <div className="flex w-full items-center justify-between gap-2 max-[400px]:gap-1.5 sm:gap-3">
              {/* Navbar.tsx-এর showHomeButton pill (বৃত্ত আইকন + টেক্সট) — আগে ভুল শেপ ছিল */}
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

      <div className="pt-2 sm:pt-3">
        {/* ================= Hero ব্লক Skeleton (HeroBlockView-এর সাথে মিলিয়ে) ================= */}
        <div className="border-b border-border-base bg-gradient-to-b from-brand-bg/35 via-[#DCEBFD]/45 to-white">
          <div className="mx-auto grid max-w-[1100px] gap-8 px-4 pt-6 pb-10 sm:px-5 sm:pt-10 sm:pb-14 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <div className="mb-3 h-6 w-32 animate-pulse rounded-full bg-white/80" />
              <div className="space-y-2.5">
                <div className="h-7 w-full animate-pulse rounded-lg bg-white/70 sm:h-8" />
                <div className="h-7 w-4/5 animate-pulse rounded-lg bg-white/70 sm:h-8" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3.5 w-full animate-pulse rounded bg-white/50" />
                <div className="h-3.5 w-11/12 animate-pulse rounded bg-white/50" />
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/50" />
              </div>
            </div>
            <div className="aspect-[5/4] w-full animate-pulse rounded-2xl bg-white/40" />
          </div>
        </div>

        {/* ================= সাধারণ কনটেন্ট-ঘন সেকশনগুলো — নির্দিষ্ট কোনো পেজের হুবহু
            নকল না (সব পেজে একই ব্লক-ক্রম থাকে না), কিন্তু প্রতিটা টুকরার শেপ
            আসল ব্লক-ভিউয়ের সাথে হুবহু মেলানো, যাতে আসল কনটেন্ট লোড হওয়ার পর
            width/spacing/style-এ কোনো আকস্মিক পরিবর্তন চোখে না পড়ে ================= */}
        <TextSectionSkeleton />
        <TableSectionSkeleton />
        <ListSectionSkeleton />
        <CardsSectionSkeleton />
        <FaqSectionSkeleton />
      </div>
    </div>
  );
}

// ফাইলের পাথ: app/(policies)/PolicySkeleton.tsx
// [NEW ব্যাচ ১৪] পলিসি পেজগুলোর (ওয়ারেন্টি/রিটার্ন/প্রাইভেসি/টার্মস/শিপিং/গাইড) নিজস্ব স্কেলেটন তৈরির শেয়ার্ড অংশ।
// প্রতিটা পেজের loading.tsx এখানে নিজের সেকশন-গঠন (বুলেট, অনুচ্ছেদ, নোট) পাঠায় — তাই স্কেলেটন আসল পেজের
// সেকশন সংখ্যা ও উচ্চতার কাছাকাছি হয়, লোড শেষে লেআউট লাফায় না।

// [বুলেট সংখ্যা, অনুচ্ছেদ সংখ্যা, নোট সংখ্যা]
export type SkeletonSection = [number, number, number];

function Bar({ w, h = 'h-3' }: { w: string; h?: string }) {
  return <div className={`${h} ${w} animate-pulse rounded bg-surface-muted`} />;
}

function Paragraph() {
  return (
    <div className="mb-3 space-y-2">
      <Bar w="w-full" />
      <Bar w="w-[94%]" />
      <Bar w="w-[62%]" />
    </div>
  );
}

function Bullet() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand-light/40" />
      <div className="flex-1 space-y-1.5">
        <Bar w="w-full" />
        <Bar w="w-[70%]" />
      </div>
    </div>
  );
}

function Note() {
  return (
    <div className="my-3.5 flex items-start gap-2.5 rounded-[14px] border border-border-base/60 bg-white/60 p-3.5">
      <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-brand-light/30" />
      <div className="flex-1 space-y-1.5">
        <Bar w="w-full" h="h-2.5" />
        <Bar w="w-[80%]" h="h-2.5" />
      </div>
    </div>
  );
}

export default function PolicySkeleton({ sections }: { sections: SkeletonSection[] }) {
  return (
    <div className="animate-section-reveal" aria-hidden="true">
      {/* হেডার কার্ড — PolicyHeader-এর মতো: ফিরে যান বাটন + তারিখ, নিচে আইকন + শিরোনাম */}
      <div className="relative mb-6 overflow-hidden rounded-[24px] border border-white/80 bg-gradient-to-b from-brand-bg/40 via-[#DCEBFD]/50 to-white/90 p-5 shadow-sh2 backdrop-blur-md sm:p-7">
        <div className="mb-4 flex items-center justify-between border-b border-ink/10 pb-3.5">
          <div className="h-[36px] w-[104px] animate-pulse rounded-full bg-white/80" />
          <Bar w="w-28" h="h-3" />
        </div>
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-full border border-brand-light/35 bg-white shadow-xs" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-6 w-3/4 animate-pulse rounded-lg bg-brand-bg/60 sm:h-7" />
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-brand-light/30" />
          </div>
        </div>
      </div>

      {sections.map(([bullets, paras, notes], i) => (
        <div
          key={i}
          className="relative mb-5 overflow-hidden rounded-[20px] border border-white/80 bg-white/85 p-5 shadow-xs backdrop-blur-md sm:p-6"
        >
          <div className="mb-3.5 flex items-center gap-2.5 border-b border-ink/10 pb-2.5">
            <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-brand-bg" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-brand-bg/60" />
          </div>
          {Array.from({ length: paras }).map((_, k) => <Paragraph key={`p${k}`} />)}
          {bullets > 0 && (
            <div className="mb-3 space-y-2.5">
              {Array.from({ length: bullets }).map((_, k) => <Bullet key={`b${k}`} />)}
            </div>
          )}
          {Array.from({ length: notes }).map((_, k) => <Note key={`n${k}`} />)}
        </div>
      ))}
    </div>
  );
}

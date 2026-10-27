// ফাইলের পাথ: app/search/SearchSkeleton.tsx
// [NEW] সার্চ পেজের স্কেলেটন — loading.tsx আর page.tsx-এর <Suspense fallback> দুটোই এটা ব্যবহার করে।
// আগে fallback ছিল `null`: নেভিগেট করার সময় স্কেলেটনের পর SearchClient-এর JS চাঙ্ক লোড হওয়া পর্যন্ত
// এক ঝলক ফাঁকা স্ক্রিন দেখাত। এখন ঐ ফাঁকেও একই স্কেলেটন থাকে, তাই স্কেলেটন → ফাঁকা → রেজাল্ট হয় না।
export default function SearchSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white">
      {/* ================= সার্চ হেডার (হোম আইকন + সার্চ বার) ================= */}
      <div className="sticky top-[14px] z-[900] mx-2 mb-1.5 mt-[14px] max-[400px]:mx-1.5 sm:mx-3">
        <div className="navbar-glass relative rounded-[35px] border border-white/70 bg-white/80 shadow-sh1 backdrop-blur-[10px]">
          <div className="mx-auto flex h-[62px] max-w-[1300px] items-center gap-2.5 px-3 sm:gap-3 sm:px-5">
            <div className="flex shrink-0 items-center gap-1.5 min-[420px]:gap-2 rounded-full border border-border-base bg-white/80 py-1.5 pl-2 pr-3 max-[400px]:pr-2 max-[400px]:pl-1.5 min-[420px]:pr-3.5">
              <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-brand-light/40" />
              <div className="hidden h-3.5 w-16 animate-pulse rounded bg-brand-bg/50 min-[420px]:block" />
              <div className="h-3.5 w-9 animate-pulse rounded bg-brand-bg/50 min-[420px]:hidden" />
            </div>
            <div className="h-11 flex-1 animate-pulse rounded-full bg-brand-bg/25" />
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-brand-bg/25 sm:w-[98px]" />
          </div>
        </div>
      </div>

      <div className="mx-auto mb-11 mt-3 min-h-[40vh] max-w-[1300px] px-5">
        {/* ক্যাটাগরি চিপস (থাকলে) */}
        <div className="mb-4">
          <div className="mb-2.5 h-3 w-16 animate-pulse rounded bg-surface-muted" />
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-28 shrink-0 animate-pulse rounded-full border border-border-base bg-white" />
            ))}
          </div>
        </div>

        {/* ফলাফল সংখ্যা */}
        <div className="mb-4 h-[13px] w-32 animate-pulse rounded bg-surface-muted" />

        {/* প্রোডাক্ট গ্রিড */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
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
      </div>
    </div>
  );
}

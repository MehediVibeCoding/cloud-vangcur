// GitHub পাথ: app/products/loading.tsx — নতুন ফাইল (ব্যাচ ২)।
// আগে /products রুটে নিজস্ব loading.tsx ছিল না, তাই Next রুটের app/loading.tsx (হোম স্কেলেটন: Hero + TrustStrip + Categories) দেখাত।
// এখন আসল /products পেজের কাঠামো হুবহু: আসল Navbar ("ফিরে যান" ভ্যারিয়েন্ট) → হেডিং → ২-কলাম কার্ড গ্রিড।
import SkeletonNavbar from '@/app/components/ui/SkeletonNavbar';

export default function ProductsLoading() {
  return (
    // ব্যাকগ্রাউন্ড ProductsPageClient-এর সাথে হুবহু এক (সাইটের ট্রাই-কালার ক্যানভাসের ওপর আধা-স্বচ্ছ)
    <div className="relative flex min-h-screen flex-col justify-between bg-gradient-to-b from-brand-bg/35 via-[#DCEBFD]/45 to-white">
      <div className="relative z-10">
        <SkeletonNavbar showHomeButton />

        <main className="mx-auto mb-11 mt-4 max-w-[1300px] px-5" aria-busy="true">
          {/* হেডিং — আসল h1-এর বাঁ-বর্ডার সহ; লেখা ক্যাটাগরি-ভেদে বদলায় তাই বারটা স্কেলেটন */}
          <div className="mb-5 border-l-[3px] border-brand-light pl-3">
            <div className="h-7 w-40 animate-pulse rounded-md bg-brand-bg/60" />
          </div>

          {/* কার্ড গ্রিড — VirtualizedProductGrid-এর একই ক্লাস ও কার্ড-শেপ */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 8 }).map((_, i) => (
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
        </main>
      </div>
    </div>
  );
}

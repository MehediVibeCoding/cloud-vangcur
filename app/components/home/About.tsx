'use client';

import { useT } from '@/lib/i18n/useT';

function HeaderDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.10]" aria-hidden="true">
      <svg width="40" height="40" className="absolute -left-2 top-2 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 13a8 8 0 0 1 16 0" />
        <rect x="3" y="13" width="4" height="6" rx="1.5" />
        <rect x="17" y="13" width="4" height="6" rx="1.5" />
      </svg>
      <svg width="32" height="32" className="absolute right-4 top-4 rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

export default function About() {
  // vc_about_desc সেটিংটা এখন অ্যাডমিন প্যানেল থেকে এডিট করার কোনো উপায় নেই
  // (ফিচার সরানো হয়েছে), তাই Supabase-এ বারবার খুঁজে দেখার দরকার নেই — সবসময়
  // নিচের ডিফল্ট লেখাটাই দেখানো হবে।
  const { lang } = useT();

  return (
    <section className="mx-auto mb-14 max-w-[1300px] px-4 sm:px-5 [contain:content] [transform:translateZ(0)] overflow-hidden [content-visibility:auto] [contain-intrinsic-size:auto_760px]">
      <div className="relative overflow-hidden rounded-[28px] border border-white/90 bg-gradient-to-b from-brand-bg/25 via-[#EFF6FE]/75 to-white/95 p-6 sm:p-10 shadow-[0_4px_24px_rgba(68,167,252,0.08)] ring-1 ring-white/80">
        
        <HeaderDecor />

        <div className="relative z-10 mx-auto max-w-[860px] text-center">
          
          <div className="mb-3.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-light/30 bg-white/95 px-3 py-1 min-[380px]:px-4 min-[380px]:py-1.5 font-body text-[9.5px] min-[360px]:text-[10.5px] sm:text-[12px] font-bold uppercase tracking-[0.6px] min-[380px]:tracking-[1.2px] text-brand-light shadow-2xs">
            <SparklesIcon />
            <span className="truncate">Vangcur — Your First Choice For Gadgets</span>
          </div>

          <h2 className="mb-5 font-body font-extrabold text-ink leading-snug">
            {lang === 'en' ? (
              <>
                <span className="block text-[18px] min-[360px]:text-[20px] sm:inline sm:text-[28px] md:text-[30px]">
                  Vangcur
                </span>
                <span className="block text-[14px] min-[360px]:text-[15.5px] sm:ml-1.5 sm:inline sm:text-[28px] md:text-[30px] text-brand-light mt-1 sm:mt-0">
                  Your Trusted Tech &amp; Lifestyle Store
                </span>
              </>
            ) : (
              <>
                <span className="block text-[19px] min-[360px]:text-[21px] sm:inline sm:text-[28px] md:text-[30px]">
                  Vangcur — ভাঙচুর
                </span>
                <span className="block text-[13px] min-[360px]:text-[14.5px] min-[400px]:text-[16px] sm:ml-1.5 sm:inline sm:text-[28px] md:text-[30px] text-brand-light mt-1 sm:mt-0">
                  আপনার বিশ্বস্ত গ্যাজেট ও লাইফস্টাইল শপ
                </span>
              </>
            )}
          </h2>

          <div className="space-y-4 font-body text-[13.5px] sm:text-[15px] leading-[1.85] sm:leading-[1.9] text-ink/80 text-left sm:text-center">
            <p>
              {lang === 'en' ? (
                <>Vangcur is one of Bangladesh&apos;s leading innovative gadget and lifestyle e-commerce brands. Catering to modern lifestyle tech and everyday creative needs, we bring you the finest collection of trending RGB &amp; neon lights, ambient crystal lamps, premium TWS earbuds, smartwatches, portable cooling fans, and unique utility gadgets.</>
              ) : (
                <>Vangcur (ভাঙচুর) বাংলাদেশের অন্যতম উদ্ভাবনী ও আধুনিক গ্যাজেট এবং লাইফস্টাইল ই-কমার্স ব্র্যান্ড। আমরা নতুন প্রজন্মের রুচি ও দৈনন্দিন প্রযুক্তিগত চাহিদাকে প্রাধান্য দিয়ে সেরা মানের ট্রেন্ডি RGB ও নিয়ন লাইট, ডেকোরেটিভ ক্রিস্টাল ল্যাম্প, প্রিমিয়াম TWS ইয়ারবাডস, স্মার্ট ওয়াচ, রিচার্জেবল ফ্যান এবং ইউনিক লাইফস্টাইল ইলেকট্রনিক্স গ্যাজেট সরবরাহ করে থাকি।</>
              )}
            </p>

            <p>
              {lang === 'en' ? (
                <>Every product undergoes strict quality inspections to ensure uncompromised quality before reaching your doorstep. Partnered with top logistics providers, we offer fast and reliable home delivery across all 64 districts of Bangladesh, backed by genuine replacement warranties and dedicated customer support to ensure a secure, transparent, and seamless shopping experience.</>
              ) : (
                <>আমাদের প্রতিটি পণ্য নিজস্ব কোয়ালিটি চেকের মাধ্যমে শতভাগ গুণগত মান নিশ্চিত করে গ্রাহকের কাছে পৌঁছানো হয়। দেশের স্বনামধন্য কুরিয়ার পার্টনারের মাধ্যমে ঢাকা সিটি সহ সমগ্র বাংলাদেশের ৬৪টি জেলাতেই রয়েছে আমাদের দ্রুত হোম ডেলিভারি সুবিধা। প্রতিটি অর্ডারে জেনুইন রিপ্লেসমেন্ট ওয়ারেন্টি এবং সার্বক্ষণিক কাস্টমার সাপোর্ট প্রদান করে একটি নিরাপদ, স্বচ্ছ ও প্রিমিয়াম কেনাকাটার অভিজ্ঞতা দেওয়াই আমাদের মূল অঙ্গীকার।</>
              )}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

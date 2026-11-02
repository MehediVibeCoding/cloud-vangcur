'use client';

import { useT } from '@/lib/i18n/useT';
import ScrollReveal from '@/app/components/ui/ScrollReveal';

/**
 * হোম পেজে প্রোডাক্ট গ্রিড ও রিভিউ গ্যালারির মাঝের নোটিশ:
 * সব প্রোডাক্ট এখনো লাইভ হয়নি — না পেলে মেসেঞ্জার/WhatsApp-এ যোগাযোগ (শুধু লেখা, কোনো বাটন বা লিংক নেই)।
 *
 * সব প্রোডাক্ট যোগ হয়ে গেলে ClientHome.tsx থেকে <ProductNotice /> লাইনটা মুছে দিলেই হবে।
 */

function InfoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export default function ProductNotice() {
  const { lang } = useT();
  const en = lang === 'en';

  return (
    <div className="mx-auto mb-12 mt-2 max-w-[1300px] px-4 sm:px-5">
      <ScrollReveal>
        <div
          role="note"
          className="relative overflow-hidden rounded-[18px] border border-gold/40 bg-gradient-to-br from-[#FFF9EB] via-white to-[#FFF4DB] p-4 shadow-xs dark:border-gold/30 dark:from-[#2A2314] dark:via-[#1B1A15] dark:to-[#2A2314] sm:p-5"
        >
          {/* বাম পাশের অ্যাকসেন্ট বার */}
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[4px] bg-gradient-to-b from-gold to-gold/40" />

          <div className="flex flex-col gap-4 pl-1.5 sm:items-center">
            <div className="flex items-start gap-3 sm:flex-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                <InfoIcon />
              </div>
              <div className="min-w-0 font-body">
                <h3 className="text-[14.5px] font-extrabold text-ink dark:text-[#F8FAFC] sm:text-[15.5px]">
                  {en ? 'More products are on the way' : 'আরও প্রোডাক্ট আসছে শীঘ্রই'}
                </h3>
                <p className="mt-1 text-[12.5px] leading-[1.75] text-ink/75 dark:text-[#CBD5E1] sm:text-[13.5px]">
                  {en
                    ? 'We have not listed every product on the website yet. We are adding them step by step and will have them all live soon. If the product you are looking for is not here, please contact us on Messenger or WhatsApp.'
                    : 'ওয়েবসাইটে আমাদের সবগুলো প্রোডাক্ট এখনো লাইভ করা হয়নি। আমরা ধাপে ধাপে সবগুলো যুক্ত করছি এবং খুব শীঘ্রই সব প্রোডাক্ট এখানে পাবেন। আপনার কাঙ্ক্ষিত প্রোডাক্টটি যদি এখানে না থাকে, তাহলে অনুগ্রহ করে আমাদের মেসেঞ্জার অথবা হোয়াটসঅ্যাপে যোগাযোগ করুন।'}
                </p>
              </div>
            </div>

          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

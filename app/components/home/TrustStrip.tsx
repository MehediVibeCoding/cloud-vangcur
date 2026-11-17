'use client';

import { useT } from '@/lib/i18n/useT';

interface TrustItem {
  label: string;
  sub: string;
  tint: string;
  icon: React.ReactNode;
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const TRUST_ITEMS: TrustItem[] = [
  {
    label: 'দ্রুত ডেলিভারি',
    sub: 'ঢাকা ১–২ দিন',
    tint: 'text-brand-light bg-brand-light/10',
    icon: (
      <svg {...iconProps}>
        <path d="M2.5 7.5h11v9h-11z" />
        <path d="M13.5 10.5h3.2l3.3 3v3h-6.5" />
        <circle cx="7" cy="18" r="1.8" />
        <circle cx="16.5" cy="18" r="1.8" />
      </svg>
    ),
  },
  {
    label: 'ওয়ারেন্টি',
    sub: 'সকল প্রোডাক্টে',
    tint: 'text-brand-light-hover bg-brand-light-hover/10',
    icon: (
      <svg {...iconProps}>
        <path d="M12 3.5l7 2.5v5.2c0 4.4-3 7.4-7 9.3-4-1.9-7-4.9-7-9.3V6l7-2.5z" />
        <path d="M9 12l2 2 4-4.2" />
      </svg>
    ),
  },
  {
    label: 'অথেনটিক',
    sub: '১০০% নিশ্চিত',
    tint: 'text-success bg-success/10',
    icon: (
      <svg {...iconProps}>
        <path d="M9 5.5H7A1.5 1.5 0 0 0 5.5 7v10A1.5 1.5 0 0 0 7 18.5h10a1.5 1.5 0 0 0 1.5-1.5V7A1.5 1.5 0 0 0 17 5.5h-2" />
        <path d="M8.5 5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v1h-7V5z" />
        <path d="M8.5 12l2.3 2.3L15.5 10" />
      </svg>
    ),
  },
  {
    label: 'সাপোর্ট',
    sub: 'WhatsApp: 01897-804055',
    tint: 'text-gold bg-gold/10',
    icon: (
      <svg {...iconProps}>
        <path d="M4 12a8 8 0 1 1 3.1 6.3L4 19.5l1.2-3.2A7.96 7.96 0 0 1 4 12z" />
        <path d="M8.5 11.2c0 2.4 1.9 4.3 4.3 4.3" />
        <circle cx="9" cy="10.8" r=".4" fill="currentColor" />
        <circle cx="12" cy="10.8" r=".4" fill="currentColor" />
        <circle cx="15" cy="10.8" r=".4" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'সহজ রিপ্লেসমেন্ট',
    sub: 'ত্রুটি পেলে ৭ দিনে',
    tint: 'text-info bg-info/10',
    icon: (
      <svg {...iconProps}>
        <path d="M4 12a8 8 0 1 1 2.3 5.6" />
        <path d="M4 17.5v-4h4" />
      </svg>
    ),
  },
];

export default function TrustStrip() {
  const { t } = useT();

  // ⚡ আগে এখানে `motion`-এর initial={{ opacity: 0 }} + whileInView ছিল — সার্ভারের HTML-এই আইটেমগুলো
  // অদৃশ্য (opacity 0) আসত, আর JS লোড + হাইড্রেশন + IntersectionObserver শেষ হওয়ার পরেই অ্যানিমেশন শুরু
  // হতো। তাই সাদা বক্স আগে আসত, ভেতরের আইকন/লেখা দেরিতে। এখন হিরো কার্ডের মতো শুধু CSS কিফ্রেম —
  // CSS আসার সাথে সাথে শুরু হয়, JS-এর জন্য অপেক্ষা নেই। শুরু/শেষ অবস্থা, ০.৪২ সেকেন্ড, easing আর
  // i × ০.০৭ সেকেন্ড stagger আগের মতোই।
  // সার্চ পেজের ক্যাটাগরি বাটন থেকে হোমে এলে (SearchClient.tsx <html>-এ data-skip-home-anim বসায়)
  // এন্ট্রি অ্যানিমেশন বাদ — HeroSlider-এর মতো একই অ্যাট্রিবিউট CSS দিয়ে ধরা হয়।
  return (
    <div className="mx-auto mb-[26px] mt-4 max-w-[1300px] px-5">
      <style>{`
        @keyframes trustItemIn {
          from { opacity: 0; transform: translateY(8px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .trust-item-anim {
          animation: trustItemIn 0.42s cubic-bezier(0.4, 0, 0.2, 1) backwards;
        }
        html[data-skip-home-anim] .trust-item-anim {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
        }
      `}</style>
      <div className="grid grid-cols-3 gap-x-2 gap-y-0 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sh1 backdrop-blur-[10px] md:grid-cols-5 md:gap-x-4 md:px-7 md:py-4">
        {TRUST_ITEMS.map((item, i) => (
          <div
            key={item.label}
            style={{ animationDelay: `${(i * 0.07).toFixed(2)}s` }}
            className={`trust-item-anim flex items-center gap-2 ${i >= 3 ? 'hidden md:flex' : ''}`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-brand ease-brand hover:scale-110 md:h-10 md:w-10 ${item.tint} [&_svg]:h-[17px] [&_svg]:w-[17px] md:[&_svg]:h-[19px] md:[&_svg]:w-[19px]`}
            >
              {item.icon}
            </div>
            <div className="min-w-0 font-body">
              <div className="truncate font-body text-[11px] font-bold text-ink md:text-[12.5px]">
                {t(item.label)}
              </div>
              <div className="truncate font-body text-[10px] text-muted md:text-[11px]">
                {t(item.sub)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

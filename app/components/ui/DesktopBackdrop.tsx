import type { CSSProperties, ReactNode } from 'react';

/**
 * 🌤️ DesktopBackdrop — প্রিমিয়াম "মিস্টি স্কাই" ফিক্সড ব্যাকগ্রাউন্ড (শুধু ল্যাপটপ/ডেস্কটপ)
 *
 * • position:fixed — তাই পেজ স্ক্রল করলে ব্যাকগ্রাউন্ড নড়ে না, শুধু কার্ডটাই ওঠানামা করে
 * • সম্পূর্ণ স্থির (কোনো অ্যানিমেশন নেই) — হালকা, ব্যাটারি/GPU-বান্ধব
 * • কোনো SVG <defs>/id নেই — একসাথে একাধিক জায়গায় মাউন্ট হলেও গ্র্যাডিয়েন্ট ভাঙে না
 * • ডার্ক মোড সমর্থিত (Tailwind `dark:` ক্লাস)
 *
 * ডিফল্টে `hidden lg:block` — মোবাইলে কিছুই রেন্ডার/দেখা যায় না, মোবাইল ডিজাইন অপরিবর্তিত।
 * z-index বদলাতে বা অন্য ব্রেকপয়েন্টে দেখাতে `className` দিন।
 */

const BASE = 'clamp(60px, 6.2vw, 96px)';

type TileProps = {
  /** কন্টেইনারের ভেতরে অবস্থান (left/right/top শতাংশে) */
  pos: CSSProperties;
  /** বেস সাইজের গুণক */
  scale?: number;
  rotate?: number;
  iconClass: string;
  children: ReactNode;
};

function IconTile({ pos, scale = 1, rotate = 0, iconClass, children }: TileProps) {
  return (
    <div
      className={`absolute items-center justify-center rounded-[30%] bg-white/30 text-brand-light/65 shadow-[0_14px_34px_-14px_rgba(0,88,199,0.30)] ring-1 ring-white/75 dark:bg-white/[0.035] dark:text-sky-300/45 dark:shadow-none dark:ring-white/10 ${iconClass}`}
      style={{
        ...pos,
        width: `calc(${BASE} * ${scale})`,
        height: `calc(${BASE} * ${scale})`,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: '52%', height: '52%' }}
      >
        {children}
      </svg>
    </div>
  );
}

function Sparkle({ style, className = '' }: { style: CSSProperties; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`absolute text-white dark:text-sky-200/40 ${className}`}
      style={style}
      fill="currentColor"
    >
      <path d="M12 1.5c.6 5.4 3.6 8.4 9 9-5.4.6-8.4 3.6-9 9-.6-5.4-3.6-8.4-9-9 5.4-.6 8.4-3.6 9-9Z" />
    </svg>
  );
}

function Waves({ className }: { className: string }) {
  // নরম সাদা ঢেউ — কিনারার দিকে ধীরে মিলিয়ে যায় (CSS mask, SVG gradient নয়)
  const mask = 'linear-gradient(135deg, #000 25%, transparent 92%)';
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 560 320"
      fill="none"
      strokeLinecap="round"
      className={`absolute w-[58vw] max-w-[920px] text-white dark:text-sky-300/30 ${className}`}
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    >
      <g stroke="currentColor">
        <path d="M-10 190C120 215 250 130 350 30S520-20 580-50" strokeWidth="1.9" opacity="0.95" />
        <path d="M-10 238C135 266 268 160 380 56S545-8 600-38" strokeWidth="1.5" opacity="0.7" />
        <path d="M-10 288C160 318 300 200 425 88S575 14 625-18" strokeWidth="1.2" opacity="0.5" />
        <path d="M-10 340C185 372 330 240 462 122S600 40 650 6" strokeWidth="1" opacity="0.32" />
      </g>
    </svg>
  );
}

export function DesktopBackdrop({
  className = 'z-0 hidden lg:block',
  iconClass = 'flex',
}: {
  className?: string;
  /** আইকন টাইলের ডিসপ্লে ক্লাস (ছোট স্ক্রিনে লুকাতে `hidden md:flex`) */
  iconClass?: string;
}) {
  const dotMask = 'radial-gradient(ellipse 46% 72% at 50% 50%, transparent 38%, #000 100%)';
  return (
    <div aria-hidden="true" className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`}>
      {/* ১. বেস — হালকা মিস্টি আকাশি */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            'radial-gradient(58% 48% at 10% 6%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%),' +
            'radial-gradient(46% 46% at 92% 10%, rgba(238,245,254,0.95) 0%, rgba(238,245,254,0) 72%),' +
            'radial-gradient(56% 56% at 90% 98%, rgba(68,167,252,0.34) 0%, rgba(68,167,252,0) 70%),' +
            'linear-gradient(180deg, #F4F8FE 0%, #E4EFFC 38%, #CCE1F9 74%, #B7D5F5 100%)',
        }}
      />
      {/* ১ক. বেস — ডার্ক মোড */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            'radial-gradient(58% 48% at 12% 8%, rgba(68,167,252,0.15) 0%, rgba(68,167,252,0) 70%),' +
            'radial-gradient(56% 56% at 90% 96%, rgba(0,88,199,0.24) 0%, rgba(0,88,199,0) 70%),' +
            'linear-gradient(160deg, #0E1727 0%, #0B111E 55%, #09101B 100%)',
        }}
      />

      {/* ২. সূক্ষ্ম ডট-গ্রিড — মাঝখানে মিলিয়ে কিনারায় ফুটে ওঠে */}
      <div
        className="absolute inset-0 [--dot:rgba(0,88,199,0.17)] dark:[--dot:rgba(148,197,255,0.11)]"
        style={{
          backgroundImage: 'radial-gradient(var(--dot) 1px, transparent 1.4px)',
          backgroundSize: '24px 24px',
          WebkitMaskImage: dotMask,
          maskImage: dotMask,
        }}
      />

      {/* ৩. বড় নরম রিং — গভীরতার জন্য */}
      <div className="absolute -bottom-40 -left-32 h-[440px] w-[440px] rounded-full border border-white/55 dark:border-white/[0.06]" />
      <div className="absolute -bottom-24 -left-16 h-[300px] w-[300px] rounded-full border border-white/40 dark:border-white/[0.04]" />
      <div className="absolute -right-32 -top-40 h-[440px] w-[440px] rounded-full border border-white/55 dark:border-white/[0.06]" />
      <div className="absolute -right-16 -top-24 h-[300px] w-[300px] rounded-full border border-white/40 dark:border-white/[0.04]" />

      {/* ৪. ঢেউ — দুই বিপরীত কোণায় */}
      <Waves className="left-0 top-0" />
      <Waves className="bottom-0 right-0 rotate-180" />

      {/* ৫. গ্যাজেট আইকন টাইল — কার্ডের দুই পাশে (কন্টেইনার ১২৪০px-এর বেশি বাড়ে না) */}
      <div className="absolute inset-y-0 left-1/2 w-[min(100%,1240px)] -translate-x-1/2">
        {/* বাম পাশ */}
        <IconTile pos={{ left: '3.5%', top: '11%' }} scale={1.1} rotate={-10} iconClass={iconClass}>
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </IconTile>
        <IconTile pos={{ left: '12.5%', top: '35%' }} scale={0.85} rotate={8} iconClass={iconClass}>
          <path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
          <circle cx="12" cy="13" r="3.6" />
        </IconTile>
        <IconTile pos={{ left: '4.5%', top: '58%' }} scale={1} rotate={-6} iconClass={iconClass}>
          <rect x="5" y="2" width="14" height="20" rx="2.6" />
          <circle cx="12" cy="10" r="2.5" />
          <path d="M9 18h.01M12 18h.01M15 18h.01" />
        </IconTile>
        <IconTile pos={{ left: '13%', top: '80%' }} scale={0.8} rotate={10} iconClass={iconClass}>
          <path d="M9 18.2h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.45 1 1.1 1 1.85v.75h5v-.75c0-.75.4-1.4 1-1.85A6 6 0 0 0 12 3Z" />
        </IconTile>

        {/* ডান পাশ */}
        <IconTile pos={{ right: '4%', top: '13%' }} scale={1} rotate={10} iconClass={iconClass}>
          <circle cx="12" cy="12" r="6.5" />
          <path d="M12 9v3l1.6 1.6" />
          <path d="M16.5 17.4l-.4 3.6a1.6 1.6 0 0 1-1.6 1.4H9.5a1.6 1.6 0 0 1-1.6-1.4l-.4-3.6m.1-10.8l.4-3.6A1.6 1.6 0 0 1 9.5 1.6h5a1.6 1.6 0 0 1 1.6 1.4l.4 3.6" />
        </IconTile>
        <IconTile pos={{ right: '12.5%', top: '38%' }} scale={0.9} rotate={-8} iconClass={iconClass}>
          <rect x="4" y="2" width="16" height="20" rx="3" />
          <circle cx="12" cy="14.5" r="4" />
          <circle cx="12" cy="6.5" r="1" />
        </IconTile>
        <IconTile pos={{ right: '5%', top: '61%' }} scale={0.85} rotate={6} iconClass={iconClass}>
          <rect x="6.5" y="2.5" width="11" height="19" rx="5.5" />
          <path d="M12 6.5v4" />
        </IconTile>
        <IconTile pos={{ right: '13.5%', top: '82%' }} scale={0.9} rotate={-10} iconClass={iconClass}>
          <rect x="7" y="2" width="10" height="20" rx="3" />
          <path d="M13 8l-3 4h4l-3 4" />
        </IconTile>
      </div>

      {/* ৬. ছোট স্পার্কল */}
      <Sparkle style={{ left: '27%', top: '9%', width: 14, height: 14, opacity: 0.8 }} />
      <Sparkle style={{ left: '19%', top: '70%', width: 10, height: 10, opacity: 0.65 }} />
      <Sparkle style={{ right: '25%', top: '16%', width: 10, height: 10, opacity: 0.7 }} />
      <Sparkle style={{ right: '21%', top: '73%', width: 15, height: 15, opacity: 0.8 }} />
      <Sparkle style={{ left: '34%', bottom: '6%', width: 9, height: 9, opacity: 0.55 }} />
      <Sparkle style={{ right: '33%', top: '5%', width: 9, height: 9, opacity: 0.55 }} />
    </div>
  );
}

export default DesktopBackdrop;

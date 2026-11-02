'use client';

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useT } from '@/lib/i18n/useT';
import { BRANDS_ROW_1, BRANDS_ROW_2, type Brand } from '@/lib/brandData';

/**
 * ব্র্যান্ড লোগো মার্কি — দুই সারি:
 *  • প্রথম সারি বাম → ডানে, দ্বিতীয় সারি ডান → বামে, অনন্ত লুপে ঘোরে।
 *  • ঘোরা CSS অ্যানিমেশনে; খুব ধীর গতি (নিচে SPEED_ROW_* দেখুন)।
 *  • যেকোনো এক সারিতে মাউস/আঙ্গুল রাখলে দুই সারিই একসাথে থামে।
 *  • সেকশন স্ক্রিনের বাইরে গেলে, বা কোনো মডাল/ড্রয়ার খোলা থাকলে ঘোরা থেমে থাকে।
 *  • "reduce motion" সেটিং থাকলে ঘোরা বন্ধ থাকে।
 *  • লোগো ট্রান্সপারেন্ট, কোনো বক্স/বর্ডার নেই। ডার্ক মোডে কালো লোগোর সাদা ভার্সন দেখায়।
 *  • ব্র্যান্ড যোগ/বাদ দিতে lib/brandData.ts এডিট করুন।
 *
 * লুপ মসৃণ রাখার কৌশল: প্রতিটি সারিতে একই "গ্রুপ" দুইবার বসানো, ট্র্যাক ঠিক -৫০% সরলে
 * দ্বিতীয় গ্রুপ প্রথমটার জায়গায় এসে যায়। প্রতিটি আইটেমের ডানে padding দিয়ে gap রাখা
 * হয়েছে (margin/gap নয়), তাই -৫০% সবসময় নিখুঁত মেলে।
 * গ্রুপের ভেতরে সেটটা REPEAT বার পুনরাবৃত্ত — যাতে বড় স্ক্রিনেও ফাঁকা জায়গা না দেখায়।
 */

const REPEAT = 3;

// ঘোরার গতি: সংখ্যা যত বড়, তত ধীর (একটা পূর্ণ গ্রুপ ঘুরতে কত সেকেন্ড লাগবে)।
// আগে ৫৫/৪৮ সেকেন্ড ছিল (≈৭০px/সেকেন্ড, খুব দ্রুত); এখন ≈২০px/সেকেন্ড।
// আরও ধীর চাইলে দুটোই বাড়ান, দ্রুত চাইলে কমান।
const SPEED_ROW_1 = 200;
const SPEED_ROW_2 = 170;

const CSS = `
.vc-brand-sec{--vc-s:.78;--vc-gap:38px;--vc-rows:26px}
@media(min-width:640px){.vc-brand-sec{--vc-s:1;--vc-gap:64px;--vc-rows:34px}}
.vc-brand-row{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 3%,#000 97%,transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 3%,#000 97%,transparent 100%)}
.vc-brand-track{display:flex;width:max-content;will-change:transform;animation-duration:var(--vc-dur,50s);animation-timing-function:linear;animation-iteration-count:infinite}
.vc-brand-track.vc-to-left{animation-name:vc-brand-left}
.vc-brand-track.vc-to-right{animation-name:vc-brand-right}
.vc-brand-group{display:flex;flex-shrink:0;align-items:center}
.vc-brand-item{display:flex;flex-shrink:0;align-items:center;height:calc(38px * var(--vc-s));padding-right:var(--vc-gap)}
.vc-brand-item img{display:block;max-width:none;height:auto;-webkit-user-drag:none;user-select:none}
/* লাইট/ডার্ক জোড়া লোগো: নির্দিষ্টতা (specificity) ইচ্ছা করে .vc-brand-item img-এর চেয়ে বেশি,
   নইলে Tailwind-এর hidden/dark:hidden হেরে যায় আর দুটো ভার্সনই একসাথে দেখা যায় */
.vc-brand-item img.vc-l-dark{display:none}
.dark .vc-brand-item img.vc-l-dark{display:block}
.dark .vc-brand-item img.vc-l-light{display:none}
/* থামার শর্ত — একটাই নিয়মে, দুই সারিই একসাথে থামে */
.vc-brand-sec.vc-hold .vc-brand-track,
.vc-brand-sec.vc-offscreen .vc-brand-track,
html.vc-modal-open .vc-brand-track{animation-play-state:paused}
@keyframes vc-brand-left{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}
@keyframes vc-brand-right{from{transform:translate3d(-50%,0,0)}to{transform:translate3d(0,0,0)}}
@media (prefers-reduced-motion:reduce){.vc-brand-track{animation:none}}
`;

function BrandLogo({ b, decorative }: { b: Brand; decorative: boolean }) {
  const style = { width: `calc(${b.w}px * var(--vc-s))` };
  const common = {
    width: b.w,
    height: b.h,
    alt: decorative ? '' : b.name,
    loading: 'lazy' as const,
    decoding: 'async' as const,
    draggable: false,
    style,
  };
  if (b.white) {
    return (
      <>
        <img src={`/brands/${b.file}.webp`} className="vc-l-light" {...common} alt={common.alt} />
        <img src={`/brands/${b.file}-white.webp`} className="vc-l-dark" {...common} alt="" />
      </>
    );
  }
  return <img src={`/brands/${b.file}.webp`} {...common} alt={common.alt} />;
}

function BrandRow({ brands, direction, duration }: { brands: Brand[]; direction: 'left' | 'right'; duration: number }) {
  const renderGroup = (decorative: boolean) => (
    <div className="vc-brand-group" aria-hidden={decorative || undefined}>
      {Array.from({ length: REPEAT }).flatMap((_, rep) =>
        brands.map((b) => (
          <div className="vc-brand-item" key={`${rep}-${b.file}`}>
            <BrandLogo b={b} decorative={decorative || rep > 0} />
          </div>
        )),
      )}
    </div>
  );

  return (
    <div className="vc-brand-row">
      <div
        className={`vc-brand-track ${direction === 'left' ? 'vc-to-left' : 'vc-to-right'}`}
        style={{ ['--vc-dur' as string]: `${duration}s` }}
      >
        {renderGroup(false)}
        {renderGroup(true)}
      </div>
    </div>
  );
}

function TagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

export default function BrandMarquee() {
  const { lang } = useT();
  const en = lang === 'en';
  const secRef = useRef<HTMLElement | null>(null);

  // স্ক্রিনের বাইরে (উপরে বা নিচে) গেলে ঘোরা বন্ধ, কাছাকাছি এলে চালু।
  useEffect(() => {
    const el = secRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => el.classList.toggle('vc-offscreen', !entry.isIntersecting),
      { rootMargin: '80px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // মাউস/আঙ্গুল যেকোনো সারিতে থাকলে দুই সারিই থামে; ছাড়লে (বা স্ক্রল শুরু হলে) আবার চলে।
  // মাউসের ক্ষেত্রে শুধু enter/leave; টাচ/পেনের ক্ষেত্রে press/release (নইলে ক্লিকের পর মাউস
  // সারির উপরে থাকা অবস্থাতেই আবার চলতে শুরু করত)।
  const hold = (on: boolean, onlyTouch = false) => (e: ReactPointerEvent) => {
    if (onlyTouch && e.pointerType === 'mouse') return;
    secRef.current?.classList.toggle('vc-hold', on);
  };

  return (
    <section ref={secRef} className="vc-brand-sec mx-auto mb-14 max-w-[1300px] px-4 sm:px-5 [content-visibility:auto] [contain-intrinsic-size:auto_220px]" id="brandsSec" aria-label={en ? 'Brands we carry' : 'আমাদের ব্র্যান্ডসমূহ'}>
      <style>{CSS}</style>

      <div className="mb-8 text-center">
        <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-brand-light/40 bg-white/80 px-3.5 py-1 font-body text-[11px] font-bold uppercase tracking-wider text-brand-light shadow-xs backdrop-blur-md">
          <TagIcon />
          <span>{en ? 'Brand Collection' : 'ব্র্যান্ড কালেকশন'}</span>
        </div>

        <h2 className="font-body text-2xl font-extrabold text-ink sm:text-[28px]">
          {en ? (
            <>Brands <span className="text-brand-light">We Carry</span></>
          ) : (
            <>আমাদের কালেকশনের <span className="text-brand-light">ব্র্যান্ডসমূহ</span></>
          )}
        </h2>

        <p className="mt-1.5 font-body text-[13px] text-muted sm:text-[14px]">
          {en
            ? 'Popular brand gadgets & accessories, all in one place'
            : 'জনপ্রিয় ব্র্যান্ডের গ্যাজেট ও অ্যাক্সেসরিজ এক জায়গায়'}
        </p>
      </div>

      <div
        className="flex flex-col"
        style={{ rowGap: 'var(--vc-rows)' }}
        onPointerEnter={hold(true)}
        onPointerLeave={hold(false)}
        onPointerDown={hold(true, true)}
        onPointerUp={hold(false, true)}
        onPointerCancel={hold(false, true)}
      >
        <BrandRow brands={BRANDS_ROW_1} direction="right" duration={SPEED_ROW_1} />
        <BrandRow brands={BRANDS_ROW_2} direction="left" duration={SPEED_ROW_2} />
      </div>
    </section>
  );
}

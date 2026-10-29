'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n/useT';
import { makeCatSlug } from '@/lib/categoryData';
import { productHref } from '@/lib/productData';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import type { ShowcaseSpotlight } from '@/lib/showcaseData';
import ScrollReveal from '@/app/components/ui/ScrollReveal';

/**
 * স্পটলাইট প্রোডাক্ট — ২টা সারি, কিন্তু দেখতে একটাই জোড়া-লাগানো প্রিমিয়াম কার্ড:
 *  • হেডিং: গোল পিল → মেইন হেডিং (সাবটাইটেল নেই)।
 *  • দুই সারির মাঝে কোনো ফাঁক নেই — একটা গোল-কোণা কনটেইনারে ঠাসাঠাসি জোড়া, মাঝে শুধু হালকা সূক্ষ্ম রেখা।
 *  • মোবাইলে এই সেকশন পুরোপুরি লুকানো (hidden md:block)। ডেস্কটপ/ট্যাবলেটে পাশাপাশি; প্রথমটায় বামে ছবি, দ্বিতীয়টায় ডানে। দুই সারির উচ্চতা সমান।
 *  • ছবির উপরে কোনো লেখা/আইকন নেই; প্রোডাক্টের নাম লেখার অংশের উপরের ব্যাজে। ছবিতে ক্লিক করলেও প্রোডাক্টে যায়।
 *  • লেখার অংশ: ব্যাজ, শিরোনাম, বিবরণ, টিক-ফিচার তালিকা, শেষ লাইন, আর বাটন।
 *  • ডেটা আসে অ্যাডমিন প্যানেলের "হোম শোকেস" পেজ থেকে (lib/showcaseData.ts দেখুন)।
 */

function ArrowIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-brand ease-brand group-hover:translate-x-1">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5z" />
    </svg>
  );
}

function spotlightHref(s: ShowcaseSpotlight): string {
  if (s.linkType === 'product' && s.productId) {
    return productHref({ id: s.productId, name: s.productName || String(s.productId) });
  }
  return s.catId && s.catId !== 'all' ? `/category/${makeCatSlug(s.catId)}` : '/products';
}

function SpotlightRow({ s, reverse, first }: { s: ShowcaseSpotlight; reverse: boolean; first: boolean }) {
  const { lang } = useT();
  const en = lang === 'en';
  const pick = (bn: string, enText: string) => (en && enText ? enText : bn);
  const href = spotlightHref(s);
  const title = pick(s.title, s.titleEn);
  const product = pick(s.product, s.productEn);
  const features = en && s.featuresEn.length ? s.featuresEn : s.features;
  const note = pick(s.note, s.noteEn);
  const desc = pick(s.desc, s.descEn);

  const image = (
    <div className={`group relative min-h-[260px] overflow-hidden bg-slate-200 ${reverse ? 'md:order-2' : 'md:order-1'}`}>
      {/* মোবাইলে ৫:৪ ফ্রেম; md+ এ সারির পুরো উচ্চতা জুড়ে ছবি cover হয়ে ভরে যায় */}
      <div className="aspect-[5/4] w-full md:aspect-auto md:h-full" aria-hidden="true" />
      <img
        src={optimizeCloudinaryUrl(s.img, 1000)}
        alt={title}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-[1200ms] ease-brand group-hover:scale-[1.05]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" aria-hidden="true" />
      <Link prefetch={false} href={href} aria-label={title} tabIndex={-1} className="absolute inset-0" />

    </div>
  );

  const text = (
    <div className={`flex min-w-0 flex-col justify-center gap-3 p-5 sm:gap-4 sm:p-7 md:p-10 lg:gap-5 lg:p-14 ${reverse ? 'md:order-1' : 'md:order-2'}`}>
      {(product || s.badge) && (
        <span className="inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-brand-light/10 px-3.5 py-1.5 font-body text-[12px] font-bold text-brand-light sm:text-[13px]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" aria-hidden="true" />
          <span className="min-w-0 break-words">{product || pick(s.badge, s.badgeEn)}</span>
        </span>
      )}

      <div className="space-y-2">
        <h3 className="break-words font-body text-[21px] font-extrabold leading-snug text-ink sm:text-[26px] md:text-[30px] md:leading-tight lg:text-[34px]">
          {title}
        </h3>
        {desc && (
          <p className="whitespace-pre-line break-words font-body text-[13.5px] leading-[1.7] text-muted sm:text-[15px]">
            {desc}
          </p>
        )}
      </div>

      {features.length > 0 && (
        <ul className="grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
          {features.map((f, i) => (
            <li key={`${f}-${i}`} className="flex items-start gap-2.5 font-body text-[13px] font-medium leading-snug text-ink sm:text-[14px]">
              <span className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-light text-white" aria-hidden="true">
                <CheckIcon />
              </span>
              <span className="min-w-0 break-words">{f}</span>
            </li>
          ))}
        </ul>
      )}

      {note && (
        <p className="break-words border-l-[3px] border-brand-light/50 pl-3 font-body text-[12.5px] italic leading-relaxed text-muted sm:text-[14px]">
          {note}
        </p>
      )}

      {s.price > 0 && (
        <div className="font-body text-[22px] font-extrabold text-ink sm:text-[26px]">
          ৳{s.price.toLocaleString('en-US')}
        </div>
      )}

      <Link prefetch={false}
        href={href}
        className="group mt-1 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-brand-light px-7 py-3 font-body text-[14px] font-bold text-white shadow-sh2 transition-[background-color,transform,box-shadow] duration-brand hover:bg-[#3C93DE] hover:shadow-sh3 active:scale-95 sm:w-fit sm:py-3.5 sm:text-[15px]"
      >
        {pick(s.btn, s.btnEn)}
        <ArrowIcon />
      </Link>
    </div>
  );

  return (
    <div
      className={`grid items-stretch bg-gradient-to-br ${
        first
          ? 'from-[#F0F8FF] to-white dark:from-brand-dark-surface dark:to-brand-dark-surface'
          : 'from-white to-[#E8F3FE] dark:from-brand-dark-card dark:to-brand-dark-surface border-t border-brand-light/15'
      } grid-cols-1 md:min-h-[520px] lg:min-h-[560px] ${reverse ? 'md:grid-cols-[1fr_42%] lg:grid-cols-[1fr_40%]' : 'md:grid-cols-[42%_1fr] lg:grid-cols-[40%_1fr]'}`}
    >
      {image}
      {text}
    </div>
  );
}

interface Props {
  items: ShowcaseSpotlight[];
}

export default function SpotlightSection({ items }: Props) {
  const { lang } = useT();
  const en = lang === 'en';
  const visible = items.filter((s) => s.enabled);
  if (!visible.length) return null;

  return (
    <section className="mx-auto mb-14 hidden max-w-[1300px] px-4 sm:px-5 md:block" id="spotlightSec" aria-label={en ? 'Featured gadgets' : 'ফিচার্ড গ্যাজেট'}>
      {/* ── হেডিং: পিল → মেইন হেডিং → সাবটাইটেল ── */}
      <ScrollReveal>
        <div className="mb-7 text-center sm:mb-9">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-brand-light/40 bg-white/80 px-3.5 py-1 font-body text-[11px] font-bold uppercase tracking-wider text-brand-light shadow-xs backdrop-blur-md">
            <StarIcon />
            <span>{en ? 'Featured Gadgets' : 'ফিচার্ড গ্যাজেট'}</span>
          </div>

          <h2 className="font-body text-2xl font-extrabold text-ink sm:text-[28px]">
            {en ? (
              <>Picked <span className="text-brand-light">Just for You</span></>
            ) : (
              <>শুধু আপনার জন্য <span className="text-brand-light">বাছাই করা</span></>
            )}
          </h2>
        </div>
      </ScrollReveal>

      {/* ── জোড়া-লাগানো একটাই কার্ড: মাঝে কোনো ফাঁক নেই ── */}
      <ScrollReveal>
        <div className="overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-sh2 dark:border-brand-dark-border dark:bg-brand-dark-surface sm:rounded-[28px]">
          {visible.map((s, i) => (
            <SpotlightRow key={`${s.title}-${i}`} s={s} reverse={i % 2 === 1} first={i === 0} />
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}

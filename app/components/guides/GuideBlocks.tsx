'use client';

import { useRef, useState } from 'react';
import useCloseWhenOffscreen from '@/lib/useCloseWhenOffscreen';
import Link from 'next/link';
import Image from 'next/image';
import type {
  GuideBlock,
  LocalizedText,
  CardGridBlock,
  PriceTableBlock,
  ComparisonTableBlock,
  StepsBlock,
  ChecklistBlock,
  ImageTextBlock,
  FaqBlock,
  RelatedLinksBlock,
  GalleryBlock,
  CtaBlock,
  HeroBlock,
  RichTextBlock,
  ProductRecommendationBlock,
} from '@/types/guides';
import { GuideIcon, GuideCheckboxIcon, GuideChevronIcon, GuideArrowRightIcon } from './GuideIcons';
import { renderLinkedText } from '@/lib/linkedText';

type Lang = 'bn' | 'en';

export interface ProductSnapshot {
  id: number | string;
  name: string;
  nameBn?: string;
  price: number;
  old?: number;
  image: string;
  href: string;
}

const t = (v: LocalizedText, lang: Lang) => v[lang];
const tl = (v: LocalizedText, lang: Lang) => renderLinkedText(v[lang]);

function Container({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[880px] px-4 sm:px-5 ${className}`}>{children}</div>;
}

function WideContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1100px] px-4 sm:px-5 ${className}`}>{children}</div>;
}

// 🛠️ ফিক্স (দ্বিতীয় দফা): প্রথম দফায় শুধু headless ব্লকের *উপরের* প্যাডিং
// কমানো হয়েছিল — কিন্তু headless ব্লকের নিজের *নিচের* প্যাডিং, আর তার আগের
// (headed) ব্লকের নিচের প্যাডিং তখনও পুরো `py-8`/`pb-8` থেকে যেত। ফলে lead
// প্যারাগ্রাফ → headless checklist/steps → headless trail প্যারাগ্রাফ — এই
// টানা সিকোয়েন্সে প্রতিটা জোড়ার মাঝখানে তখনও প্রায় ৩৬px ফাঁকা গ্যাপ থেকে
// যাচ্ছিল (স্ক্রিনশটে আবার রিপোর্ট হওয়া সমস্যা)। এখন প্রতিটা ব্লকের স্পেসিং
// তার *নিজের* heading থাকা/না-থাকা (উপরের গ্যাপ) আর *পরের* ব্লকের heading
// থাকা/না-থাকা (নিচের গ্যাপ) — দুটো মিলিয়ে ঠিক হয়, যাতে একই সেকশনের ভেতরের
// সবগুলো টুকরা (lead + list + trail) একসাথে একটানা দেখায়, কিন্তু দুটো আলাদা
// সেকশনের মাঝে (যেখানে পরের ব্লকের নিজস্ব heading আছে) স্বাভাবিক বড় প্যাডিং
// বজায় থাকে। শূন্য (একদম গ্যাপ-ছাড়া) না রেখে ইচ্ছাকৃতভাবে অল্প একটু স্পেস
// (৪px) রাখা হয়েছে, যাতে টুকরাগুলো একদম গায়ে-গায়ে লেগে না যায়।
const CONTINUATION_TYPES = new Set(['richText', 'checklist', 'steps']);

function isContinuationBlock(block?: GuideBlock): boolean {
  if (!block) return false;
  if (!CONTINUATION_TYPES.has(block.type)) return false;
  const heading = (block as { heading?: LocalizedText }).heading;
  return !heading || (!heading.bn?.trim() && !heading.en?.trim());
}

function sectionPad(block: GuideBlock, nextBlock?: GuideBlock): string {
  const top = isContinuationBlock(block) ? 'pt-1' : 'pt-8';
  const bottom = isContinuationBlock(nextBlock) ? 'pb-1' : 'pb-8';
  return `${top} ${bottom}`;
}

function getHeadingIcon(icon?: string, headingText?: string): string {
  if (icon && icon !== 'spark') return icon;
  if (!headingText) return icon || 'spark';
  const lower = headingText.toLowerCase();
  if (/পার্থক্য|তুলনা|vs|ভার্সাস|compare|difference/i.test(lower)) return 'scale';
  if (/neon gas|আসল কথা|গ্যাস|bulb|বাল্ব|কেন|কীভাবে|জানুন|idea/i.test(lower)) return 'bulb';
  if (/কখন কোনটা|বেছে নেবেন|পছন্দ|choose|choice|which|target/i.test(lower)) return 'target';
  if (/কোথায় পড়ে|কোথায়|স্থান|অবস্থান|where|pin|ক্যাটাগরি/i.test(lower)) return 'pin';
  if (/উচিত না|ভুল|সতর্ক|সাবধান|warning|mistake|avoid|never/i.test(lower)) return 'warning';
  if (/চেকলিস্ট|চেক|তালিকা|checklist|check/i.test(lower)) return 'clipboard';
  if (/প্রসেস|পদ্ধতি|ধাপ|স্টেপ|process|step|install|লাগাবেন/i.test(lower)) return 'wrench';
  if (/দাম|খরচ|বাজেট|price|cost|budget|টাকা/i.test(lower)) return 'wallet';
  if (/প্রশ্ন|faq|question|জিজ্ঞাসা/i.test(lower)) return 'question';
  if (/রিমোট|অ্যাপ|remote|app|control/i.test(lower)) return 'remote';
  if (/কালার|রং|color|colour|rgb|ডিজাইন|design/i.test(lower)) return 'palette';
  if (/প্রকার|ধরন|লেয়ার|layers|type/i.test(lower)) return 'layers';
  if (/বক্স|প্যাকেজ|box|package/i.test(lower)) return 'box';
  return icon || 'spark';
}

function BlockHeading({ text, lang, icon }: { text?: LocalizedText; lang: Lang; icon?: string }) {
  if (!text) return null;
  const rawText = t(text, lang);
  const resolvedIcon = getHeadingIcon(icon, text.bn + ' ' + text.en);
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
        <GuideIcon name={resolvedIcon} className="h-[17px] w-[17px]" />
      </div>
      <h2 className="font-body text-[19px] font-extrabold text-ink sm:text-[22px]">{rawText}</h2>
    </div>
  );
}

function ImageOrPlaceholder({
  image,
  lang,
  aspect = 'aspect-[4/3]',
  sizes = '(min-width: 768px) 500px, 100vw',
}: {
  image?: { url: string; alt: LocalizedText };
  lang: Lang;
  aspect?: string;
  sizes?: string;
}) {
  if (image?.url) {
    return (
      <div className={`relative w-full overflow-hidden rounded-2xl bg-brand-bg/40 ${aspect}`}>
        <Image src={image.url} alt={t(image.alt, lang)} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-border-base bg-brand-bg/20 ${aspect}`}
    >
      <span className="px-4 text-center font-body text-[12.5px] text-muted">
        {lang === 'en' ? 'Photo to be added' : 'এখানে বাস্তব ছবি যোগ করা হবে'}
      </span>
    </div>
  );
}

function HeroBlockView({ block, lang }: { block: HeroBlock; lang: Lang }) {
  return (
    <section className="border-b border-border-base bg-gradient-to-b from-brand-bg/35 via-[#DCEBFD]/45 to-white">
      <WideContainer className="grid gap-8 pt-6 pb-10 sm:pt-10 sm:pb-14 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          {block.eyebrow && (
            <div className="mb-3 inline-flex items-center rounded-full border border-brand-light/35 bg-white/90 px-3.5 py-1 font-body text-[11px] font-bold uppercase tracking-wider text-brand-light shadow-2xs">
              {t(block.eyebrow, lang)}
            </div>
          )}
          <h1 className="font-body text-[26px] font-extrabold leading-tight text-ink sm:text-[34px]">
            {t(block.title, lang)}
          </h1>
          {block.subtitle && (
            <p className="mt-3 max-w-[560px] font-body text-[15.5px] leading-[1.85] text-muted sm:text-[16px]">
              {t(block.subtitle, lang)}
            </p>
          )}
        </div>
        <ImageOrPlaceholder image={block.image} lang={lang} aspect="aspect-[5/4]" />
      </WideContainer>
    </section>
  );
}

function RichTextBlockView({ block, lang, nextBlock }: { block: RichTextBlock; lang: Lang; nextBlock?: GuideBlock }) {
  return (
    <Container className={sectionPad(block, nextBlock)}>
      <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon} />
      <div className="space-y-3.5 font-body text-[15.5px] leading-[1.9] text-ink/85">
        {block.paragraphs.map((p, i) => (
          <p key={i}>{tl(p, lang)}</p>
        ))}
      </div>
    </Container>
  );
}

function CardGridBlockView({ block, lang }: { block: CardGridBlock; lang: Lang }) {
  const colsClass =
    block.columns === 2
      ? 'sm:grid-cols-2'
      : block.columns === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : 'sm:grid-cols-3';

  return (
    <WideContainer className="py-8">
      <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon} />
      <div className={`grid grid-cols-1 gap-4 ${colsClass}`}>
        {block.cards.map((card, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-base bg-white/95 p-5 shadow-xs transition-colors hover:border-brand-light/40"
          >
            {/* 🛠️ ফিক্স: card.icon (keyword-ভিত্তিক inference) কোনো কোনো টাইটেলে
                ম্যাচ পেত, কোনোটায় পেত না ('spark' ডিফল্টে পড়লে হাইড হতো) —
                ফলে একই cardGrid-এর প্রথম কার্ডে কোনো আইকন নেই, পরেরগুলোতে আছে,
                এই অসামঞ্জস্যপূর্ণ চেহারা দেখা যেত (স্ক্রিনশটে রিপোর্ট হয়েছিল)।
                সিদ্ধান্ত: এই সাদা লেআউট কার্ডের ভেতরে কোনো হেডিং আইকন থাকবে না,
                সবসময়ই না — সেকশনের নিজের হেডিং আইকন (উপরে BlockHeading-এ)
                ইতিমধ্যে আছে, প্রতিটা কার্ডে আলাদা আইকন দরকার নেই। */}
            {card.tag && (
              <div className="mb-1 font-body text-[11px] font-bold uppercase tracking-wide text-brand-light">
                {t(card.tag, lang)}
              </div>
            )}
            <h3 className="mb-2 font-body text-[15.5px] font-bold text-ink leading-snug">{tl(card.title, lang)}</h3>
            <p className="font-body text-[14.5px] sm:text-[15px] leading-[1.8] text-muted">{tl(card.description, lang)}</p>
          </div>
        ))}
      </div>
    </WideContainer>
  );
}

function PriceTableBlockView({ block, lang }: { block: PriceTableBlock; lang: Lang }) {
  return (
    <Container className="py-8">
      <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon || 'wallet'} />
      <div className="sleek-scrollbar overflow-x-auto rounded-2xl border border-border-base shadow-xs">
        <table className="w-full min-w-[500px] border-collapse font-body text-[14px]">
          <thead>
            <tr className="bg-brand-bg/40 text-left">
              <th className="px-4 py-3 font-bold text-ink whitespace-nowrap">{lang === 'en' ? 'Type' : 'ধরন'}</th>
              <th className="px-4 py-3 font-bold text-ink whitespace-nowrap">{lang === 'en' ? 'Unit' : 'ইউনিট'}</th>
              <th className="px-4 py-3 text-right font-bold text-ink whitespace-nowrap">
                {lang === 'en' ? 'Price Range (BDT)' : 'দামের রেঞ্জ (BDT)'}
              </th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} className={i % 2 ? 'bg-white' : 'bg-brand-bg/10'}>
                <td className="border-t border-border-base px-4 py-3 font-medium text-ink">{t(row.label, lang)}</td>
                <td className="border-t border-border-base px-4 py-3 text-muted whitespace-nowrap">
                  {row.unit ? t(row.unit, lang) : '—'}
                </td>
                <td className="border-t border-border-base px-4 py-3 text-right font-extrabold text-brand-light whitespace-nowrap">
                  {row.priceRangeBdt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.note && <p className="mt-3 font-body text-[13px] leading-[1.75] text-muted">{tl(block.note, lang)}</p>}
    </Container>
  );
}

function ComparisonTableBlockView({ block, lang }: { block: ComparisonTableBlock; lang: Lang }) {
  return (
    <WideContainer className="py-8">
      <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon || 'scale'} />
      <div className="overflow-x-auto rounded-2xl border border-border-base shadow-xs">
        <table className="w-full min-w-[560px] border-separate border-spacing-0 font-body text-[14px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[#DCEBFD] px-4 py-3 text-left font-bold text-ink shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                {lang === 'en' ? 'Feature' : 'বিষয়'}
              </th>
              {block.columnHeaders.map((h, i) => (
                <th key={i} className="bg-brand-bg/40 px-4 py-3 text-left font-bold text-ink">
                  {t(h, lang)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => {
              const rowBg = i % 2 ? 'bg-white' : 'bg-[#EFF6FF]';
              return (
                <tr key={i}>
                  <td
                    className={`sticky left-0 z-10 border-t border-border-base px-4 py-3 font-bold text-ink shadow-[2px_0_4px_rgba(0,0,0,0.06)] ${rowBg}`}
                  >
                    {t(row.label, lang)}
                  </td>
                  {row.values.map((v, j) => (
                    <td key={j} className={`border-t border-border-base px-4 py-3 text-ink/85 ${rowBg}`}>
                      {tl(v, lang)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </WideContainer>
  );
}

// 🛠️ ফিক্স: আগে প্রতিটা numbered step সবসময় একটা বর্ডার-বক্স কার্ড হিসেবে
// রেন্ডার হতো, description না থাকলেও। ছোট, এক-লাইনের step-এ (যেমন App connect
// করার ৫টা ধাপ, শুধু title, কোনো image/warning নেই) এই ভারী বক্স-লেআউট
// দরকারের চেয়ে বেশি স্পেস নেয় আর ফাঁকা/অসম্পূর্ণ দেখায় (স্ক্রিনশটে রিপোর্ট
// হওয়া "অতিরিক্ত স্পেস" সমস্যা)। এখন block-এর কোনো step-এ image বা warning
// (সত্যিকারের রিচ কনটেন্ট) না থাকলে পুরো ব্লকটা compact, box-ছাড়া numbered
// লিস্ট হিসেবে দেখায় — একটা step-এও image/warning থাকলে (ইনস্টলেশন গাইডে
// ভবিষ্যতে ছবি-সহ ধাপ যোগ হলে যেমন হতে পারে) পুরো ব্লকই আগের রিচ কার্ড-লেআউটে
// থেকে যায়, যাতে সেই richer content-এর জন্য দরকারি ভিজ্যুয়াল বিভাজন বজায় থাকে।
function StepsBlockView({ block, lang, nextBlock }: { block: StepsBlock; lang: Lang; nextBlock?: GuideBlock }) {
  const isRich = block.steps.some((s) => Boolean(s.image?.url) || Boolean(s.warning));

  if (!isRich) {
    return (
      <Container className={sectionPad(block, nextBlock)}>
        <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon || 'wrench'} />
        <ol className="space-y-2.5">
          {block.steps.map((step, i) => {
            const desc = tl(step.description, lang);
            return (
              <li key={i} className="flex items-start gap-2.5 font-body text-[15px] leading-[1.75] text-ink/85">
                <span className="mt-0.5 shrink-0 font-bold text-brand-light">{i + 1}.</span>
                <span>
                  <span className="font-bold text-ink">{tl(step.title, lang)}</span>
                  {desc ? <> — {desc}</> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </Container>
    );
  }

  return (
    <Container className={sectionPad(block, nextBlock)}>
      <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon || 'wrench'} />
      <div className="space-y-4">
        {block.steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-3.5 rounded-2xl border border-border-base/80 bg-white/90 p-4 sm:p-5 shadow-2xs"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-bg/60 font-body text-xs font-extrabold text-brand-light mt-0.5">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1.5 font-body text-[15.5px] font-bold text-ink leading-snug">{tl(step.title, lang)}</h3>
              {tl(step.description, lang) && (
                <p className="font-body text-[14.5px] sm:text-[15px] leading-[1.8] text-muted">{tl(step.description, lang)}</p>
              )}
              {step.warning && (
                <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 font-body text-[13.5px] text-amber-800 leading-relaxed">
                  {tl(step.warning, lang)}
                </div>
              )}
              {step.image?.url && (
                <div className="mt-3.5 max-w-[360px]">
                  <ImageOrPlaceholder image={step.image} lang={lang} aspect="aspect-[4/3]" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}

// heading-এ সত্যিকারের "checklist" শব্দ না থাকলে (যেমন "কোন কাজে কোনটা ভালো"-
// জাতীয় use-case ম্যাপিং লিস্ট) এটা আসলে চেক-করার তালিকা না, স্রেফ তথ্যমূলক
// বুলেট-পয়েন্ট — সেক্ষেত্রে ✅ checkbox আইকন না দেখিয়ে সাধারণ বুলেট দেখানো হয়।
// block.style (guide-content-parser.ts পার্স-টাইমে সেট করে) থাকলে সেটাই
// চূড়ান্ত সিদ্ধান্ত; পুরনো ডেটায় (এই ফিল্ড যোগ হওয়ার আগে সেভ করা) style না
// থাকলে heading টেক্সট দেখে একই হিউরিস্টিক ফলব্যাক হিসেবে চালানো হয়।
const CHECKLIST_HEADING_PATTERN = /চেকলিস্ট|চেক\s*লিস্ট|check\s*-?\s*list/i;

function isChecklistHeading(text?: LocalizedText): boolean {
  if (!text) return true; // heading না থাকলে (lead paragraph-এ সরে গেছে) আগের আচরণই নিরাপদ ডিফল্ট
  return CHECKLIST_HEADING_PATTERN.test(text.bn) || CHECKLIST_HEADING_PATTERN.test(text.en);
}

function ChecklistBlockView({ block, lang, nextBlock }: { block: ChecklistBlock; lang: Lang; nextBlock?: GuideBlock }) {
  const showCheckbox = block.style ? block.style === 'checkbox' : isChecklistHeading(block.heading);
  return (
    <Container className={sectionPad(block, nextBlock)}>
      <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon || (showCheckbox ? 'clipboard' : 'spark')} />
      <ul className="space-y-3">
        {block.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 font-body text-[15px] leading-[1.75] text-ink/85">
            {showCheckbox ? (
              <GuideCheckboxIcon className="mt-0.5 shrink-0 text-brand-light" />
            ) : (
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-light" aria-hidden="true" />
            )}
            <span>{tl(item, lang)}</span>
          </li>
        ))}
      </ul>
    </Container>
  );
}

function ImageTextBlockView({ block, lang }: { block: ImageTextBlock; lang: Lang }) {
  const imageFirst = block.imageSide === 'left';
  return (
    <WideContainer className="py-8">
      <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
        <div className={imageFirst ? 'sm:order-1' : 'sm:order-2'}>
          <ImageOrPlaceholder image={block.image} lang={lang} aspect="aspect-[4/3]" />
        </div>
        <div className={imageFirst ? 'sm:order-2' : 'sm:order-1'}>
          <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon} />
          <div className="space-y-3 font-body text-[15px] sm:text-[15.5px] leading-[1.85] text-ink/85">
            {block.paragraphs.map((p, i) => (
              <p key={i}>{tl(p, lang)}</p>
            ))}
          </div>
        </div>
      </div>
    </WideContainer>
  );
}

function ProductRecommendationBlockView({
  block,
  lang,
  product,
}: {
  block: ProductRecommendationBlock;
  lang: Lang;
  product?: ProductSnapshot | null;
}) {
  if (!product) return null;
  const title = lang === 'bn' && product.nameBn ? product.nameBn : product.name;

  return (
    <Container className="py-8">
      <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon} />
      <Link prefetch={false}
        href={product.href}
        className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-brand-light/30 bg-gradient-to-br from-[#F0F7FF] via-white to-white p-4 shadow-sh1 transition-transform hover:scale-[1.01] sm:flex-row sm:items-center"
      >
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-white sm:h-24 sm:w-24">
          <Image src={product.image} alt={title} fill sizes="200px" className="object-contain p-1.5" />
        </div>
        <div className="flex-1">
          <h3 className="font-body text-[16px] font-bold text-ink">{title}</h3>
          {block.blurb && (
            <p className="mt-1 font-body text-[13.5px] sm:text-[14px] leading-[1.75] text-muted">{tl(block.blurb, lang)}</p>
          )}
          <div className="mt-2 font-body text-[16px] font-extrabold text-brand-light">
            ৳{product.price.toLocaleString('en-US')}
          </div>
        </div>
        <div className="shimmer-sheen inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-gradient-to-r from-info to-brand-light px-5 py-2.5 font-body text-[13.5px] font-bold text-white shadow-sh2 sm:self-center">
          {lang === 'en' ? 'View Product' : 'প্রোডাক্ট দেখুন'}
          <GuideArrowRightIcon className="h-4 w-4" />
        </div>
      </Link>
    </Container>
  );
}

function FaqBlockView({ block, lang }: { block: FaqBlock; lang: Lang }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  // খোলা প্রশ্নটা স্ক্রলে পুরোপুরি স্ক্রিনের বাইরে চলে গেলে অটো-বন্ধ
  useCloseWhenOffscreen(openIndex, itemRefs, () => setOpenIndex(null));

  return (
    <Container className="py-8">
      <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon || 'question'} />
      <div className="space-y-3">
        {block.items.map((item, i) => {
          const open = openIndex === i;
          return (
            <div
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={`overflow-hidden rounded-[16px] border transition-colors duration-200 ${
                open
                  ? 'border-brand-light/50 bg-gradient-to-br from-[#F0F7FF] via-white to-white shadow-sh1 ring-1 ring-brand-light/20'
                  : 'border-border-base bg-white/95 shadow-xs hover:border-brand-light/40 hover:bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full cursor-pointer select-none items-center justify-between gap-3 p-4 text-left font-body text-[15px] font-bold text-ink sm:p-[17px]"
              >
                <span className="leading-snug">{t(item.question, lang)}</span>
                <GuideChevronIcon
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                    open ? 'rotate-180 text-brand-light' : 'text-muted'
                  }`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  open ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="border-t border-brand-light/15 px-4 pb-4 pt-3 font-body text-[14.5px] sm:text-[15px] leading-[1.85] text-ink/80 sm:px-[18px] sm:pb-[18px]">
                    <div className="border-l-2 border-brand-light/60 pl-3.5">{tl(item.answer, lang)}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Container>
  );
}

// 🛠️ ফিক্স: আগে প্রতিটা related-link একটা সাদা বর্ডার-বক্স কার্ড হিসেবে দেখানো
// হতো (FAQ ব্লকের বক্স-লেআউটের সাথে দৃশ্যত গুলিয়ে যেত) — কিন্তু এই সেকশন
// (যেমন "সংশ্লিষ্ট গাইড ও পেজসমূহ") আসলে একটা সাধারণ নীল-লিংক লিস্ট হওয়ার কথা,
// কোনো সাদা বক্স/বর্ডার ছাড়া। এখন প্রতিটা আইটেম প্লেইন blue underline link
// হিসেবে সারিবদ্ধভাবে দেখায়, renderLinkedText-এর লিংক-স্টাইলের সাথে সামঞ্জস্যপূর্ণ।
function RelatedLinksBlockView({
  block,
  lang,
  hrefMap,
}: {
  block: RelatedLinksBlock;
  lang: Lang;
  hrefMap?: Record<string, string>;
}) {
  return (
    <Container className="py-8">
      <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon || 'linkChain'} />
      <ul className="space-y-2.5">
        {block.items.map((item, i) => {
          const resolvedHref = (item.targetPageId && hrefMap?.[item.targetPageId]) || item.href || '#';
          return (
            <li key={i}>
              <Link prefetch={false}
                href={resolvedHref}
                className="group inline-flex items-center gap-1.5 font-body text-[14.5px] font-semibold text-brand-light underline decoration-brand-light/40 underline-offset-2 hover:decoration-brand-light sm:text-[15px]"
              >
                {t(item.title, lang)}
                <GuideArrowRightIcon className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}

function GalleryBlockView({ block, lang }: { block: GalleryBlock; lang: Lang }) {
  return (
    <WideContainer className="py-8">
      <BlockHeading text={block.heading} lang={lang} icon={block.headingIcon || 'camera'} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {block.items.map((item, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border-base bg-white shadow-xs">
            <ImageOrPlaceholder image={item.image} lang={lang} aspect="aspect-square" sizes="240px" />
            {item.caption && (
              <div className="p-2.5 font-body text-[12.5px] sm:text-[13px] leading-snug text-muted">{t(item.caption, lang)}</div>
            )}
          </div>
        ))}
      </div>
    </WideContainer>
  );
}

function CtaBlockView({ block, lang, hrefMap }: { block: CtaBlock; lang: Lang; hrefMap?: Record<string, string> }) {
  const resolvedHref = (block.targetPageId && hrefMap?.[block.targetPageId]) || block.href || '#';
  return (
    <Container className="py-8">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-br from-[#F0F7FF] via-white to-white p-8 text-center shadow-sh1 ring-1 ring-brand-light/20">
        <h2 className="font-body text-[19px] font-extrabold text-ink">{t(block.heading, lang)}</h2>
        <Link prefetch={false}
          href={resolvedHref}
          className="shimmer-sheen rounded-full bg-gradient-to-r from-info to-brand-light px-7 py-[13.5px] font-body text-[15px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03] active:scale-95"
        >
          {t(block.buttonLabel, lang)}
        </Link>
      </div>
    </Container>
  );
}

export function GuideBlockRenderer({
  block,
  lang,
  productSnapshots,
  relatedLinkHrefs,
  nextBlock,
}: {
  block: GuideBlock;
  lang: Lang;
  productSnapshots?: Record<number, ProductSnapshot>;
  relatedLinkHrefs?: Record<string, string>;
  /** পরের ব্লকটা কী — শুধু স্পেসিং হিসাব করতে ব্যবহার হয় (দেখুন sectionPad)।
   *  পেজে ব্লকগুলো লিস্ট আকারে বসানোর সময় `blocks[i+1]` পাঠিয়ে দিলেই হবে। */
  nextBlock?: GuideBlock;
}) {
  switch (block.type) {
    case 'hero':
      return <HeroBlockView block={block} lang={lang} />;
    case 'richText':
      return <RichTextBlockView block={block} lang={lang} nextBlock={nextBlock} />;
    case 'cardGrid':
      return <CardGridBlockView block={block} lang={lang} />;
    case 'priceTable':
      return <PriceTableBlockView block={block} lang={lang} />;
    case 'comparisonTable':
      return <ComparisonTableBlockView block={block} lang={lang} />;
    case 'steps':
      return <StepsBlockView block={block} lang={lang} nextBlock={nextBlock} />;
    case 'checklist':
      return <ChecklistBlockView block={block} lang={lang} nextBlock={nextBlock} />;
    case 'imageText':
      return <ImageTextBlockView block={block} lang={lang} />;
    case 'productRecommendation':
      return (
        <ProductRecommendationBlockView
          block={block}
          lang={lang}
          product={productSnapshots?.[block.productId]}
        />
      );
    case 'faq':
      return <FaqBlockView block={block} lang={lang} />;
    case 'relatedLinks':
      return <RelatedLinksBlockView block={block} lang={lang} hrefMap={relatedLinkHrefs} />;
    case 'gallery':
      return <GalleryBlockView block={block} lang={lang} />;
    case 'cta':
      return <CtaBlockView block={block} lang={lang} hrefMap={relatedLinkHrefs} />;
    default:
      return null;
  }
}

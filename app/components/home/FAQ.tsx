'use client';

import { useRef, useState } from 'react';
import { useT } from '@/lib/i18n/useT';
import useCloseWhenOffscreen from '@/lib/useCloseWhenOffscreen';
import { DEFAULT_FAQS } from '@/lib/faqData';
import { renderLinkedText } from '@/lib/linkedText';

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SupportHelpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function FAQ() {
  const { t, lang } = useT();
  // vc_faqs সেটিংটা এখন অ্যাডমিন প্যানেল থেকে এডিট করার কোনো উপায় নেই (ফিচার
  // সরানো হয়েছে), তাই Supabase-এ বারবার খুঁজে দেখার দরকার নেই — সবসময় নিচের
  // ডিফল্ট তালিকাটাই দেখানো হবে।
  const faqs = DEFAULT_FAQS; // বাংলা + ইংরেজি দুই ভার্সনই lib/faqData.ts-এ
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  // খোলা প্রশ্নটা স্ক্রলে পুরোপুরি স্ক্রিনের বাইরে চলে গেলে অটো-বন্ধ
  useCloseWhenOffscreen(openIndex, itemRefs, () => setOpenIndex(null));

  const toggleFAQ = (i: number) => {
    setOpenIndex((prev) => (prev === i ? null : i));
  };

  return (
    <div className="mx-auto mb-14 max-w-[1300px] px-4 sm:px-5 [contain:content] [transform:translateZ(0)] [content-visibility:auto] [contain-intrinsic-size:auto_640px]" id="faqSec">
      <div className="mb-8 text-center">
        <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-brand-light/35 bg-white/90 px-3.5 py-1 font-body text-[11px] font-bold uppercase tracking-wider text-brand-light shadow-2xs">
          <SupportHelpIcon />
          <span>{lang === 'en' ? 'Help & Support' : 'কাস্টমার সাপোর্ট'}</span>
        </div>
        
        <h2 className="font-body text-2xl font-extrabold text-ink sm:text-[28px]">
          {lang === 'en' ? (
            <>Frequently Asked <span className="text-brand-light">Questions</span></>
          ) : (
            <>সাধারণ জিজ্ঞাসা ও <span className="text-brand-light">উত্তর</span></>
          )}
        </h2>
        
        <p className="mt-1.5 font-body text-[13px] text-muted sm:text-[14px]">
          {lang === 'en'
            ? 'Everything you need to know about orders, payment, delivery & replacement'
            : 'অর্ডার, পেমেন্ট, ডেলিভারি ও রিপ্লেসমেন্ট সম্পর্কিত আপনার প্রশ্নের উত্তর'}
        </p>
      </div>

      <div className="mx-auto max-w-[760px] space-y-3">
        {faqs.map((f, i) => {
          const open = openIndex === i;
          return (
            <div
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={`overflow-hidden rounded-[16px] border transition-colors duration-200 [contain:paint_layout] [transform:translateZ(0)] ${
                open
                  ? 'border-brand-light/50 bg-gradient-to-br from-[#F0F7FF] via-white to-white shadow-sh1 ring-1 ring-brand-light/20'
                  : 'border-border-base bg-gradient-to-br from-[#F0F7FF] via-white to-[#EFF6FE]/75 shadow-xs hover:border-brand-light/40'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleFAQ(i)}
                className="flex w-full cursor-pointer select-none items-center justify-between gap-3 p-4 sm:p-[17px] text-left font-body text-[14px] font-bold text-ink transition-colors"
              >
                <span className="leading-snug">{lang === 'en' ? (f.qEn ?? t(f.q)) : f.q}</span>
                <ChevronIcon
                  className={`shrink-0 transition-transform duration-300 ${
                    open ? 'rotate-180 text-brand-light' : 'text-muted'
                  }`}
                />
              </button>

              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="border-t border-brand-light/15 px-4 pb-4 pt-3 sm:px-[18px] sm:pb-[18px] font-body text-[13.5px] leading-[1.8] text-ink/80">
                    <div className="border-l-2 border-brand-light/60 pl-3.5">
                      {renderLinkedText(lang === 'en' ? (f.aEn ?? t(f.a)) : f.a)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

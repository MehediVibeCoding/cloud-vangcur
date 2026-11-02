'use client';

// ফাইলের পাথ: app/components/checkout/WaitingTip.tsx
// [NEW ব্যাচ ১৫] ওয়েটিং পেজ/ওভারলের নীল টিপ-বক্স: সবসময় ঠিক দুই লাইন —
//   লাইন ১ = আইকন + "আপনি চাইলে এখন ওয়েবসাইট ব্রাউজ করতে পারেন অথবা গেম খেলতে পারেন।"
//   লাইন ২ = "অর্ডার কনফার্ম হলে স্বয়ংক্রিয় নোটিফিকেশন দেখাবে।"
// আগে লেখাটা সাধারণ ফ্লো-টেক্সট ছিল, তাই সরু/মাঝারি স্ক্রিনে লাইন ১ নিজেই ভেঙে মোট ৩ লাইন হতো আর আইকন আলাদা পড়ত।
// এখন প্রতিটা লাইন nowrap, আর বক্সের আসল প্রস্থ মেপে ফন্ট-সাইজ ১২px থেকে সর্বনিম্ন ৯.৫px পর্যন্ত ছোট হয় —
// যাতে লাইন ভাঙে না। এতটাই সরু হলে (৯.৫px-এও না ধরলে) তখনই কেবল স্বাভাবিক র‍্যাপে ফেরে।

import { useEffect, useLayoutEffect, useRef } from 'react';

const BASE_PX = 12;
const MIN_PX = 9.5;
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function WaitingTip({
  icon,
  line1,
  line2,
  className = '',
}: {
  icon: React.ReactNode;
  line1: string;
  line2: string;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const l1Ref = useRef<HTMLDivElement>(null);
  const l2Ref = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const box = boxRef.current;
    const body = bodyRef.current;
    const a = l1Ref.current;
    const b = l2Ref.current;
    if (!box || !body || !a || !b) return;

    const fit = () => {
      const cs = getComputedStyle(box);
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (avail <= 0) return;
      // বেস সাইজে প্রতিটা লাইনের স্বাভাবিক (nowrap) প্রস্থ মাপি
      body.style.fontSize = `${BASE_PX}px`;
      a.style.whiteSpace = 'nowrap';
      b.style.whiteSpace = 'nowrap';
      const need = Math.max(a.scrollWidth, b.scrollWidth);
      if (need <= avail) return; // ১২px-এই ধরে গেছে
      const px = (BASE_PX * avail) / need;
      if (px >= MIN_PX) {
        body.style.fontSize = `${Math.floor(px * 10) / 10}px`;
      } else {
        // খুবই সরু — অগত্যা র‍্যাপ (ছোট ফন্টে), এখনো আইকন লাইন ১-এর সাথেই থাকে
        body.style.fontSize = `${MIN_PX + 1}px`;
        a.style.whiteSpace = 'normal';
        b.style.whiteSpace = 'normal';
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    // কাস্টম ফন্ট লোড হওয়ার পর প্রস্থ বদলায় — তখন আবার মাপি
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    let alive = true;
    fonts?.ready?.then(() => { if (alive) fit(); });
    return () => { alive = false; ro.disconnect(); };
  }, [line1, line2]);

  return (
    <div
      ref={boxRef}
      className={`relative z-10 mb-4 border border-brand-light/30 bg-brand-bg/30 px-2.5 py-3.5 text-center font-body leading-[1.75] text-ink/85 ${className}`}
    >
      <div ref={bodyRef} className="text-[12px]">
        <div ref={l1Ref} className="whitespace-nowrap">
          {icon}
          {line1}
        </div>
        <div ref={l2Ref} className="whitespace-nowrap">{line2}</div>
      </div>
    </div>
  );
}

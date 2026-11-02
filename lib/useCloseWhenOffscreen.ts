'use client';

import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

/**
 * FAQ/অ্যাকর্ডিয়নে একটা আইটেম খোলা রেখে উপরের দিকে স্ক্রল করে চলে গেলে (আইটেমের
 * কার্ড পুরোপুরি স্ক্রিনের *নিচে* চলে গেলে) সেটা অটো-বন্ধ করে দেয়।
 *
 * নিচের দিকে স্ক্রল করলে (আইটেম স্ক্রিনের উপরে চলে গেলে) বন্ধ করা হয় না — ওই অবস্থায়
 * বন্ধ করলে আইটেমের উচ্চতা বাদ যেত আর নিচের কনটেন্ট হঠাৎ লাফিয়ে উঠত। আইটেম স্ক্রিনের
 * নিচে থাকলে বন্ধ হলে তার উপরের কোনো কনটেন্ট সরে না, তাই কোনো ঝাঁকুনি লাগে না
 * (আলাদা স্ক্রল-ক্ষতিপূরণের কোডও আর দরকার নেই)।
 *
 * ব্যবহার:
 *   const itemRefs = useRef<(HTMLElement | null)[]>([]);
 *   useCloseWhenOffscreen(openIndex, itemRefs, () => setOpenIndex(null));
 *   ... <div ref={(el) => { itemRefs.current[i] = el; }}> ... </div>
 */
export default function useCloseWhenOffscreen(
  openIndex: number | null,
  itemRefs: MutableRefObject<(HTMLElement | null)[]>,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (openIndex === null) return undefined;
    const el = itemRefs.current[openIndex];
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry || entry.isIntersecting) return;

      // আইটেম স্ক্রিনের উপরে থাকলে (ব্যবহারকারী নিচে নেমে গেছে) বন্ধ করব না —
      // শুধু নিচে থাকলে (ব্যবহারকারী উপরে উঠে গেছে) বন্ধ করব।
      const isBelow = entry.boundingClientRect.top >= (entry.rootBounds?.height ?? window.innerHeight);
      if (!isBelow) return;

      onCloseRef.current();
    }, { threshold: 0 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [openIndex, itemRefs]);
}

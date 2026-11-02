'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

// 🆕 (পারফরম্যান্স অপটিমাইজেশন, ২০২৬-১০): /products পেজের গ্রিডে ১০০+ প্রোডাক্ট
// কার্ড একসাথে মাউন্টেড থাকলে মোবাইলে স্ক্রল করার সময় FPS কমে যায়। এই হুক শুধু
// বর্তমানে ভিউপোর্টে দেখা যাচ্ছে (+বাফার) এমন রো-গুলোর আইটেম রেন্ডার করে, বাকিগুলো
// DOM থেকে বাদ দিয়ে দুইটা স্পেসার (উপরে/নিচে) দিয়ে স্ক্রল-হাইট ঠিক রাখে — ভিজুয়ালি
// কোনো পার্থক্য নেই, শুধু DOM-এ নোড সংখ্যা কমে।
//
// প্রোডাক্ট কার্ডের ডিজাইন (ছবি fixed aspect-ratio + এক-লাইন নাম/রেটিং/দাম/বাটন) বলে
// প্রতিটা রো-র উচ্চতা কলাম-প্রস্থের উপর নির্ভরশীল এবং কার্যত uniform — তাই প্রথম
// রেন্ডারড কার্ড মেপে rowHeight বের করলেই যথেষ্ট নির্ভরযোগ্য।

const COLUMN_BREAKPOINTS: Array<[minWidth: number, cols: number]> = [
  [1280, 6], // xl
  [1024, 4], // lg
  [768, 3],  // md
  [640, 2],  // sm
  [0, 2],    // base
];

function getColsForViewport(width: number): number {
  for (const [minWidth, cols] of COLUMN_BREAKPOINTS) {
    if (width >= minWidth) return cols;
  }
  return 2;
}

interface UseGridVirtualizerOptions {
  itemCount: number;
  containerRef: RefObject<HTMLElement | null>;
  firstItemRef: RefObject<HTMLElement | null>;
  overscanRows?: number;
  /** একদম প্রথম রেন্ডারে (rowHeight মাপার আগে) কতগুলো আইটেম দেখানো হবে — এতে প্রথম পেইন্টে ফাঁকা দেখা যায় না */
  initialRenderCount?: number;
}

interface GridVirtualizerResult {
  cols: number;
  startIndex: number;
  endIndex: number; // exclusive
  topSpacerPx: number;
  bottomSpacerPx: number;
  rowHeight: number | null;
}

export function useGridVirtualizer({
  itemCount,
  containerRef,
  firstItemRef,
  overscanRows = 3,
  initialRenderCount = 24,
}: UseGridVirtualizerOptions): GridVirtualizerResult {
  const [cols, setCols] = useState(() => (typeof window !== 'undefined' ? getColsForViewport(window.innerWidth) : 6));
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const [range, setRange] = useState({ start: 0, end: Math.min(itemCount, initialRenderCount) });

  // কলাম সংখ্যা ভিউপোর্ট অনুযায়ী (Tailwind-এর grid-cols-* ব্রেকপয়েন্টের সাথে মিলিয়ে)
  useEffect(() => {
    const update = () => setCols(getColsForViewport(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // প্রথম রেন্ডারড কার্ডের উচ্চতা মেপে rowHeight বের করা — কলাম বদলালে আবার মাপা হয়
  useEffect(() => {
    const el = firstItemRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (h && h > 0) setRowHeight((prev) => (prev && Math.abs(prev - h) < 1 ? prev : h));
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, range.start]);

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!rowHeight) return;
    const totalRows = Math.ceil(itemCount / cols);

    const compute = () => {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      const viewportH = window.innerHeight || 0;
      const overscanPx = rowHeight * overscanRows;

      const pxAboveViewportTop = -rect.top;
      const firstRow = Math.max(0, Math.floor((pxAboveViewportTop - overscanPx) / rowHeight));
      const visiblePx = viewportH + overscanPx * 2;
      const rowsInView = Math.max(1, Math.ceil(visiblePx / rowHeight));
      const lastRow = Math.min(totalRows, firstRow + rowsInView);

      const nextStart = Math.min(itemCount, firstRow * cols);
      const nextEnd = Math.min(itemCount, lastRow * cols);
      setRange((prev) => (prev.start === nextStart && prev.end === nextEnd ? prev : { start: nextStart, end: nextEnd }));
    };

    const onScrollOrResize = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        compute();
      });
    };

    compute();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [rowHeight, cols, itemCount, overscanRows, containerRef]);

  const totalRows = Math.ceil(itemCount / cols);
  const startRow = Math.floor(range.start / cols);
  const endRow = Math.ceil(range.end / cols);
  const topSpacerPx = rowHeight ? startRow * rowHeight : 0;
  const bottomSpacerPx = rowHeight ? Math.max(0, (totalRows - endRow) * rowHeight) : 0;

  return {
    cols,
    startIndex: range.start,
    endIndex: Math.max(range.start, range.end),
    topSpacerPx,
    bottomSpacerPx,
    rowHeight,
  };
}

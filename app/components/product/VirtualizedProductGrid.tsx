'use client';

import { useRef } from 'react';
import { useGridVirtualizer } from '@/lib/useGridVirtualizer';
import ProductCard from '@/app/components/home/ProductCard';
import type { Product } from '@/types';

interface VirtualizedProductGridProps {
  products: Product[];
}

// 🆕 (পারফরম্যান্স অপটিমাইজেশন, ২০২৬-১০): /products পেজে পেজ-প্রতি ১১৯টা প্রোডাক্ট
// থাকে — virtualization ছাড়া সবগুলো কার্ড একসাথে DOM-এ মাউন্ট হলে মোবাইলে স্ক্রল
// করার সময় FPS কমে যেতে পারে। useGridVirtualizer শুধু দৃশ্যমান (+বাফার) রো-গুলোর
// কার্ড রেন্ডার করে, বাকিটুকু দুইটা স্পেসার দিয়ে পূরণ হয় — ভিজুয়াল/লেআউট অপরিবর্তিত,
// শুধু DOM হালকা থাকে।
export default function VirtualizedProductGrid({ products }: VirtualizedProductGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLDivElement>(null);

  const { startIndex, endIndex, topSpacerPx, bottomSpacerPx } = useGridVirtualizer({
    itemCount: products.length,
    containerRef,
    firstItemRef,
  });

  const visibleItems = products.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
    >
      {topSpacerPx > 0 && <div className="col-span-full" style={{ height: topSpacerPx }} aria-hidden="true" />}

      {visibleItems.map((p, i) => {
        const absoluteIndex = startIndex + i;
        const isMeasureTarget = absoluteIndex === startIndex;
        return (
          <div key={p.id} ref={isMeasureTarget ? firstItemRef : undefined}>
            <ProductCard prod={p} index={absoluteIndex} />
          </div>
        );
      })}

      {bottomSpacerPx > 0 && <div className="col-span-full" style={{ height: bottomSpacerPx }} aria-hidden="true" />}
    </div>
  );
}

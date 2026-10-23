'use client';

// ক্লিকের সময় রাখা হিন্ট (কার্ডের ছবির সংখ্যা) থেকে সঠিক আকৃতির প্রোডাক্ট-স্কেলেটন বসায়।
import { useProductNavHint } from '@/lib/productNavHint';
import ProductDetailSkeleton from './ProductDetailSkeleton';

export default function ProductSkeletonAuto() {
  const hint = useProductNavHint();
  return <ProductDetailSkeleton imgCount={hint?.imgCount} />;
}

'use client';

// প্রোডাক্ট ডিটেইল পেজের loading UI — আসল স্কেলেটন শেয়ার্ড কম্পোনেন্টে (মাপ আসল পেজের সাথে মেলানো)।
import ProductSkeletonAuto from '@/app/components/product/ProductSkeletonAuto';

export default function ProductLoading() {
  return <ProductSkeletonAuto mode="flow" />;
}

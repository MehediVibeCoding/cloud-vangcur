// ফাইলের পাথ: app/search/skeletonUtil.ts
// স্কেলেটনের ক্যাটাগরি-চিপের আনুমানিক প্রস্থ। আলাদা ফাইলে, কারণ page.tsx (সার্ভার) এটা ডাকে —
// 'use client' ফাইল (SearchSkeleton.tsx) থেকে ফাংশন ইমপোর্ট করে সার্ভারে ডাকা যায় না।
// চিপ = আইকন ২০px + গ্যাপ ৮px + প্যাডিং ৩২px + লেখা (~৭.৫px/অক্ষর)
export const chipWidthFor = (name: string): number => Math.min(220, Math.round(60 + (name || '').length * 7.5));

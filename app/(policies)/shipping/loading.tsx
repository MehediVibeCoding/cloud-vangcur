// GitHub পাথ: app/(policies)/shipping/loading.tsx
// [NEW ব্যাচ ১৪] এই পেজের নিজস্ব স্কেলেটন — 6টা সেকশন, আসল পেজের গঠন অনুযায়ী (শেয়ার্ড জেনেরিকটা আর দেখায় না)।
import PolicySkeleton, { type SkeletonSection } from '../PolicySkeleton';

// [বুলেট, অনুচ্ছেদ, নোট] — প্রতিটা সেকশনের জন্য
const SECTIONS: SkeletonSection[] = [
  [3, 1, 0],
  [0, 1, 1],
  [2, 1, 0],
  [0, 1, 0],
  [3, 1, 0],
  [0, 1, 0],
];

export default function ShippingLoading() {
  return <PolicySkeleton sections={SECTIONS} />;
}

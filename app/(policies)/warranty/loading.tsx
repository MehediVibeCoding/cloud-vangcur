// GitHub পাথ: app/(policies)/warranty/loading.tsx
// [NEW ব্যাচ ১৪] এই পেজের নিজস্ব স্কেলেটন — 7টা সেকশন, আসল পেজের গঠন অনুযায়ী (শেয়ার্ড জেনেরিকটা আর দেখায় না)।
import PolicySkeleton, { type SkeletonSection } from '../PolicySkeleton';

// [বুলেট, অনুচ্ছেদ, নোট] — প্রতিটা সেকশনের জন্য
const SECTIONS: SkeletonSection[] = [
  [4, 1, 1],
  [2, 0, 0],
  [3, 0, 0],
  [4, 0, 0],
  [6, 0, 1],
  [3, 0, 0],
  [0, 1, 0],
];

export default function WarrantyLoading() {
  return <PolicySkeleton sections={SECTIONS} />;
}

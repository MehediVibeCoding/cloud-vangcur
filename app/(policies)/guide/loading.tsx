// GitHub পাথ: app/(policies)/guide/loading.tsx
// [NEW ব্যাচ ১৪] এই পেজের নিজস্ব স্কেলেটন — 11টা সেকশন, আসল পেজের গঠন অনুযায়ী (শেয়ার্ড জেনেরিকটা আর দেখায় না)।
import PolicySkeleton, { type SkeletonSection } from '../PolicySkeleton';

// [বুলেট, অনুচ্ছেদ, নোট] — প্রতিটা সেকশনের জন্য
const SECTIONS: SkeletonSection[] = [
  [3, 1, 0],
  [3, 1, 0],
  [3, 0, 0],
  [3, 1, 0],
  [6, 1, 0],
  [2, 0, 0],
  [3, 1, 0],
  [3, 0, 0],
  [3, 0, 0],
  [2, 0, 0],
  [0, 0, 0],
];

export default function GuideLoading() {
  return <PolicySkeleton sections={SECTIONS} />;
}

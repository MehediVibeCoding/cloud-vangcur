// GitHub পাথ: app/(policies)/terms/loading.tsx
// [NEW ব্যাচ ১৪] এই পেজের নিজস্ব স্কেলেটন — 10টা সেকশন, আসল পেজের গঠন অনুযায়ী (শেয়ার্ড জেনেরিকটা আর দেখায় না)।
import PolicySkeleton, { type SkeletonSection } from '../PolicySkeleton';

// [বুলেট, অনুচ্ছেদ, নোট] — প্রতিটা সেকশনের জন্য
const SECTIONS: SkeletonSection[] = [
  [0, 2, 0],
  [3, 0, 0],
  [3, 1, 0],
  [2, 1, 0],
  [2, 1, 1],
  [4, 0, 1],
  [0, 2, 0],
  [2, 0, 0],
  [0, 1, 0],
  [0, 1, 0],
];

export default function TermsLoading() {
  return <PolicySkeleton sections={SECTIONS} />;
}

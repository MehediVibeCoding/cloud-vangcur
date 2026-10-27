// GitHub পাথ: app/(policies)/refund-policy/loading.tsx
// [NEW ব্যাচ ১৪] এই পেজের নিজস্ব স্কেলেটন — 6টা সেকশন, আসল পেজের গঠন অনুযায়ী (শেয়ার্ড জেনেরিকটা আর দেখায় না)।
import PolicySkeleton, { type SkeletonSection } from '../PolicySkeleton';

// [বুলেট, অনুচ্ছেদ, নোট] — প্রতিটা সেকশনের জন্য
const SECTIONS: SkeletonSection[] = [
  [0, 1, 0],
  [3, 1, 0],
  [2, 1, 1],
  [4, 0, 0],
  [3, 0, 0],
  [0, 1, 0],
];

export default function RefundPolicyLoading() {
  return <PolicySkeleton sections={SECTIONS} />;
}

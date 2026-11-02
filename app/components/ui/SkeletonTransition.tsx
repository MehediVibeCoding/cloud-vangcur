// GitHub পাথ: app/components/ui/SkeletonTransition.tsx — নতুন ফাইল
'use client';

/**
 * SkeletonTransition
 * ─────────────────────────────────────────────────────────────────────
 * স্কেলেটন হঠাৎ উধাও হয়ে আসল কনটেন্ট হঠাৎ পপ করে আসা — এই "ধাক্কা"
 * এড়াতে এই wrapper ব্যবহার করা হবে। skeleton আর content দুটোই একই
 * জায়গায় (absolute grid-stack) বসানো থাকে, তাই সাইজ/পজিশন মিলে যায়
 * এবং AnimatePresence দিয়ে opacity ক্রসফেড overlap করে — একটা সেকেন্ডের
 * জন্যও স্ক্রিন খালি বা "জাম্প" করা লাগে না।
 *
 * এটা client-state-চালিত loading (isLoading বুলিয়ান আছে এমন কম্পোনেন্ট,
 * যেমন CartSidebar-এর আইটেম লিস্ট, প্রোডাক্ট গ্যালারি) এর জন্য। রুট-লেভেল
 * app/loading.tsx (Suspense fallback) আলাদা মেকানিজম — সেটার জন্য
 * ভবিষ্যতে Next.js-এর View Transitions ইন্টিগ্রেশন আলাদাভাবে দেখা হবে।
 *
 * ব্যবহার:
 *   <SkeletonTransition isReady={!isLoading} skeleton={<MySkeleton />}>
 *     <ActualContent />
 *   </SkeletonTransition>
 */

import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

interface SkeletonTransitionProps {
  isReady: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}

const EASE_BRAND = [0.4, 0, 0.2, 1] as const;

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.26, ease: EASE_BRAND } },
  exit: { opacity: 0, transition: { duration: 0.22, ease: EASE_BRAND } },
};

export default function SkeletonTransition({
  isReady,
  skeleton,
  children,
  className = '',
}: SkeletonTransitionProps) {
  // 🛠️ ফিক্স (লাফ/"বাড়ি" খাওয়া): আগে skeleton আর content দুটোই স্বাভাবিক ফ্লো-তে
  // বসত — ক্রসফেডের ০.২৬ সেকেন্ড দুটো একসাথে জায়গা নিত, ফলে কন্টেইনারের উচ্চতা
  // হঠাৎ প্রায় দ্বিগুণ হয়ে আবার কমে যেত (ইনভয়েস/ট্র্যাক-অর্ডার মডাল/অর্ডার লিস্টে
  // "ছোট → বড় → ছোট" লাফ)। এখন বাইরে একটা CSS grid, আর দুটো চাইল্ডই একই
  // গ্রিড-সেলে (col-start-1 row-start-1) থাকে — তাই ওভারল্যাপ করে ফেড হয়, উচ্চতা
  // কখনো যোগ হয় না (সেল = দুটোর মধ্যে বড়টার মাপ)।
  return (
    // mode দেওয়া হয়নি ইচ্ছাকৃতভাবে — ডিফল্ট "sync" মোডে exiting skeleton
    // আর entering content একসাথে ওভারল্যাপ করে ফেড হয়, যেটাই crossfade।
    <div className="grid">
      <AnimatePresence initial={false}>
        {!isReady ? (
          <motion.div key="skeleton" {...fade} className={`col-start-1 row-start-1 min-w-0 ${className}`}>
            {skeleton}
          </motion.div>
        ) : (
          <motion.div key="content" {...fade} className={`col-start-1 row-start-1 min-w-0 ${className}`}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

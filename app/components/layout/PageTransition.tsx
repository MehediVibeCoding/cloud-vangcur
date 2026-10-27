// GitHub পাথ: app/components/layout/PageTransition.tsx — নতুন ফাইল
'use client';

/**
 * PageTransition
 * ─────────────────────────────────────────────────────────────────────
 * পুরো পেজ-টু-পেজ নেভিগেশনের (প্রোডাক্ট পেজ ↔ হোমপেজ ইত্যাদি) জন্য একটা
 * consistent fade transition। এটা ছাড়া Next.js ডিফল্টভাবে কোনো animation
 * ছাড়াই instant DOM swap করে — তাই back করলে কখনো smooth লাগে, কখনো
 * জার্কি/কাটা-কাটা লাগে (browser gesture-এর সাথে টাইমিং মিলে গেলে একরকম,
 * না মিললে আরেকরকম)। এই wrapper সেই randomness বাদ দিয়ে সবসময় একই
 * animation দেখাবে — router.push(), হার্ডওয়্যার ব্যাক বাটন, বা system
 * swipe gesture — যেভাবেই route বদলাক না কেন।
 *
 * শুধু pathname বদলালেই (আসল route change) ট্রানজিশন চলে — মডাল/ড্রয়ার
 * ওপেন হওয়ার সময় (useHistoryModal.ts যেভাবে history.pushState করে,
 * pathname না বদলে) এটা ট্রিগার হবে না, যেটাই আমরা চাই।
 */

import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const EASE_BRAND = [0.4, 0, 0.2, 1] as const;

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: EASE_BRAND } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: EASE_BRAND } },
};

// /search-এ ঢোকার সময় fade-in (opacity 0 → 1) বাদ: আগের পেজ মিলিয়ে যাওয়ার পর নতুন পেজ ০ opacity থেকে
// শুরু হয়ে স্কেলেটনের আগে এক ঝলক ফাঁকা স্ক্রিন দেখাত। এখানে নতুন পেজ (স্কেলেটন) সাথে সাথে দৃশ্যমান।
const fadeNoEnter = { ...fade, initial: { opacity: 1 } };

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const variants = pathname === '/search' ? fadeNoEnter : fade;

  return (
    // mode="wait" — আগের পেজ পুরো fade-out না হওয়া পর্যন্ত নতুন পেজ mount
    // হয় না, তাই ভিন্ন-উচ্চতার দুই পেজ একসাথে ওভারল্যাপ করে জাম্প করবে না।
    // initial={false} — প্রথমবার সাইট লোড হওয়ার সময় fade-in না দেখিয়ে
    // সরাসরি কন্টেন্ট দেখায়।
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={pathname} {...variants}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

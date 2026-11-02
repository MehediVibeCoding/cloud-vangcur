import { isModalOpen } from '@/lib/bodyScrollLock';

const NAVBAR_OFFSET = 85;
const CHECK_DELAYS_MS = [70, 300, 700, 1200];

/**
 * ক্যাটাগরি/প্রোডাক্ট সেকশনের শিরোনাম ("XYZ সমূহ") পর্যন্ত স্ক্রল করে।
 * সার্চ মডাল বন্ধ/আনলক হওয়া, নতুন পেজ রেন্ডার হওয়া বা Next.js-এর নিজস্ব
 * "পেজের উপরে স্ক্রল" — এসবের কারণে প্রথম স্ক্রলটা হারিয়ে যেতে পারে, তাই কয়েকবার
 * যাচাই করে দরকার হলে আবার স্ক্রল করা হয় (স্ক্রল চলমান থাকলে বা মডাল খোলা থাকলে বিরক্ত করে না)।
 */
export function scrollToProductsSection(): void {
  if (typeof window === 'undefined') return;
  let lastY = window.scrollY;

  CHECK_DELAYS_MS.forEach((delay, i) => {
    window.setTimeout(() => {
      const isLast = i === CHECK_DELAYS_MS.length - 1;
      if (isModalOpen() && !isLast) return;

      const el = document.getElementById('prodSec');
      if (!el) return;

      const currentY = window.scrollY;
      const moving = Math.abs(currentY - lastY) > 2;
      lastY = currentY;
      if (moving && i > 0) return; // স্মুথ স্ক্রল চলছে — মাঝপথে থামানো হবে না

      const targetY = el.getBoundingClientRect().top + currentY - NAVBAR_OFFSET;
      if (Math.abs(currentY - targetY) < 24) return;
      window.scrollTo({ top: Math.max(0, targetY), behavior: i === 0 ? 'smooth' : 'auto' });
      lastY = currentY;
    }, delay);
  });
}

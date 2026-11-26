// ফাইলের পাথ: lib/checkoutPrefetch.ts
// /checkout প্রিফেচ — শুধু কার্টে অন্তত ১টা পণ্য থাকলে, এবং ব্রাউজার-সেশনে মাত্র একবার।
// (কার্টে দুবার যোগ, প্রতিটা পেজে ঢোকা, রিলোড — কিছুতেই আবার হবে না।)
// 🛡️ রিকোয়েস্ট-সেভিং: চেকআউট প্রিফেচ একটা আসল ফাংশন-ইনভোকেশন, তাই এটাই একমাত্র জায়গা।

const KEY = 'vc_checkout_prefetched';
let done = false;

export function prefetchCheckoutOnce(prefetch: (href: string) => void, cartItemCount: number): void {
  if (done || cartItemCount <= 0) return;
  try {
    if (sessionStorage.getItem(KEY) === '1') {
      done = true;
      return;
    }
  } catch {
    /* sessionStorage বন্ধ থাকলে মডিউল-ফ্ল্যাগই ভরসা */
  }
  done = true;
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* উপেক্ষা */
  }
  prefetch('/checkout');
}

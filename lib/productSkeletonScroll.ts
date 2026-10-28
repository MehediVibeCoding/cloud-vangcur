// 🧭 প্রোডাক্ট-নেভিগেশনের সময় ওভারলে-স্কেলেটন (ProductNavOverlay) থেকে পেজের স্কেলেটনে (loading.tsx) স্ক্রল-অবস্থান হস্তান্তর।
//
// কেন দরকার: ক্লিকের পর প্রথমে পুরনো পেজের ওপর ফিক্সড ওভারলে স্কেলেটন আসে (নিজস্ব স্ক্রল-বক্স)। ব্যবহারকারী তার ভেতরে
// নিচে স্ক্রল করলে, পরের ধাপের স্কেলেটন (ডকুমেন্টের স্বাভাবিক ফ্লোতে) বসার সময় ওই অবস্থানটা এখান থেকে নিয়ে ডকুমেন্টের
// স্ক্রলে বসানো হয় — তাই স্কেলেটন → আসল পেজে বদলের সময় একই ডকুমেন্ট-স্ক্রলে থেকে যায়, উপরে লাফ দেয় না।

const HANDOFF_GRACE_MS = 1500;

let overlayActive = false;
let overlayEndedAt = 0;
let overlayTop = 0;

export function markOverlayStart(): void {
  overlayActive = true;
  overlayTop = 0;
}

export function markOverlayScroll(top: number): void {
  overlayTop = Math.max(0, Math.round(top));
}

export function markOverlayEnd(): void {
  overlayActive = false;
  overlayEndedAt = Date.now();
}

/** ওভারলে এখনো চালু (বা এইমাত্র বন্ধ হয়েছে) হলে তার স্ক্রল-অবস্থান; নইলে ০। একবার নিলে শূন্য হয়ে যায়। */
export function takeOverlayScrollTop(): number {
  const fresh = overlayActive || Date.now() - overlayEndedAt < HANDOFF_GRACE_MS;
  const top = fresh ? overlayTop : 0;
  overlayTop = 0;
  return top;
}

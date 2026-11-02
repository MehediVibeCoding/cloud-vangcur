// [NEW] ব্যবহার-না-হওয়া রিভিউ ছবি R2 থেকে মুছতে সার্ভারকে বলে (ব্রাউজার থেকে ডাকা হয়)।
// ডাকা হয়: (১) রিভিউ মুছে ফেলা হলে (productReviewData.ts → deleteProductReview), (২) ছবি আপলোডের পর
// রিভিউ জমা ব্যর্থ হলে (ProductReviews.tsx)। আগে এসব ছবি R2-তে অনাথ হয়ে পড়ে থাকত।
// "ফায়ার-অ্যান্ড-ফরগেট": ব্যর্থ হলে ব্যবহারকারীর কিছু আটকায় না, শুধু ছবিটা পড়ে থাকে।
// সার্ভার (/api/cleanup-review-images) নিজে যাচাই করে — লগইন, আমাদের R2 হোস্ট, আর ছবিটা
// কোনো রিভিউতে উল্লেখ নেই। এই ফাইল 'use client' নয়, যাতে সার্ভার-কোডও নিরাপদে import করতে পারে।

export function cleanupReviewImages(urls: string[] | string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const list = (Array.isArray(urls) ? urls : String(urls || '').split(','))
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (!list.length) return;
  try {
    fetch('/api/cleanup-review-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: list }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

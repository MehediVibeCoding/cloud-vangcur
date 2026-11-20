// স্ট্যাটিক ফাইলের ঠিকানা: `public/`-এর যে ফাইলগুলো ব্রাউজার সরাসরি নামায় (ব্র্যান্ড লোগো, ফুটার ছবি, টিম অ্যাভাটার)
// সেগুলো static.vangcur.com থেকে আসে, যাতে মূল Worker-এর দৈনিক রিকোয়েস্ট-সীমায় না গোনা হয়
// (কারণ ও বন্ধ করার উপায়: next.config.js-এর ওপরের মন্তব্য)।
//
// ⚠️ এখানে শুধু সেই ফাইলই দেবেন যেটা wrangler.static.jsonc-এর ফাইল-তালিকায় (scripts/prepare-static.mjs-এর
//    COPY_FILES / COPY_DIRS) আছে। না থাকলে ফাইল ৪০৪ হবে। নতুন ফাইল যোগ করলে ওই স্ক্রিপ্টেও যোগ করুন।
// ⚠️ যা মূল ডোমেইনেই থাকতে হবে তাতে এটা দেবেন না: robots.txt, sitemap, manifest, og-image, favicon/icon,
//    .well-known, ইনভয়েসের `resvg.wasm` ও `fonts/invoice/*` (সার্ভার নিজের হোস্ট থেকে আনে)।
//
// NEXT_PUBLIC_STATIC_ORIGIN বিল্ড-টাইমে বসে; খালি হলে (dev বা `STATIC_ORIGIN=off`) আগের মতো একই-হোস্টের পাথ।
export const STATIC_ORIGIN: string = process.env.NEXT_PUBLIC_STATIC_ORIGIN || '';

export function staticUrl(path: string): string {
  return STATIC_ORIGIN ? `${STATIC_ORIGIN}${path}` : path;
}

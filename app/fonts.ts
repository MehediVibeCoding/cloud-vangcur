import { DM_Sans, Hind_Siliguri } from 'next/font/google';

// 🐢 পারফরম্যান্স ফিক্স (audit): Playfair Display এখানে লোড হতো কিন্তু
// `font-display` ক্লাসটা পুরো রিপোতে (grep করে যাচাই) কোথাও ব্যবহারই হতো না —
// প্রতি পেজে ২টা অপ্রয়োজনীয় high-priority woff2 প্রিলোড হচ্ছিল। সম্পূর্ণ বাদ
// দেওয়া হলো; ভিজ্যুয়ালি কোনো পরিবর্তন নেই যেহেতু আগেও এটা কোথাও রেন্ডার হতো না।

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

// Main Bengali font for all site text (headings, body copy, buttons, etc).
// NOTE: Bengali digits (০-৯) are intentionally NOT rendered with this font.
// A separate, narrowly-scoped "digit font" (self-hosted: public/fonts/
// noto-sans-bengali-digits-v1.woff2, declared via @font-face in app/globals.css
// with unicode-range U+09E6-09EF and preloaded in app/layout.tsx) is layered in
// front of this font in the font-family stack (see tailwind.config.ts `body` and the
// inline fontFamily values in InvoiceClient.tsx). That is what keeps digits
// legible without affecting any other character - do not merge them back
// into a single font-family assignment, or the digit-only override will
// silently stop working and every digit will fall back to this font again.
export const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bengali',
  display: 'swap',
});

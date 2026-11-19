// ফন্ট বান্ডলে ঢোকানো (wrangler.jsonc-এর Data রুল) — মূল সাইটের public/fonts/invoice-এর ৮টা ফাইলের হুবহু একই ফন্ট,
// তাই ইনভয়েসের চেহারা আগের মতোই থাকে। রানটাইমে নেটওয়ার্ক থেকে ফন্ট আনতে হয় না।
import hind400 from '@fontsource/hind-siliguri/files/hind-siliguri-bengali-400-normal.woff';
import hind500 from '@fontsource/hind-siliguri/files/hind-siliguri-bengali-500-normal.woff';
import hind600 from '@fontsource/hind-siliguri/files/hind-siliguri-bengali-600-normal.woff';
import hind700 from '@fontsource/hind-siliguri/files/hind-siliguri-bengali-700-normal.woff';
import dm400 from '@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff';
import dm500 from '@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff';
import dm600 from '@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff';
import dm700 from '@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff';

export type FontWeight = 400 | 500 | 600 | 700;

export type SatoriFontEntry = {
  name: 'Hind Siliguri' | 'DM Sans';
  data: ArrayBuffer;
  weight: FontWeight;
  style: 'normal';
};

export const SATORI_FONTS: SatoriFontEntry[] = [
  { name: 'Hind Siliguri', data: hind400, weight: 400, style: 'normal' },
  { name: 'Hind Siliguri', data: hind500, weight: 500, style: 'normal' },
  { name: 'Hind Siliguri', data: hind600, weight: 600, style: 'normal' },
  { name: 'Hind Siliguri', data: hind700, weight: 700, style: 'normal' },
  { name: 'DM Sans', data: dm400, weight: 400, style: 'normal' },
  { name: 'DM Sans', data: dm500, weight: 500, style: 'normal' },
  { name: 'DM Sans', data: dm600, weight: 600, style: 'normal' },
  { name: 'DM Sans', data: dm700, weight: 700, style: 'normal' },
];

// resvg রাস্টারাইজেশনের সময়ও একই ফন্ট লাগে (satori শুধু SVG <text> বসায়, গ্লিফ আঁকে resvg)
export const FONT_BUFFERS: Uint8Array[] = SATORI_FONTS.map((f) => new Uint8Array(f.data));

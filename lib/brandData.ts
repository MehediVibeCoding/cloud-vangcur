/**
 * হোম পেজের "ব্র্যান্ড মার্কি" সেকশনের ডেটা (app/components/home/BrandMarquee.tsx)।
 *
 * নতুন ব্র্যান্ড যোগ করতে:
 *  1. ট্রান্সপারেন্ট লোগো public/brands/<file>.webp নামে রাখুন (ছোট রাখুন — ~২৫০px চওড়া যথেষ্ট)
 *  2. ডার্ক মোডে কালো লোগো দেখা না গেলে সাদা ভার্সন public/brands/<file>-white.webp নামে রাখুন এবং white: true দিন
 *  3. নিচের যেকোনো সারিতে এক লাইন যোগ করুন — w/h হলো ডেস্কটপে দেখানোর সাইজ (px),
 *     সাধারণত সর্বোচ্চ ১৩২ চওড়া × ৩৮ উঁচুর মধ্যে রাখলে সব লোগো সমান ওজনের দেখায়।
 */
export interface Brand {
  name: string;
  file: string;
  /** ডেস্কটপে দেখানোর চওড়া (px) */
  w: number;
  /** ডেস্কটপে দেখানোর উচ্চতা (px) */
  h: number;
  /** ডার্ক মোডের জন্য সাদা ভার্সন আছে কি না */
  white?: boolean;
}

// প্রথম সারি — বাম থেকে ডানে ঘোরে
export const BRANDS_ROW_1: Brand[] = [
  { name: 'Anker', file: 'anker', w: 132, h: 34 },
  { name: 'Baseus', file: 'baseus', w: 132, h: 35, white: true },
  { name: 'UGREEN', file: 'ugreen', w: 132, h: 26 },
  { name: 'Hoco', file: 'hoco', w: 111, h: 38, white: true },
  { name: 'Remax', file: 'remax', w: 132, h: 32, white: true },
  { name: 'Joyroom', file: 'joyroom', w: 132, h: 23 },
  { name: 'Oraimo', file: 'oraimo', w: 132, h: 33 },
];

// দ্বিতীয় সারি — ডান থেকে বামে ঘোরে
export const BRANDS_ROW_2: Brand[] = [
  { name: 'Xiaomi', file: 'xiaomi', w: 124, h: 38 },
  { name: 'JBL', file: 'jbl', w: 68, h: 38 },
  { name: 'QCY', file: 'qcy', w: 132, h: 36, white: true },
  { name: 'Awei', file: 'awei', w: 132, h: 29, white: true },
  { name: 'Havit', file: 'havit', w: 112, h: 38 },
  { name: 'BOYA', file: 'boya', w: 120, h: 38 },
];

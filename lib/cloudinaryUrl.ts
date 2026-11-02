// নাম (cloudinaryUrl) পুরনো থেকে রয়ে গেছে, কিন্তু ফাংশনটা এখন multi-origin:
// এখনও Cloudinary-হোস্টেড পুরনো ডেটা (যদি কোথাও থেকে যায়) চেনে-অপটিমাইজ করে, আর
// নতুন R2 (img.vangcur.com)-হোস্টেড ছবি Cloudflare Transformations দিয়ে অপটিমাইজ
// করে। সিগনেচার অপরিবর্তিত রাখা হয়েছে ইচ্ছাকৃতভাবে, যাতে ১৮টা call-site-এর
// কোনোটাতেই হাত দিতে না হয়।
//
// NEXT_PUBLIC_SITE_URL   — সাইটের নিজের Cloudflare-প্রক্সিড ডোমেইন (যেমন
//                          https://vangcur.com) — /cdn-cgi/image/ এই ডোমেইন
//                          দিয়েই কল করতে হয়, যেকোনো ডোমেইন দিয়ে না।
// NEXT_PUBLIC_R2_IMAGE_BASE — R2 bucket-এ কানেক্ট করা কাস্টম ডোমেইন (যেমন
//                          https://img.vangcur.com) — এই বেস দিয়ে শুরু হওয়া
//                          URL-গুলোকেই Transformations-এ পাঠানো হয়।
//
// দুটোর যেকোনো একটা env var সেট না থাকলে (যেমন লোকাল ডেভ বা প্রিভিউ ডিপ্লয়মেন্ট,
// যেগুলো Cloudflare দিয়ে প্রক্সি হয় না) — অরিজিনাল URL অপরিবর্তিত ফেরত যায়,
// কোনো ভাঙা /cdn-cgi/image/ লিংক তৈরি হয় না।

function optimizeR2Url(url: string, width: number): string | null {
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL;
  const r2Base = process.env.NEXT_PUBLIC_R2_IMAGE_BASE;
  if (!siteBase || !r2Base) return null;
  if (!url.startsWith(r2Base)) return null;

  const site = siteBase.endsWith('/') ? siteBase.slice(0, -1) : siteBase;
  // 🛠️ ব্লার-ফিক্স: আগে এখানে `dpr` parameter ছিলই না (উপরের লিগ্যাসি Cloudinary
  // path-এ `dpr_auto` থাকলেও এই নতুন R2 path-এ বাদ পড়ে গিয়েছিল) — ফলে হাই-DPI
  // ফোনে (Retina/2x-3x স্ক্রিন, যা বাংলাদেশে প্রায় সব স্মার্টফোনেই আছে) ১x
  // রেজোলিউশনের ছবি টেনে বড় করে দেখানো হচ্ছিল, যেটাই "ব্লার" দেখাচ্ছিল।
  // dpr=2 মানে ২x ফিজিক্যাল পিক্সেল পাঠানো হবে একই CSS সাইজের জন্য — সব
  // 2x স্ক্রিনে পুরোপুরি শার্প, 3x স্ক্রিনেও আগের চেয়ে অনেক স্পষ্ট দেখাবে।
  // quality 75→82: Cloudflare-এর ডিফল্ট (75) প্রোডাক্ট ফটোর জন্য একটু বেশি
  // কমপ্রেসড, তাই সামান্য বাড়ানো হলো (ফাইল সাইজ সামান্য বাড়ে, কিন্তু
  // ডিটেইল স্পষ্ট থাকে) — এখনো অনেক হালকা, "সুপারফাস্ট" থাকবে।
  const params = `width=${width},quality=82,format=auto,dpr=2`;
  return `${site}/cdn-cgi/image/${params}/${url}`;
}

// 🎠 হিরো স্লাইডারের কার্ড-ছবির প্রস্থ (HeroSlider + page.tsx-এর LCP প্রিলোড একই মান ব্যবহার করে, যাতে URL কখনো আলাদা না হয়)।
// ব্যাচ ২.১: আগে ৩৬০ (×dpr=2 = ৭২০px) ছিল, অথচ কার্ড দেখায় মাত্র ~১৭৫–২০০ CSS px — PageSpeed: "৭২০×১২৮০ ফাইল, দেখানো ২০০×৩৫৬"।
// ২৪০ (×dpr=2 = ৪৮০px) = ২.৪× — সব ২x স্ক্রিনে শার্প, ৩x ফোনেও (১৭৫×৩=৫২৫px) প্রায় একই; ফাইল ~৫৫% ছোট।
export const HERO_CARD_IMG_WIDTH = 240;

// 📐 ব্যাচ ৫গ: হিরো/প্রোডাক্ট কার্ডের রেসপন্সিভ srcset (শুধু R2 ছবি)। আগে সব ডিভাইসে স্থির `dpr=2` ছবি যেত
// (হিরো ৪৮০px, প্রোডাক্ট ৭৬০px), অথচ PageSpeed-এর ১.৭৫ DPR ফোনে দরকার ~৩২৬px / ~২৯০px। এখন ব্রাউজার
// `sizes` × DPR দিয়ে নিজে বাছে — উচ্চ-DPR ফোনে আগের মতোই (বা কাছাকাছি) শার্প, ছোট স্ক্রিনে অনেক ছোট ফাইল।
// ⚠️ প্রতিটা width = Cloudflare-এর আলাদা unique transformation (ফ্রি: ৫,০০০/মাস)। মোট নতুন ≈ ১২×২ + ৩৫×৩ ≈ ১৩০।
export const HERO_SRCSET_WIDTHS = [340, 480] as const;
// মোবাইলে ২ কার্ড (px-3.5 = ২৮ + gap ১২ = ৪০), ডেস্কটপে ৬ কার্ড (px-5 = ৪০ + ৫ gap × ১২ = ৬০ → ১০০; max ১৩০০)।
export const HERO_IMG_SIZES =
  '(min-width: 768px) calc((min(100vw, 1300px) - 100px) / 6), calc((100vw - 40px) / 2)';
export const PRODUCT_SRCSET_WIDTHS = [320, 480, 720] as const;
// ProductGrid: grid-cols-2 / md:3 / lg:4 / xl:6, gap-3.5 (১৪px), কনটেইনার px-5 (৪০) ও max ১৩০০।
export const PRODUCT_IMG_SIZES =
  '(min-width: 1280px) calc((min(100vw, 1300px) - 110px) / 6), (min-width: 1024px) calc((100vw - 82px) / 4), (min-width: 768px) calc((100vw - 68px) / 3), calc((100vw - 54px) / 2)';

export function optimizeCloudinaryUrl(url?: string, width = 450): string {
  if (!url || !url.startsWith('http')) return url || '';

  // --- লিগ্যাসি Cloudinary ডেটা (যদি কোনো পুরনো রো-তে থেকে যায়) ---
  if (url.includes('res.cloudinary.com')) {
    if (/\/upload\/[^/]*w_\d/.test(url)) return url;
    if (url.includes('/q_auto/f_auto/')) {
      return url.replace('/q_auto/f_auto/', `/w_${width},q_auto:eco,f_auto,dpr_auto/`);
    }
    if (url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/w_${width},q_auto:eco,f_auto,dpr_auto/`);
    }
    return url;
  }

  // --- নতুন R2-হোস্টেড ছবি ---
  const transformed = optimizeR2Url(url, width);
  if (transformed) return transformed;

  // --- অন্য যেকোনো সোর্স (যেমন এখনো-মাইগ্রেট-না-হওয়া Supabase Storage URL) ---
  return url;
}

// 📐 রেসপন্সিভ srcset (শুধু R2-হোস্টেড ছবি): প্রতিটা `pixelWidths` এ একটা URL, `w` ডেসক্রিপ্টরে আসল পিক্সেল চওড়া।
// ⚠️ এখানে `dpr=1` ইচ্ছাকৃত — ডিভাইসের DPR কভার করে ব্রাউজার নিজে `sizes` × DPR দিয়ে সঠিক প্রার্থী বাছে
// (উপরের optimizeR2Url এর স্থির `dpr=2` এর বদলে), ফলে ২x-৩x ফোনে শার্পনেস একই থাকে, কম-DPR/ছোট বাক্সে ছোট ফাইল যায়।
// Cloudflare ডিফল্টে `fit=scale-down` — সোর্সের চেয়ে বড় করে না, তাই বড় প্রার্থী সোর্স-সীমিত।
// R2 ছাড়া (Cloudinary/অন্য সোর্স/env নেই) `undefined` ফেরে — তখন কলার শুধু `src` ব্যবহার করে (আগের আচরণ)।
// ⚠️ প্রতিটা আলাদা width Cloudflare এর আলাদা "unique transformation" (ফ্রি প্ল্যানে মাসে ৫,০০০) — তাই প্রার্থী কম রাখা।
export function buildImageSrcSet(url: string | undefined, pixelWidths: readonly number[]): string | undefined {
  if (!url || !url.startsWith('http')) return undefined;
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL;
  const r2Base = process.env.NEXT_PUBLIC_R2_IMAGE_BASE;
  if (!siteBase || !r2Base || !url.startsWith(r2Base)) return undefined;
  const site = siteBase.endsWith('/') ? siteBase.slice(0, -1) : siteBase;
  return pixelWidths
    .map((w) => `${site}/cdn-cgi/image/width=${w},quality=82,format=auto,dpr=1/${url} ${w}w`)
    .join(', ');
}

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

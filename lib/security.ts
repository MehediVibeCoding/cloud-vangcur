const SAFE_HREF_PROTOCOLS = ['http:', 'https:', 'tel:', 'mailto:'];

// 🛡️ ফিক্স (audit P2-B13): আগে এখানে `<`/`>` কে `&lt;`/`&gt;` করে সেভ করা হতো
// (ভ্যানিলা JS যুগের রীতি), কিন্তু React JSX-এ `{text}` দিয়ে রেন্ডার করলে
// React নিজেই সব টেক্সট নিরাপদে escape করে — তাই সেভ করা `&lt;` আবার
// escape হয়ে ইউজার আক্ষরিক অর্থেই "&lt;" লেখা দেখত, `<` নয়। এই তিনটে
// কলার (প্রশ্ন/উত্তর/রিভিউ) কোথাও dangerouslySetInnerHTML দিয়ে রেন্ডার হয় না,
// তাই এখানে আর আগে থেকে escape করার দরকার নেই — শুধু ট্রিম যথেষ্ট।
export function sanitizeInput(value: string): string {
  return value.trim();
}

export function sanitizeHref(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed, 'https://vangcur.com');
    return SAFE_HREF_PROTOCOLS.includes(parsed.protocol) ? trimmed : '#';
  } catch {
    return '#';
  }
}

// 🛡️ ফিক্স (audit P2-B6): আগে এখানে একটা আলাদা, দুর্বল validatePhone ছিল
// (শুধু ফরম্যাট চেক করত, all-same/sequential ফেক প্যাটার্ন ধরত না) —
// checkout.ts যেটা ব্যবহার করে সেটার চেয়ে ভিন্ন নিয়ম, ফলে রেজিস্ট্রেশন/
// প্রোফাইল/স্টক-নোটিফাইতে এমন নম্বর গ্রহণ হতো যা checkout-এ বাতিল হতো।
// এখন একটাই বাস্তবায়ন (lib/checkoutData.ts-এ) ব্যবহার হচ্ছে সব জায়গায়।
export { validatePhone } from './checkoutData';

export const MAX_PHONE_LEN = 11;

// 🛡️ ফোন নম্বর ইনপুট থেকে শুধুমাত্র সংখ্যা রাখা হয় — বাংলাদেশি মোবাইল নম্বর ছাড়া
// আর কিছুই (স্ক্রিপ্ট, চিহ্ন, লেটার) এই ফিল্ডে ঢুকতে পারবে না।
/**
 * বাংলা সংখ্যা (০-৯) → ইংরেজি সংখ্যা (0-9)। বাংলা কীবোর্ডে (Avro, Gboard বাংলা) লিখলে বা
 * বাংলা সংখ্যাসহ পেস্ট করলে সংখ্যাগুলো যেন `\D` ফিল্টারে মুছে না যায় — আগে মুছে যেত বলে ঘরটা
 * "টাইপ করা যাচ্ছে না" মনে হতো। ক্লায়েন্ট ও সার্ভার — দুই জায়গাতেই এই একটাই ফাংশন।
 */
export function bnDigitsToEn(value: string): string {
  return value.replace(/[০-৯]/g, (ch) => String(ch.charCodeAt(0) - 0x09e6));
}

/**
 * (audit P2-B6) বাংলাদেশি নম্বরের আন্তর্জাতিক/অন্য ফরম্যাটকে ১১ ডিজিটের স্থানীয় রূপে আনে।
 *   +8801712345678 / 8801712345678 / 008801712345678 / +880 01712345678 / +88 01712-345678 → 01712345678
 * শুধু সংখ্যা রাখে; ঠিক ১৩ ডিজিটের 880-প্রিফিক্স (বা তার 00/0-যুক্ত রূপ) হলেই কাটে।
 * ১০ ডিজিটের নম্বরে (শুরুর ০ বাদ) কিছু যোগ করে না — সেটা ইচ্ছাকৃতভাবে ভুল হিসেবেই গণ্য।
 * ক্লায়েন্ট ও সার্ভার — দুই জায়গাতেই এই একটাই ফাংশন।
 */
export function normalizeBdPhone(value: string): string {
  let d = bnDigitsToEn(String(value ?? '')).replace(/\D/g, '');
  if (d.startsWith('00880')) d = d.slice(2);                       // 00880… → 880…
  if (d.startsWith('8800') && d.length === 14) d = d.slice(3);      // +880 0171… → 0171…
  else if (d.startsWith('880') && d.length === 13) d = d.slice(2);  // 8801712345678 → 01712345678
  return d;
}

/**
 * ফোন ইনপুটের স্মার্ট ফরম্যাটার: বাংলা সংখ্যা → ইংরেজি, +880/880 প্রিফিক্স ছাঁটা, তারপর
 * বাংলাদেশি মোবাইল নম্বরের গঠন ধাপে ধাপে মানানো — প্রথম সংখ্যা অবশ্যই 0, দ্বিতীয় 1, তৃতীয় 3–9
 * (validatePhone-এর `^01[3-9]\d{8}$`-এর সাথে মিল)। নিয়ম ভাঙা সংখ্যা থেকে বাকিটা বাদ যায়।
 * শুধু ঠিক ১০ ডিজিটের পেস্ট করা নম্বর (1712345678) হলে শুরুতে 0 বসিয়ে দেওয়া হয়।
 */
export function sanitizePhoneInput(value: string): string {
  let d = normalizeBdPhone(value);
  if (/^1[3-9]\d{8}$/.test(d)) d = '0' + d;
  let out = '';
  for (const ch of d) {
    const i = out.length;
    if (i === 0 && ch !== '0') break;
    if (i === 1 && ch !== '1') break;
    if (i === 2 && !/[3-9]/.test(ch)) break;
    out += ch;
    if (out.length >= MAX_PHONE_LEN) break;
  }
  return out;
}

/** ফোন ইনপুট ঘরের maxLength — পেস্ট করা "+88 01712-345678" যেন ব্রাউজার আগেই না কেটে ফেলে (কাটার কাজ sanitizePhoneInput করে) */
export const PHONE_INPUT_MAX_CHARS = 24;

export function validateEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/.test(trimmed);
}

const PLAIN_NAME_REGEX = /^[\p{L}\p{M}\s]*$/u;
export const MAX_NAME_LEN = 30;

export function sanitizePlainName(value: string): string {
  const lettersOnly = Array.from(value)
    .filter((ch) => /[\p{L}\p{M}\s]/u.test(ch))
    .join('');
  // কাটার পর শেষে যেন একা কোনো মাত্রা/চিহ্ন (\p{M}) না থাকে — নাহলে অক্ষরটা ভেঙে যায়
  return lettersOnly
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+/, '')
    .slice(0, MAX_NAME_LEN)
    .replace(/\p{M}+$/u, '');
}

export function validateName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 3 && trimmed.length <= MAX_NAME_LEN && PLAIN_NAME_REGEX.test(trimmed);
}

export function sanitizeEmailInput(value: string): string {
  return value.replace(/[^\x21-\x7E]/g, '').slice(0, 254);
}

// 🛡️ একটাই ঠিকানা-নিয়ম সব জায়গায় (প্রোফাইল, চেকআউট, সার্ভার অ্যাকশন, DB):
// আগে এখানে দুর্বল ভ্যালিডেটর ছিল (শুধু দৈর্ঘ্য দেখত), ফলে প্রোফাইল "aaaaaaaa"
// গ্রহণ করে সম্পূর্ণ বলত, কিন্তু চেকআউট সেটা বাতিল করত। এখন checkoutData-এর
// কড়া নিয়মই ব্যবহৃত হয়।
export { validateAddress } from './checkoutData';

export const MAX_ADDR_LEN = 200;

// 🛡️ পূর্ণাঙ্গ সেনিটাইজেশন: HTML/স্ক্রিপ্ট ট্যাগ ডিলিমিটার, কন্ট্রোল ক্যারেক্টার, এবং
// CSV/এক্সেল ফর্মুলা-ইনজেকশন (=, +, -, @ দিয়ে শুরু হওয়া ইনপুট — অ্যাডমিন পরে অর্ডার
// এক্সপোর্ট করে এক্সেলে খুললে ফর্মুলা হিসেবে চালিত হতে পারে) থেকে সুরক্ষিত।
//
// 🛠️ ফিক্স: আগে এখানে শেষে .trim() ছিল, আর এই ফাংশনটাই প্রতিটা কি-স্ট্রোকে
// (onChange-এ) কল হয় — তাই ইউজার যেই মুহূর্তে দুইটা শব্দের মাঝে স্পেস চাপত,
// সেই ট্রেইলিং স্পেসটা পরের অক্ষর টাইপ করার আগেই মুছে যেত, ফলে স্পেস আদৌ
// টাইপ করা যাচ্ছিল না। এখন শুধু শুরুর স্পেস বাদ যায় (যেটা টাইপিং আটকায় না);
// শেষের/মাঝের অতিরিক্ত স্পেস ফাইনাল সাবমিটের সময় (updateMyProfile-এ) trim হয়।
export function sanitizeAddressInput(value: string): string {
  const v = value
    .replace(/[<>`]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/^[=+\-@]+/, '')
    .replace(/^\s+/, '');
  return v.slice(0, MAX_ADDR_LEN);
}

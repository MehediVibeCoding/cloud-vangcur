/**
 * formatSafeDate
 * ─────────────────────────────────────────────────────────────────────
 * 🛡️ Safari/WebKit ক্র্যাশ-প্রুফ ডেট ফরম্যাটার।
 *
 * কেন দরকার: `new Date(value).toLocaleDateString('bn-BD', {...})` —
 * এই প্যাটার্নটা কোড জুড়ে (রিভিউ, Q&A, অর্ডার কার্ড, অ্যাকাউন্ট পেজ)
 * ব্যবহার হয়। Chrome/V8-তে `toLocaleDateString()` একটা Invalid Date-এও
 * (malformed/missing timestamp হলে) চুপচাপ "Invalid Date" স্ট্রিং
 * রিটার্ন করে — কখনো থ্রো করে না। কিন্তু Safari-এর JavaScriptCore
 * ইঞ্জিনে Invalid Date-এ `toLocaleDateString()`/`toLocaleString()` কল
 * করলে `RangeError: Invalid time value` থ্রো হয় — যেটা React রেন্ডারের
 * মধ্যে ধরা পড়লে পুরো পেজ global error boundary-তে ক্র্যাশ করে।
 * (অ্যান্ড্রয়েড/Chrome-এ কখনো দেখা যায় না বলেই এতদিন ধরা পড়েনি।)
 *
 * এই হেলপার Invalid Date আগেভাগে চেক করে, আর `toLocaleDateString`
 * কলটাও try/catch-এ রাখে (যদি কোনো লোকেল/ইঞ্জিন কম্বিনেশনে সেটাও থ্রো
 * করে) — কোনো অবস্থাতেই এটা exception ছুঁড়বে না, খারাপ হলে খালি
 * স্ট্রিং রিটার্ন করবে।
 */
export function formatSafeDate(
  value: string | number | Date | null | undefined,
  lang: 'en' | 'bn',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  if (!value) return '';

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  try {
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'bn-BD', options);
  } catch {
    // 🛡️ লোকেল/ইঞ্জিন যাই হোক, কখনো থ্রো করবে না — fallback হিসেবে
    // একটা সাধারণ ISO-স্টাইল ডেট স্ট্রিং দেওয়া হচ্ছে, খালি স্ট্রিং না।
    try {
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }
}

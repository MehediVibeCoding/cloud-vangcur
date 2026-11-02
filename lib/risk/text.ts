// টেক্সট নরমালাইজেশন ও অর্থহীন লেখা (gibberish) শনাক্তকরণ।
// এই ফাইলের নিয়মগুলোই ঠিকানা/নাম/ইমেইলের মান যাচাইয়ের ভিত্তি — নতুন নিয়ম শেখাতে হলে এখানে যোগ হবে।

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF\u2060]/g;

/** NFC + অদৃশ্য অক্ষর বাদ + বাংলা সংখ্যা → ইংরেজি সংখ্যা + বাড়তি ফাঁকা বাদ */
export function normalizeText(s: unknown): string {
  return String(s ?? '')
    .normalize('NFC')
    .replace(ZERO_WIDTH, '')
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** ফোন/সংখ্যা তুলনার জন্য: শুধু ইংরেজি অঙ্ক রাখে (বাংলা অঙ্কও রূপান্তর হয়) */
export function digitsOnly(s: unknown): string {
  return normalizeText(s).replace(/\D/g, '');
}

export function toBnDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export const hasBengali = (s: string) => /[\u0980-\u09FF]/.test(s);
export const hasLatin = (s: string) => /[a-z]/i.test(s);

/** শব্দে ভাঙা — বাংলা ও ইংরেজি অক্ষর/সংখ্যা রাখে, বাকি সব বিভাজক */
export function tokenize(s: string): string[] {
  return normalizeText(s)
    .toLowerCase()
    .split(/[^a-z0-9\u0980-\u09FF]+/)
    .filter(Boolean);
}

/**
 * বাংলা বানানের ভিন্নতা মেলানোর "কী": ী/ি, ূ/ু, ণ/ন, শ/ষ/স, ৎ/ত একই ধরা,
 * ড়/ঢ়/য় এর দুই রূপ একই, চন্দ্রবিন্দু ও হসন্ত বাদ।
 * (যেমন মুন্সিগঞ্জ = মুন্সীগঞ্জ, নেত্রকোণা = নেত্রকোনা)
 */
export function bnKey(s: string): string {
  return normalizeText(s)
    .normalize('NFD')
    .replace(/\u09DC/g, '\u09A1\u09BC')
    .replace(/\u09DD/g, '\u09A2\u09BC')
    .replace(/\u09DF/g, '\u09AF\u09BC')
    .replace(/[\u09BC\u09CD\u0981]/g, '') // নুক্তা, হসন্ত, চন্দ্রবিন্দু
    .replace(/[\u09C0]/g, '\u09BF')
    .replace(/[\u09C2]/g, '\u09C1')
    .replace(/[\u09A3]/g, '\u09A8')
    .replace(/[\u09B6\u09B7]/g, '\u09B8')
    .replace(/\u09CE/g, '\u09A4')
    .replace(/[\u09A1\u09A2\u09AF](?=)/g, (c) => c) // placeholder (no-op) — রাখা হয়েছে কারণ ড়/য়-এর মূল অক্ষর আলাদা থাকে
    .replace(/\s+/g, '');
}

/** ইংরেজি/Banglish নামের কী: ছোট হাতের, শুধু অক্ষর, টানা একই অক্ষর একটা, সাধারণ বানান-ভিন্নতা সমান */
export function enKey(s: string): string {
  return normalizeText(s)
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/ck/g, 'k')
    .replace(/z/g, 'j')
    .replace(/w/g, 'v')
    .replace(/ph/g, 'f')
    .replace(/(.)\1+/g, '$1');
}

/** দুই শব্দের edit-distance, সীমা পেরোলে সীমা+১ ফেরত (দ্রুত) */
export function editDistance(a: string, b: string, limit = 1): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return limit + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

// ───────────────────────── অর্থহীন লেখা ─────────────────────────

export type GibberishCode =
  | 'repeat_run' // একই অক্ষর টানা (aaa, ভভভ)
  | 'repeat_pattern' // একই জোড়া/তিনটা বারবার (hdhdhd, ababab)
  | 'no_vowel' // স্বরবর্ণহীন লম্বা শব্দ
  | 'consonant_run' // টানা অনেক ব্যঞ্জন
  | 'low_vowel' // স্বরবর্ণ অনুপাত খুব কম
  | 'keyboard' // কিবোর্ডের সারি (asdf, qwer, 12345)
  | 'bn_malformed' // বাংলা অক্ষরের অসম্ভব গঠন
  | 'digits_only';

export interface GibberishOptions {
  repeatRun: number;
}

/** স্বরবর্ণ-ছাড়া কিন্তু বৈধ সংক্ষেপ/শব্দ — এগুলো অর্থহীন ধরা হবে না */
export const LATIN_ALLOW = new Set([
  'dhk', 'ctg', 'rd', 'blk', 'bl', 'mkt', 'bzr', 'sk', 'md', 'mst', 'mrs', 'mrss', 'dist', 'upz', 'ps', 'po',
  'nrth', 'sdr', 'hsc', 'ssc', 'bsc', 'cmpd', 'bhbn', 'sgdp',
]);

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];
const KEY_SUBSTRINGS: string[] = (() => {
  const out: string[] = [];
  for (const row of KEY_ROWS) {
    for (const r of [row, [...row].reverse().join('')]) {
      for (let len = 4; len <= r.length; len++) {
        for (let i = 0; i + len <= r.length; i++) out.push(r.slice(i, i + len));
      }
    }
  }
  return out;
})();

function keyboardWalk(token: string): boolean {
  for (const sub of KEY_SUBSTRINGS) {
    if (token.includes(sub)) {
      // "property" এর "erty" এর মতো বৈধ শব্দ বাঁচাতে: ৫+ অক্ষর অথবা শব্দের ≥৬০% জুড়ে থাকতে হবে
      if (sub.length >= 5 || sub.length / token.length >= 0.6) return true;
    }
  }
  return false;
}

/** একটা শব্দ (টোকেন) পরীক্ষা করে অর্থহীন হলে কারণ ফেরত দেয়, নইলে null */
export function analyzeToken(raw: string, opts: GibberishOptions): GibberishCode | null {
  const token = raw.toLowerCase();
  if (!token) return null;
  const run = opts.repeatRun;

  if (/^[0-9]+$/.test(token)) return null; // সংখ্যা ঠিকানায় স্বাভাবিক (বাসা নম্বর) — আলাদাভাবে দেখা হয়

  // বাংলা অক্ষরের টোকেন
  if (hasBengali(token)) {
    if (new RegExp(`([\\u0980-\\u09FF])\\1{${run - 1},}`).test(token)) return 'repeat_run';
    if (/^[\u09BE-\u09CC\u09CD]/.test(token)) return 'bn_malformed'; // শুরুতে কার-চিহ্ন/হসন্ত
    if (/[\u09BE-\u09CC]{2,}/.test(token)) return 'bn_malformed'; // পরপর কার-চিহ্ন
    if (/\u09CD{2,}/.test(token)) return 'bn_malformed';
    if (token.length >= 6 && /^(.{2,3})\1{2,}/.test(token)) return 'repeat_pattern';
    return null;
  }

  // ইংরেজি/Banglish টোকেন (অক্ষর + সংখ্যা মিশ্র হতে পারে)
  const letters = token.replace(/[^a-z]/g, '');
  if (letters.length === 0) return null;
  if (new RegExp(`([a-z])\\1{${run - 1},}`).test(token)) return 'repeat_run';
  if (letters.length >= 6 && /^(.{2,3})\1{2,}/.test(letters)) return 'repeat_pattern';
  if (letters.length >= 4 && /^(.{2})\1{1,}.?$/.test(letters) && /^(.)(.)\1\2/.test(letters) && letters.length >= 6) return 'repeat_pattern';
  if (letters.length >= 4 && keyboardWalk(token)) return 'keyboard';
  if (letters.length >= 4 && !LATIN_ALLOW.has(letters)) {
    if (!/[aeiouy]/.test(letters)) return 'no_vowel';
    if (/[bcdfghjklmnpqrstvwxz]{6,}/.test(letters)) return 'consonant_run';
    const vowels = (letters.match(/[aeiouy]/g) || []).length;
    if (letters.length >= 6 && vowels / letters.length < 0.2) return 'low_vowel';
  }
  return null;
}

/** পুরো লেখার সব টোকেন পরীক্ষা: কোনগুলো অর্থহীন */
export function findGibberish(tokens: string[], opts: GibberishOptions): { token: string; code: GibberishCode }[] {
  const out: { token: string; code: GibberishCode }[] = [];
  for (const t of tokens) {
    const code = analyzeToken(t, opts);
    if (code) out.push({ token: t, code });
  }
  return out;
}

/** ইমেইলের স্থানীয় অংশ (@ এর আগে) র‍্যান্ডম দেখতে কিনা */
export function looksRandomLocal(local: string, opts: GibberishOptions): boolean {
  const letters = local.toLowerCase().replace(/[^a-z]/g, '');
  if (letters.length < 5) return false;
  if (!/[aeiouy]/.test(letters)) return true;
  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(letters)) return true;
  if (keyboardWalk(letters)) return true;
  if (new RegExp(`([a-z])\\1{${opts.repeatRun - 1},}`).test(letters)) return true;
  const vowels = (letters.match(/[aeiouy]/g) || []).length;
  return letters.length >= 8 && vowels / letters.length < 0.2;
}

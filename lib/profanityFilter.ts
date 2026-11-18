// ফাইলের পাথ: lib/profanityFilter.ts
// গালিগালাজ/অশ্লীল শব্দ ফিল্টার — ব্রাউজারে টাইপ করার সময় ও সার্ভারে (চেকআউট) একই নিয়মে।
//
// কীভাবে কাজ করে:
// • লেখা শব্দে (token) ভাগ হয় (অক্ষর/মাত্রা/সংখ্যার ধারা) — বাংলায় \b কাজ করে না, তাই নিজস্ব ভাগ।
// • শব্দটা হুবহু তালিকায় থাকলে (বা বাংলা শব্দ + সাধারণ বিভক্তি: -রা, -দের, -টা ইত্যাদি) তবেই ধরা হয়।
//   তাই "বালিশ", "বালক", "assistant", "classic" ইত্যাদি নির্দোষ শব্দ ভুল করে কাটা পড়ে না।
// • ইংরেজি অক্ষরে বারবার-লেখা (fuuuck) ও সহজ লিট-স্পিক (f4ck, sh1t) ধরা হয়।
// • টাইপ করার সময় (live) — শব্দ শেষ হয়েছে (পরে স্পেস/চিহ্ন) এমন হলেই কাটে; লাইনের শেষে অসমাপ্ত
//   ছোট/দ্ব্যর্থক শব্দ ("বাল") কাটে না যাতে "বালিশ" টাইপ করা যায়। সাবমিটে (final) সব কাটে/আটকায়।
//
// ⚠️ তালিকা ইচ্ছাকৃতভাবে ছোট ও নিশ্চিত-গালির — ভুল-ইতিবাচক কম রাখতে। নতুন শব্দ যোগ করতে নিচের
// BN_WORDS / LATIN_WORDS-এ যোগ করুন।

import { showToast } from './toast';

// বাংলা অক্ষরে (সরাসরি)
const BN_WORDS = [
  'মাগি', 'মাগী', 'মাগিবাজ', 'চুদা', 'চোদা', 'চুদি', 'চোদি', 'চুদাচুদি', 'চোদাচুদি', 'চুদির', 'চোদনা', 'চুদানি',
  'খানকি', 'খানকী', 'খানকির', 'মাদারচোদ', 'মাদারচুদ', 'বাপচোদা', 'বোকাচোদা', 'গান্ডু', 'গাণ্ডু', 'গাঁড়',
  'হারামি', 'হারামী', 'হারামজাদা', 'হারামখোর', 'শুয়োর', 'শুওর', 'কুত্তা', 'কুত্তার', 'কুত্তি', 'কুত্তী',
  'বেশ্যা', 'বেশ্যার', 'বেজন্মা', 'পোদ', 'পাদ্দি', 'ধর্ষক', 'লুচ্চা', 'টোকাই', 'ভোদা', 'ভুদা', 'ধোন', 'ধন্ডা',
  'বাল', 'বালের', 'বালছাল', 'নষ্টা', 'কুলাঙ্গার',
];

// ইংরেজি/বাংলিশ অক্ষরে
const LATIN_WORDS = [
  'fuck', 'fucker', 'fucking', 'fck', 'fuk', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'pussy', 'slut', 'whore',
  'cunt', 'motherfucker',
  'chuda', 'chodna', 'choda', 'chudi', 'chudir', 'chudbo', 'chudmu', 'khanki', 'khankir', 'madarchod',
  'madarchud', 'bokachoda', 'bapchoda', 'harami', 'haramzada', 'haramjada', 'shuor', 'suor', 'kutta', 'kuttar',
  'kutti', 'bessha', 'beshya', 'bessa', 'gandu', 'gaandu', 'bal', 'baler', 'balchal', 'bhoda', 'dhon',
  'lucha', 'bejonma', 'beijjot',
];

// ছোট/দ্ব্যর্থক — লাইভ টাইপিংয়ে লাইনের শেষে অসমাপ্ত অবস্থায় কাটা হয় না (পরে বড় শব্দের অংশ হতে পারে)
const AMBIGUOUS_WHEN_PARTIAL = new Set(['বাল', 'bal', 'pod', 'mf', 'wtf', 'dick', 'পোদ', 'ধোন', 'dhon', 'magi', 'মাগি', 'মাগী', 'চুদা', 'চোদা', 'choda', 'chuda', 'chudi', 'চুদি', 'চোদি', 'kutta', 'কুত্তা', 'harami', 'হারামি', 'হারামী']);

// বাংলা শব্দের পরে সাধারণ বিভক্তি/প্রত্যয়
const BN_SUFFIXES = ['', 'রা', 'দের', 'টা', 'টি', 'কে', 'র', 'ের', 'গুলো', 'গুলা', 'গুলি', 'ে', 'ি', 'ী', 'য়', 'ে', 'ও'];
const LATIN_SUFFIXES = ['', 's', 'er', 'ing', 'ed', 'a', 'ra', 'der', 'ta', 'ke', 'r'];

const bnSet = new Set(BN_WORDS);
const latinSet = new Set(LATIN_WORDS);

const TOKEN_RE = /[\p{L}\p{M}\p{N}]+/gu;
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b' };

function hasBengali(s: string): boolean {
  return /[ঀ-৿]/.test(s);
}

function normalizeLatin(token: string): string {
  let t = token.toLowerCase();
  // শুধু অক্ষর+সংখ্যা মেশানো টোকেনে লিট-স্পিক খোলা (শুধু সংখ্যা হলে নয়)
  if (/[a-z]/.test(t)) t = t.replace(/[0134578]/g, (d) => LEET[d] || d);
  // ৩+ বার পুনরাবৃত্তি → ১ (fuuuck → fuck); ২ বারও কমানো হয় (shiit → shit) যদি এতে মিলে
  const collapsed3 = t.replace(/([a-z])\1{2,}/g, '$1');
  const collapsed2 = t.replace(/([a-z])\1+/g, '$1');
  return collapsed3 === collapsed2 ? collapsed3 : `${collapsed3}|${collapsed2}`;
}

function matchesLatin(token: string): boolean {
  const variants = normalizeLatin(token).split('|');
  const all = new Set(variants);
  all.add(token.toLowerCase());
  for (const v of all) {
    if (latinSet.has(v)) return true;
    for (const suf of LATIN_SUFFIXES) {
      if (suf && v.endsWith(suf) && latinSet.has(v.slice(0, -suf.length)) && v.length - suf.length >= 4) return true;
    }
  }
  // collapsed2 দিয়ে সংক্ষিপ্ত তালিকার শব্দও মেলানো (যেমন 'maggi' → 'magi')
  for (const v of all) {
    for (const w of latinSet) {
      if (w.replace(/([a-z])\1+/g, '$1') === v && v.length >= 4) return true;
    }
  }
  return false;
}

function matchesBengali(token: string): boolean {
  if (bnSet.has(token)) return true;
  for (const suf of BN_SUFFIXES) {
    if (suf && token.endsWith(suf)) {
      const base = token.slice(0, -suf.length);
      // ছোট (৩ অক্ষরের) মূল শব্দে বিভক্তি ধরলে ভুল ধরার ঝুঁকি বেশি (বাল+িশ = বালিশ নয়, কিন্তু বাল+ক = বালক…)
      if (base.length >= 4 && bnSet.has(base)) return true;
      if (base === 'বাল' && (suf === 'ের' || suf === 'র')) return true; // বালের
    }
  }
  return false;
}

function isProfaneToken(token: string): boolean {
  if (token.length < 2) return false;
  // অন্য শব্দ-অক্ষর মেশানো (বাংলা+ইংরেজি এক টোকেনে) — আলাদা করে দুই দিকেই দেখা
  if (hasBengali(token)) return matchesBengali(token);
  return matchesLatin(token);
}

export interface ProfanityResult {
  text: string;
  /** কোনো শব্দ কাটা হয়েছে কি */
  removed: boolean;
}

/**
 * লেখা থেকে গালিগালাজ শব্দ বাদ দেয়।
 * mode 'live': কি-স্ট্রোকে ব্যবহারের জন্য — শেষের অসমাপ্ত দ্ব্যর্থক শব্দ কাটে না।
 * mode 'final': সাবমিট/সার্ভারের জন্য — সব কাটে।
 */
export function stripProfanity(value: string, mode: 'live' | 'final' = 'live'): ProfanityResult {
  if (!value) return { text: value, removed: false };
  let removed = false;
  let out = '';
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(value)) !== null) {
    const token = m[0];
    const start = m.index;
    const end = start + token.length;
    const atEnd = end === value.length;
    if (!isProfaneToken(token)) continue;
    if (mode === 'live' && atEnd && AMBIGUOUS_WHEN_PARTIAL.has(token.toLowerCase())) continue;
    out += value.slice(last, start);
    last = end;
    removed = true;
    // কাটা শব্দের আগে-পরে দুই স্পেস জমলে একটা বাদ
    if (/\s$/.test(out) && /^\s/.test(value.slice(last))) last += 1;
  }
  if (!removed) return { text: value, removed: false };
  out += value.slice(last);
  return { text: out, removed: true };
}

export function containsProfanity(value: string): boolean {
  return stripProfanity(value, 'final').removed;
}

const TOAST_MSG = 'অশোভন শব্দ ব্যবহার করা যাবে না';
let lastToastAt = 0;

/**
 * onChange-এ ব্যবহারের হেল্পার: `setX(cleanTyping(e.target.value))`।
 * গালি পেলে মুছে দেয় ও (২ সেকেন্ডে একবার) টোস্ট দেখায়।
 */
export function cleanTyping(value: string): string {
  const r = stripProfanity(value, 'live');
  if (r.removed) {
    const now = Date.now();
    if (typeof window !== 'undefined' && now - lastToastAt > 2000) {
      lastToastAt = now;
      try { showToast(TOAST_MSG); } catch { /* ignore */ }
    }
  }
  return r.text;
}

export const PROFANITY_ERROR_MESSAGE = TOAST_MSG;

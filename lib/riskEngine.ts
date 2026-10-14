// [REPLACE] ফাইলের পাথ: lib/riskEngine.ts
//
// অর্ডার ট্রাস্ট স্কোর (ইঞ্জিন v2) — ১০০ নম্বরের হিসাব। শুধুমাত্র অ্যাডমিনের জন্য নীরব মার্কিং;
// এখানকার যাচাই-নিয়ম চেকআউটে কাস্টমারকে কখনো আটকায় না বা কোনো বার্তা দেখায় না।
// ফাইলটা পিওর (ডাটাবেজ/নেটওয়ার্ক কল নেই), তাই আলাদাভাবে টেস্ট করা যায়।
//
// v1 থেকে পরিবর্তন: কোনো তথ্য না থাকলে (ইমেইল/ঠিকানা ইত্যাদি) এখন ওই ফ্যাক্টর স্কোরে
// অংশ নেয় না (0/max দেখাবে কিন্তু চূড়ান্ত স্কোরে শাস্তি দেয় না) — বাকি জানা ফ্যাক্টরগুলো
// দিয়েই পূর্ণ ১০০-র স্কেলে হিসাব হয়। এছাড়া নতুন: নাম-যাচাই মডিউল, অগ্রিম/বিকাশ-যাচাই মডিউল,
// real ডেলিভারি/বাতিল-হিস্ট্রি (আগে শুধু হ্যাঁ/না ছিল), জেলা→উপজেলা→ইউনিয়ন পর্যন্ত ভৌগোলিক
// ম্যাচিং (ফ্রি-টেক্সট ঠিকানা থেকেই, নতুন কোনো ফর্ম ফিল্ড ছাড়া)।
//
// এটা কোনো জেনেরিক/মাল্টি-মার্চেন্ট ইঞ্জিন না — সরাসরি Vangcur-এর ডেটা ও ব্যবসার
// ধরন অনুযায়ী সব নম্বর/থ্রেশহোল্ড হার্ডকোড করা। courier ও behavior (honeypot) মডিউল
// ইচ্ছাকৃতভাবে নেই — এই দুটোর জন্য কোনো বাস্তব ডেটা Vangcur-এ সংগ্রহ হয় না।
//
// স্কোর ≥ ৭৫ → green (High) · ৪৫–৭৪ → yellow (Medium) · < ৪৫ → red (Low)
// নিচের যেকোনো একটা হলে স্কোর যাই হোক, সরাসরি red:
//   - ফোন/ডিভাইসের ২৪ ঘণ্টার হার্ড লিমিট ছুঁয়েছে
//   - ডিসপোজেবল/সাময়িক ইমেইল
//   - নাম + ঠিকানা + ফোন একসাথে অর্থহীন (ফেক-আইডেন্টিটি কম্বো)

import { DISTRICT_MAP_EN } from '@/lib/checkoutData';
import { DISPOSABLE_DOMAIN_LIST } from './risk/data/disposable-domains';
import {
  COURIER_BRANCH_PHRASES, DUMMY_PHONE_NUMBERS, FAKE_TXN_NUMBER_SERIES, FAKE_TXN_WORDS,
  GENERIC_NAME_WORDS, LANDMARK_WORDS, PRANK_TEST_WORDS, PROFANITY_WORDS, REFUSAL_WORDS, containsAny,
} from './risk/data/wordlists';
import { analyzeGeo } from './risk/geo';
import { digitsOnly, findGibberish, looksRandomLocal, normalizeText, tokenize } from './risk/text';

export type RiskLevel = 'green' | 'yellow' | 'red';
export type FactorTone = 'good' | 'warn' | 'bad';

export interface RiskFactor {
  key: string;
  label: string;
  points: number;
  max: number;
  tone: FactorTone;
  note: string;
}

export interface RiskLimitHit {
  type: string;
  severity: 'hard' | 'soft';
  /** ফোন/ডিভাইস/লগইনের সাথে সরাসরি মিলেছে (শুধু আইপি মিললে false) */
  strong: boolean;
}

export interface RiskGeo {
  city: string;
  country: string;
}

export interface RiskHistory {
  delivered: number;
  /** cancelled + rejected একসাথে — Vangcur-এর status-এ আলাদা "returned" নেই */
  cancelled: number;
}

export interface RiskAdvance {
  amount: number;
  senderNumber: string | null;
  transactionId: string | null;
  /** বিকাশ এসএমএস/ওয়েবহুক দিয়ে ইতিমধ্যে অটো-ম্যাচড/ভেরিফায়েড কিনা */
  verified: boolean;
}

export interface RiskInput {
  total: number;
  items: { id: string | number; qty: number }[];
  name: string;
  phone: string;
  email: string;
  district: string;
  address: string;
  isLoggedIn: boolean;
  loginEmail: string | null;
  loginPhone: string | null;
  history: RiskHistory;
  limitHits: RiskLimitHit[];
  geo: RiskGeo;
  /** বাংলাদেশ সময় অনুযায়ী ০–২৩ ঘণ্টা */
  hourOfDay: number;
  /** advance.amount > 0 হলে 'delivery_fee_paid', নইলে 'cod' (যেমন Legendary ভাউচারে ০ অগ্রিম) */
  payment: 'cod' | 'delivery_fee_paid';
  advance: RiskAdvance;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  hardLimit: boolean;
  factors: RiskFactor[];
  reasons: string[];
}

export const GREEN_MIN_SCORE = 75;
export const YELLOW_MIN_SCORE = 45;

const GIBBERISH_OPTS = { repeatRun: 3 };
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const bn = (n: number): string => String(Math.round(n)).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

function toneOf(value: number): FactorTone {
  if (value >= 0.7) return 'good';
  if (value >= 0.4) return 'warn';
  return 'bad';
}

// ───────────────────────── ফোন (weight ১৪) ─────────────────────────

const BD_MOBILE = /^01[3-9]\d{8}$/;
const DUMMY_PHONE_SET = new Set(DUMMY_PHONE_NUMBERS);

function maxRepeatRun(d: string): number {
  let best = 1, cur = 1;
  for (let i = 1; i < d.length; i++) {
    cur = d[i] === d[i - 1] ? cur + 1 : 1;
    if (cur > best) best = cur;
  }
  return best;
}
function hasShortRepeatPattern(d: string): boolean {
  for (const len of [1, 2, 3]) {
    const re = new RegExp(`^(\\d{${len}})\\1{${Math.ceil(6 / len)},}`);
    if (re.test(d)) return true;
  }
  return false;
}
function isSequential(d: string): boolean {
  let asc = 0, desc = 0;
  for (let i = 1; i < d.length; i++) {
    if (+d[i] === +d[i - 1] + 1) asc++;
    if (+d[i] === +d[i - 1] - 1) desc++;
  }
  return asc >= d.length - 2 || desc >= d.length - 2;
}
function isMirrored(d: string): boolean {
  const half = Math.floor(d.length / 2);
  const a = d.slice(0, half);
  const b = d.slice(-half).split('').reverse().join('');
  return half >= 3 && a === b;
}

function gradePhone(phoneRaw: string, loginPhone: string | null, isLoggedIn: boolean): { value: number; note: string } {
  let d = digitsOnly(phoneRaw).replace(/^88/, '');
  // শুরুর "0" বাদ পড়ে থাকতে পারে (যেমন 1712345678) — স্বয়ংক্রিয়ভাবে যোগ করে আবার যাচাই
  if (!BD_MOBILE.test(d) && d.length === 10 && /^1[3-9]/.test(d)) d = '0' + d;
  if (!BD_MOBILE.test(d)) return { value: 0, note: 'ফোন নম্বরের গঠন সঠিক নয়' };
  if (DUMMY_PHONE_SET.has(d)) return { value: 0.05, note: 'পরিচিত ডামি/টেস্ট নম্বর' };

  const last9 = d.slice(2);
  if (maxRepeatRun(last9) >= 6 || hasShortRepeatPattern(last9)) return { value: 0.1, note: 'নম্বরে পুনরাবৃত্ত প্যাটার্ন' };
  if (isSequential(last9)) return { value: 0.15, note: 'নম্বরে ক্রমিক অঙ্কের প্যাটার্ন (যেমন ১২৩৪৫৬৭৮)' };
  if (isMirrored(last9)) return { value: 0.2, note: 'নম্বরে মিরর/উল্টো প্যাটার্ন' };

  const lp = loginPhone ? digitsOnly(loginPhone).replace(/^88/, '') : '';
  if (isLoggedIn && lp && lp === d) return { value: 1, note: 'লগইন অ্যাকাউন্টের নম্বরের সাথে মিলেছে' };
  return { value: 1, note: 'বৈধ ফোন নম্বর' };
}

// ───────────────────────── ইমেইল (weight ৮) ─────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DISPOSABLE_SET = new Set(DISPOSABLE_DOMAIN_LIST);
// (পুরনো v1 ইঞ্জিনের ফিচার — নতুন ইঞ্জিনে ছিল না, কিন্তু কাজের তাই রেখে দেওয়া হলো)
const EMAIL_TYPO_DOMAINS: Record<string, string> = {
  'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmil.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'gmal.com': 'gmail.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'yhoo.com': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outllook.com': 'outlook.com',
};

function gradeEmail(
  emailRaw: string, loginEmail: string | null, isLoggedIn: boolean,
): { value: number | null; note: string; disposable: boolean } {
  const clean = normalizeText(emailRaw).toLowerCase();
  if (!clean) return { value: null, note: 'কোনো ইমেইল দেওয়া হয়নি', disposable: false };
  if (!EMAIL_RE.test(clean)) return { value: 0.1, note: 'ইমেইলের গঠন সঠিক নয়', disposable: false };

  const [local, domain] = clean.split('@');
  if (DISPOSABLE_SET.has(domain)) {
    return { value: 0, note: `সাময়িক/ফেক মেইল সার্ভিসের ইমেইল (${domain})`, disposable: true };
  }
  if (EMAIL_TYPO_DOMAINS[domain]) {
    return { value: 0.3, note: `ডোমেইনে বানান ভুল (${domain}) — ইমেইলটি কাজ করবে না`, disposable: false };
  }
  if (looksRandomLocal(local, GIBBERISH_OPTS)) {
    return { value: 0.35, note: 'র‍্যান্ডম/জিবারিশ ইমেইল আইডি', disposable: false };
  }
  if (isLoggedIn && loginEmail && loginEmail.toLowerCase() === clean) {
    return { value: 1, note: 'লগইন অ্যাকাউন্টের ইমেইল', disposable: false };
  }
  return { value: 1, note: 'সঠিক ফরম্যাটের ইমেইল', disposable: false };
}

// ───────────────────────── নাম (weight ৬, নতুন) ─────────────────────────

function gradeName(nameRaw: string): { value: number | null; note: string } {
  const raw = normalizeText(nameRaw);
  if (!raw) return { value: null, note: 'নাম দেওয়া হয়নি' };

  const letters = raw.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2) return { value: 0.1, note: 'নাম খুবই ছোট' };

  const lower = raw.toLowerCase();
  if (containsAny(lower, PROFANITY_WORDS)) return { value: 0, note: 'নামে অশ্লীল/গালিগালাজ শব্দ' };

  const generic = containsAny(lower, GENERIC_NAME_WORDS);
  if (generic) return { value: 0.15, note: `জেনেরিক নাম ("${generic}") — আসল নাম না-ও হতে পারে` };

  if (containsAny(lower, PRANK_TEST_WORDS)) return { value: 0.1, note: 'টেস্ট/ফাজলামি লেখা নামে' };

  const hits = findGibberish(tokenize(raw), GIBBERISH_OPTS);
  if (hits.length > 0) return { value: 0, note: `অর্থহীন লেখা ("${hits[0].token}")` };

  return { value: 1, note: 'স্বাভাবিক নাম' };
}

// ───────────────────────── ঠিকানা (weight ২০) ─────────────────────────

function gradeAddress(
  addressRaw: string, district: string,
): { value: number | null; note: string; noLandmark: boolean; branchPickup: boolean } {
  const raw = normalizeText(addressRaw);
  if (!raw) return { value: null, note: 'ঠিকানা দেওয়া হয়নি', noLandmark: false, branchPickup: false };

  const letters = raw.replace(/[^\p{L}\p{N}]/gu, '');
  if (letters.length < 8) return { value: 0.15, note: 'ঠিকানা খুবই ছোট', noLandmark: true, branchPickup: false };

  const lower = raw.toLowerCase();
  if (containsAny(lower, REFUSAL_WORDS)) {
    return { value: 0.05, note: 'অর্ডার-বাতিলের ইঙ্গিত টেক্সট', noLandmark: true, branchPickup: false };
  }

  const hits = findGibberish(tokenize(raw).filter((t) => t.length >= 3), GIBBERISH_OPTS);
  if (hits.length > 0) {
    return { value: 0, note: `অর্থহীন লেখা ("${hits[0].token}")`, noLandmark: true, branchPickup: false };
  }

  const geo = analyzeGeo(raw, district);
  let value: number;
  let note: string;
  if (geo.union) { value = 1; note = `ইউনিয়ন পর্যন্ত স্পষ্ট মিল (${geo.union.bn})`; }
  else if (geo.upazila) { value = 0.85; note = `উপজেলা পর্যন্ত স্পষ্ট মিল (${geo.upazila.bn})`; }
  else if (geo.district) { value = 0.6; note = 'শুধু জেলা পর্যন্ত মিল, এলাকার বিস্তারিত কম'; }
  else { value = 0.35; note = 'ঠিকানায় কোনো পরিচিত জেলা/এলাকা শনাক্ত হয়নি'; }

  const hasLandmark = !!containsAny(lower, LANDMARK_WORDS);
  const noLandmark = !hasLandmark && !geo.upazila;
  if (noLandmark) {
    value = Math.min(value, 0.55);
    note = 'বাসা/রাস্তা/এলাকার স্পষ্ট চিহ্ন নেই — ডেলিভারি ম্যান খুঁজে পেতে কষ্ট হতে পারে';
  }
  if (geo.districtMismatch) {
    value = Math.min(value, 0.35);
    note = 'ঠিকানার লেখা আর নির্বাচিত জেলা মিলছে না';
  }

  const branchPickup = !!containsAny(lower, COURIER_BRANCH_PHRASES);
  return { value, note, noLandmark, branchPickup };
}

// ───────────────────────── আইপি বনাম জেলা (weight ৫) ─────────────────────────

// বাংলাদেশি শহরের ইংরেজি বানানের ভিন্নতা — আইপি-জিওলোকেশন সার্ভিস প্রায়ই এই পুরনো/বিকল্প
// বানানে শহর দেখায়, DISTRICT_MAP_EN-এর আসল বানানের সাথে মিলে না বলেই আলাদা তালিকা।
const EXTRA_CITY_ALIASES: Record<string, string[]> = {
  'ঢাকা': ['dacca'],
  'চট্টগ্রাম': ['chittagong', 'chattagram', 'chittagram'],
  'কুমিল্লা': ['comilla', 'kumilla'],
  'বরিশাল': ['barisal'],
  'বগুড়া': ['bogra'],
  'যশোর': ['jessore'],
  'নারায়ণগঞ্জ': ['narayangonj', 'narayanganj'],
  'কক্সবাজার': ["cox's bazar", 'coxs bazar', 'cox bazar', "cox's bazaar"],
  'মৌলভীবাজার': ['maulvibazar', 'moulvibazar', 'maulavibazar'],
  'চাঁপাইনবাবগঞ্জ': ['nawabganj', 'chapai nawabganj', 'chapainawabganj'],
  'ব্রাহ্মণবাড়িয়া': ['brahmanbaria', 'brahmanbariya'],
  'রাঙ্গামাটি': ['rangamati', 'rangamati hill'],
  'খাগড়াছড়ি': ['khagrachari', 'khagrachhari'],
  'ময়মনসিংহ': ['mymensingh', 'mymensing'],
  'সিলেট': ['sylhet', 'sileth'],
  'জয়পুরহাট': ['joypurhat', 'jaipurhat'],
  'পটুয়াখালী': ['patuakhali'],
  'লক্ষ্মীপুর': ['laxmipur', 'lakshmipur'],
  'নেত্রকোনা': ['netrokona', 'netrakona'],
  'ঝিনাইদহ': ['jhenaidah', 'jhenidah'],
  'ঠাকুরগাঁও': ['thakurgaon'],
};

// ঢাকার আশপাশের জেলাগুলোতে আইপি প্রায়ই ঢাকা দেখায় (বা উল্টো) — এগুলোকে "কাছাকাছি" ধরে মিল ধরা হয়
const DHAKA_AREA = new Set(['ঢাকা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'মুন্সীগঞ্জ', 'মানিকগঞ্জ', 'নরসিংদী']);

function normCity(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/\b(city|division|district|sadar|metropolitan)\b/g, '')
    .replace(/[^a-z' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let cityIndex: Map<string, string> | null = null;
function getCityIndex(): Map<string, string> {
  if (cityIndex) return cityIndex;
  const idx = new Map<string, string>();
  for (const [bnName, en] of Object.entries(DISTRICT_MAP_EN)) idx.set(normCity(en), bnName);
  for (const [bnName, list] of Object.entries(EXTRA_CITY_ALIASES)) {
    for (const a of list) idx.set(normCity(a), bnName);
  }
  cityIndex = idx;
  return idx;
}

function gradeIp(geo: RiskGeo, district: string): { value: number | null; note: string } {
  const city = String(geo.city || '').trim();
  const country = String(geo.country || '').trim().toUpperCase();
  if (country && country !== 'BD') return { value: 0.3, note: `বাংলাদেশের বাইরের আইপি (${country})` };
  if (!city) return { value: null, note: 'আইপি লোকেশন জানা যায়নি' };

  const ipDistrict = getCityIndex().get(normCity(city));
  if (!ipDistrict) return { value: null, note: `আইপির শহর (${city}) জেলার সাথে মেলানো যায়নি` };
  if (ipDistrict === district) return { value: 1, note: `আইপি লোকেশন (${city}) ডেলিভারি জেলার সাথে মিলেছে` };
  if (DHAKA_AREA.has(ipDistrict) && DHAKA_AREA.has(district)) {
    return { value: 1, note: `আইপি লোকেশন (${city}) কাছাকাছি এলাকায়` };
  }
  return { value: 0.6, note: `আইপি লোকেশন (${city}) ডেলিভারি জেলা থেকে আলাদা` };
}

// ───────────────────────── পরিমাণ (weight ৬) ─────────────────────────

const QUANTITY_NORMAL_MAX = 2; // Vangcur গ্যাজেট শপ — একই পণ্য সাধারণত ১-২ পিস

function gradeQuantity(items: { qty: number }[]): { value: number | null; note: string } {
  if (!items || items.length === 0) return { value: null, note: 'পণ্যের তথ্য নেই' };
  const maxQty = Math.max(...items.map((i) => Number(i.qty) || 0));
  if (maxQty <= QUANTITY_NORMAL_MAX) return { value: 1, note: `একই পণ্য সর্বোচ্চ ${bn(maxQty)} পিস` };
  const over = (maxQty - QUANTITY_NORMAL_MAX) / QUANTITY_NORMAL_MAX;
  const value = Math.max(0.1, 1 - over * 0.6);
  return { value, note: `একই পণ্য ${bn(maxQty)} পিস — অস্বাভাবিক বেশি` };
}

// ───────────────────────── অর্ডার এমাউন্ট (weight ১০) ─────────────────────────

const AMOUNT_FULL_UNTIL = 5000; // এর নিচে পূর্ণ নম্বর
const AMOUNT_LOW_AT = 10000; // এর উপরে সর্বনিম্ন নম্বর

function gradeAmount(total: number): { value: number | null; note: string } {
  if (total == null) return { value: null, note: 'এমাউন্টের তথ্য নেই' };
  if (total <= AMOUNT_FULL_UNTIL) return { value: 1, note: `${bn(AMOUNT_FULL_UNTIL)} টাকার নিচে` };
  if (total >= AMOUNT_LOW_AT) return { value: 0.15, note: `${bn(AMOUNT_LOW_AT)} টাকার বেশি — অগ্রিম নিশ্চিত করা ভালো` };
  const frac = (total - AMOUNT_FULL_UNTIL) / (AMOUNT_LOW_AT - AMOUNT_FULL_UNTIL);
  return { value: 1 - frac * 0.85, note: `${bn(AMOUNT_FULL_UNTIL)}–${bn(AMOUNT_LOW_AT)} টাকার মাঝারি অর্ডার` };
}

// ───────────────────────── হিস্ট্রি (weight ১৮) ─────────────────────────

function gradeHistory(h: RiskHistory): { value: number | null; note: string; isNew: boolean } {
  const total = h.delivered + h.cancelled;
  if (total === 0) return { value: 0.5, note: 'নতুন কাস্টমার — আগে কোনো ডেলিভার্ড অর্ডার নেই', isNew: true };

  // Bayesian smoothing (prior ১-১): অল্প ইতিহাসে চরম মান এড়ানো
  const value = Math.max(0, Math.min(1, (h.delivered + 1) / (h.delivered + h.cancelled + 2)));

  if (h.cancelled === 0) return { value, note: `আগে ${bn(h.delivered)}টা অর্ডার সফলভাবে ডেলিভারি হয়েছে`, isNew: false };
  if (value < 0.4) return { value, note: `আগে ${bn(h.cancelled)}টা বাতিল/রিজেক্টেড অর্ডার আছে`, isNew: false };
  return { value, note: `মিশ্র ইতিহাস — ${bn(h.delivered)}টা ডেলিভার্ড, ${bn(h.cancelled)}টা বাতিল`, isNew: false };
}

// ───────────────────────── লিমিট (weight ৮) ─────────────────────────

const LIMIT_LABELS: Record<string, string> = {
  phone_daily: 'একই ফোনে ২৪ ঘণ্টার অর্ডার-সীমা ছুঁয়েছে',
  fingerprint_daily: 'একই ডিভাইসে ২৪ ঘণ্টার অর্ডার-সীমা ছুঁয়েছে',
  coupon_fail_hourly: 'কুপনে ঘণ্টায় অতিরিক্ত ভুল চেষ্টা করেছে',
  phone_cooldown: 'দ্রুত পরপর অর্ডারের চেষ্টা করেছে',
  pending_lock: 'আগের অর্ডার পেন্ডিং থাকতে নতুন অর্ডার চেষ্টা করেছে',
  ip_daily: 'একই আইপিতে ২৪ ঘণ্টার অর্ডার-সীমা ছুঁয়েছে',
  coupon_burst: 'কুপন দ্রুত বারবার চেষ্টা করেছে',
};

function summarizeHits(hits: RiskLimitHit[]): string {
  const counts = new Map<string, number>();
  for (const h of hits) counts.set(h.type, (counts.get(h.type) || 0) + 1);
  return Array.from(counts.entries())
    .map(([type, n]) => `${LIMIT_LABELS[type] || type}${n > 1 ? ` (${bn(n)} বার)` : ''}`)
    .join('; ');
}

function gradeLimit(hits: RiskLimitHit[]): { value: number; note: string; hardStrong: boolean } {
  if (hits.length === 0) return { value: 1, note: 'কোনো লিমিট ছোঁয়নি', hardStrong: false };
  const hardStrongHits = hits.filter((h) => h.severity === 'hard' && h.strong);
  if (hardStrongHits.length > 0) return { value: 0, note: summarizeHits(hardStrongHits), hardStrong: true };
  return { value: 0.4, note: summarizeHits(hits), hardStrong: false };
}

// ───────────────────────── অগ্রিম/বিকাশ পেমেন্ট (weight ৫, নতুন) ─────────────────────────

const TXN_ID_RE = /^[A-Z0-9]{6,12}$/;
const FAKE_TXN_WORDS_LOWER = FAKE_TXN_WORDS.map((w) => w.toLowerCase());
const FAKE_TXN_SERIES_SET = new Set(FAKE_TXN_NUMBER_SERIES);

function gradeAdvance(advance: RiskAdvance, phone: string): { value: number | null; note: string } {
  if (advance.verified) return { value: 1, note: 'বিকাশ পেমেন্ট স্বয়ংক্রিয়ভাবে যাচাই হয়েছে' };
  if (!advance.senderNumber && !advance.transactionId) return { value: null, note: 'অগ্রিম পেমেন্টের তথ্য নেই' };

  let value = 0.5;
  let note = 'অগ্রিম পেমেন্ট দেওয়া হয়েছে';

  if (advance.transactionId) {
    const raw = normalizeText(advance.transactionId);
    const lower = raw.toLowerCase();
    const upper = raw.toUpperCase().replace(/\s+/g, '');
    const digits = digitsOnly(raw);

    if (FAKE_TXN_WORDS_LOWER.some((w) => lower.includes(w))) {
      value = 0.05; note = 'ট্রানজেকশন আইডির ঘরে আসল আইডির বদলে কথা লেখা';
    } else if (digits.length >= 6 && FAKE_TXN_SERIES_SET.has(digits)) {
      value = 0.05; note = 'ডামি/সিরিয়াল সংখ্যার ট্রানজেকশন আইডি';
    } else if (/^(?:88)?01[3-9]\d{8}$/.test(digits)) {
      value = 0.1; note = 'ট্রানজেকশন আইডির ঘরে ফোন নম্বর বসানো — আসল আইডি না';
    } else if (TXN_ID_RE.test(upper)) {
      value = Math.max(value, 0.8); note = 'ট্রানজেকশন আইডির ফরম্যাট ঠিক আছে';
    } else {
      value = Math.min(value, 0.3); note = 'ট্রানজেকশন আইডির ফরম্যাট সন্দেহজনক';
    }
  }

  if (advance.senderNumber && phone) {
    const senderTail = digitsOnly(advance.senderNumber).replace(/^88/, '');
    const phoneDigits = digitsOnly(phone).replace(/^88/, '');
    let matched = false;
    if (senderTail.length >= 11) matched = senderTail === phoneDigits;
    else if (senderTail.length >= 4) matched = phoneDigits.endsWith(senderTail);

    if (matched) {
      value = 1; note = 'বিকাশ প্রেরকের নম্বর অর্ডারের ফোনের সাথে মিলেছে';
    } else if (senderTail.length >= 4) {
      value = Math.min(value, 0.4); note = 'বিকাশ প্রেরকের নম্বর অর্ডারের ফোনের সাথে মিলছে না';
    }
  }

  return { value, note };
}

// ───────────────────────── মূল হিসাব ─────────────────────────

export function calculateOrderRisk(input: RiskInput): RiskResult {
  const factors: RiskFactor[] = [];
  const values: Record<string, number | null> = {};

  let knownWeight = 0;
  let weightedSum = 0;

  const add = (key: string, label: string, weight: number, g: { value: number | null; note: string }) => {
    values[key] = g.value;
    if (g.value == null) {
      factors.push({ key, label, points: 0, max: weight, tone: 'warn', note: g.note });
      return;
    }
    const points = Math.round(g.value * weight * 10) / 10;
    factors.push({ key, label, points, max: weight, tone: toneOf(g.value), note: g.note });
    knownWeight += weight;
    weightedSum += g.value * weight;
  };

  // ── প্রতিটা ফ্যাক্টর ──
  const historyG = gradeHistory(input.history);
  add('history', 'আগের অর্ডার', 18, historyG);

  const addressG = gradeAddress(input.address, input.district);
  add('address', 'ডেলিভারি ঠিকানা', 20, addressG);

  const phoneG = gradePhone(input.phone, input.loginPhone, input.isLoggedIn);
  add('phone', 'ফোন নম্বর', 14, phoneG);

  const amountG = gradeAmount(input.total);
  add('amount', 'অর্ডার এমাউন্ট', 10, amountG);

  const emailG = gradeEmail(input.email, input.loginEmail, input.isLoggedIn);
  add('email', 'ইমেইল', 8, emailG);

  const limitG = gradeLimit(input.limitHits);
  add('limit', 'লিমিট ও কুপন', 8, limitG);

  const quantityG = gradeQuantity(input.items);
  add('quantity', 'একই পণ্যের পরিমাণ', 6, quantityG);

  const nameG = gradeName(input.name);
  add('name', 'নাম', 6, nameG);

  const advanceG = gradeAdvance(input.advance, input.phone);
  add('advance', 'অগ্রিম পেমেন্ট', 5, advanceG);

  const ipG = gradeIp(input.geo, input.district);
  add('ip', 'আইপি বনাম ঠিকানা', 5, ipG);

  // ── কম্বিনেশন নিয়ম ──
  let adjustment = 0;
  const adjustmentNotes: string[] = [];

  // নাম + ঠিকানা + ফোন একসাথে অর্থহীন → ফেক-আইডেন্টিটি (নিচে হার্ড ওভাররাইড হিসেবে ব্যবহৃত)
  const fakeIdentityCombo = values.name === 0 && values.address === 0 && values.phone != null && values.phone <= 0.15;

  // নতুন কাস্টমার + বড় COD এমাউন্ট → বাড়তি সতর্কতা
  if (historyG.isNew && values.amount != null && values.amount < 0.5 && input.payment === 'cod') {
    adjustment -= 8;
    adjustmentNotes.push('নতুন কাস্টমার + বড় এমাউন্ট + ক্যাশ-অন-ডেলিভারি');
  }

  // নতুন কাস্টমার + গভীর রাত (২-৫টা) + ল্যান্ডমার্কহীন ঠিকানা → বাড়তি সতর্কতা
  if (historyG.isNew && addressG.noLandmark && input.hourOfDay >= 2 && input.hourOfDay < 5) {
    adjustment -= 6;
    adjustmentNotes.push('নতুন কাস্টমার + গভীর রাতের অর্ডার + ল্যান্ডমার্কহীন ঠিকানা');
  }

  // পুরনো প্রমাণিত ভালো কাস্টমারের জন্য আইপি-মিসম্যাচের ওয়ার্নিং মাফ
  const trustedReturning = !historyG.isNew && values.history != null && values.history >= 0.75;
  if (trustedReturning && values.ip != null && values.ip < 0.7) {
    const ipFactor = factors.find((f) => f.key === 'ip');
    if (ipFactor) {
      knownWeight -= ipFactor.max;
      weightedSum -= (values.ip as number) * ipFactor.max;
      ipFactor.points = ipFactor.max;
      ipFactor.tone = 'good';
      ipFactor.note += ' (পুরনো বিশ্বস্ত কাস্টমার বলে উপেক্ষা করা হলো)';
    }
  }

  // ── মূল স্কোর (জানা ফ্যাক্টরগুলোর ওজন-গড়, confidence-normalized) ──
  let score = knownWeight > 0 ? (weightedSum / knownWeight) * 100 : 50;
  score += adjustment;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // ── হার্ড ওভাররাইড ──
  const hardLimit = limitG.hardStrong || fakeIdentityCombo || emailG.disposable;

  let level: RiskLevel;
  if (hardLimit) level = 'red';
  else if (score >= GREEN_MIN_SCORE) level = 'green';
  else if (score >= YELLOW_MIN_SCORE) level = 'yellow';
  else level = 'red';

  const reasons = factors
    .filter((f) => f.tone !== 'good')
    .map((f) => `${f.label}: ${f.note}`)
    .concat(adjustmentNotes)
    .slice(0, 6);

  return { score, level, hardLimit, factors, reasons };
}

/** যে ফ্যাক্টরে সবচেয়ে বেশি নম্বর কেটেছে, তার কারণগুলো (বড় থেকে ছোট) — Telegram মেসেজের জন্য */
export function topRiskReasons(result: RiskResult, count = 2): string[] {
  return result.factors
    .filter((f) => f.tone !== 'good')
    .sort((a, b) => (b.max - b.points) - (a.max - a.points))
    .slice(0, count)
    .map((f) => `${f.label}: ${f.note}`);
}

import type { Product, Category } from '@/types';

const BANGLA_RE = /[\u0980-\u09FF]/;
const MIN_EN_LEN = 3;
// ব্যাচ ১১: "3d"/"5g"/"4k"-এর মতো সংখ্যাযুক্ত ছোট কোয়েরির জন্য ব্যতিক্রম — সাধারণ
// ৩-অক্ষরের নিয়ম (স্প্যাম/অপ্রাসঙ্গিক ফলাফল ঠেকানোর জন্য) বাকি সব কোয়েরির জন্য বহাল থাকে।
const MIN_EN_LEN_DIGIT = 2;
// বাংলা বানান ↔ ইংরেজি-অঙ্কযুক্ত শব্দ এলিয়াস — "থ্রিডি" লিখলেও "3D" প্রোডাক্ট মেলে
const BN_DIGIT_ALIASES: Record<string, string> = {
  'থ্রিডি': '3d',
  'ফোরকে': '4k',
  'ফাইভজি': '5g',
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// বাংলা টেক্সট থেকে "শব্দ" আলাদা করার জন্য সাধারণ ফাঁকা জায়গা/যতিচিহ্নে ভাঙা হয়,
// যাতে "সম্পূর্ণ শব্দ মিলেছে কিনা" নির্ভুলভাবে চেক করা যায় (substring না)।
function bnWords(text: string): string[] {
  return (text || '').split(/[\s,.।/|()-]+/).filter(Boolean);
}

// ── ইংরেজি সার্চে বানান-ভুল সহনশীলতা (fuzzy / typo-tolerant matching) ──────────
// "Nean" লিখলেও যাতে "Neon Light" পাওয়া যায়। কোনো বাইরের লাইব্রেরি ছাড়াই
// Damerau-Levenshtein (পাশের দুই অক্ষর অদলবদলও ১ ভুল ধরা হয়) দূরত্ব দিয়ে
// কাজ করে। সব প্রোডাক্ট আগে থেকেই ব্রাউজারে লোড থাকে, তাই ৫০০+ প্রোডাক্টেও
// এটা ক্লায়েন্টেই কয়েক মিলিসেকেন্ডে চলে — আলাদা সার্ভার/ডাটাবেজ কোয়েরি লাগে না।
const FUZZY_MIN_LEN = 4; // ৩ অক্ষরের শব্দে fuzzy বন্ধ ("cat"/"hat" গুলিয়ে যাবে)

function maxTypos(len: number): number {
  if (len < FUZZY_MIN_LEN) return 0;
  return len <= 5 ? 1 : 2;
}

// a থেকে b বানাতে সর্বনিম্ন কয়টা পরিবর্তন (insert/delete/replace/swap) লাগে।
// `limit` পেরিয়ে গেলে আগেই থেমে limit+1 ফেরত দেয় — দ্রুত রাখার জন্য।
function typoDistance(a: string, b: string, limit: number): number {
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > limit) return limit + 1;
  if (al === 0) return bl;
  if (bl === 0) return al;
  let prev2: number[] = [];
  let prev: number[] = [];
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    const cur: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return limit + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[bl];
}

function enWords(text: string): string[] {
  return (text || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= FUZZY_MIN_LEN);
}

// একটা কোয়েরি-শব্দ বনাম একটা প্রোডাক্ট-শব্দ: পুরো শব্দের সাথে অথবা শব্দের শুরুর
// অংশের সাথে (টাইপ করতে করতে অর্ধেক লেখা অবস্থায়ও) মিললে দূরত্ব ফেরত দেয়।
function wordTypoDistance(q: string, w: string): number {
  const limit = maxTypos(q.length);
  if (limit === 0) return Infinity;
  let best = typoDistance(q, w, limit);
  if (w.length > q.length) {
    best = Math.min(best, typoDistance(q, w.slice(0, q.length), limit));
  }
  return best <= limit ? best : Infinity;
}

// সব কোয়েরি-শব্দ প্রোডাক্টের কোনো না কোনো শব্দের সাথে (ভুলসহ) মিললে মোট ভুলের
// সংখ্যা ফেরত দেয়; একটাও না মিললে Infinity।
function fuzzyScore(queryWords: string[], hayWords: string[]): number {
  let total = 0;
  for (const q of queryWords) {
    let best = Infinity;
    for (const w of hayWords) {
      const d = wordTypoDistance(q, w);
      if (d < best) best = d;
      if (best === 0) break;
    }
    if (best === Infinity) return Infinity;
    total += best;
  }
  return total;
}

export function searchProducts(prods: Product[], query: string): Product[] {
  const raw = (query || '').trim();
  if (!raw) return [];
  const isBangla = BANGLA_RE.test(raw);

  // স্কোর: ০ = সরাসরি (substring) মিল, ১+ = বানান-ভুলসহ মিল (যত কম তত ভালো),
  // null = মেলেনি। সরাসরি মিল সবসময় fuzzy মিলের আগে দেখানো হয়।
  function scoreProd(p: Product): number | null {
    if (isBangla) {
      // বাংলায় লিখলে nameBn/tags-এর কোনো একটা শব্দের সাথে হুবহু (exact) মিলতে
      // হবে — আংশিক মিল (যেমন "নিয়" দিয়ে "নিয়ন" ধরা) গ্রহণযোগ্য না।
      const words = [...bnWords(p.nameBn || ''), ...bnWords(p.tags || '')];
      if (words.some((w) => w === raw)) return 0;
      // ব্যাচ ১১: "থ্রিডি"-জাতীয় বাংলা বানান এলিয়াস — nameBn খালি/আলাদা হলেও
      // নাম/ট্যাগে ইংরেজি অঙ্কযুক্ত শব্দ (3D) থাকলে সেটার সাথে মেলানো
      const alias = BN_DIGIT_ALIASES[raw];
      if (alias) {
        const enHay = [p.name || '', p.tags || ''].join(' ').toLowerCase();
        const wb = new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias)}([^a-z0-9]|$)`, 'i');
        if (wb.test(enHay)) return 0;
      }
      return null;
    }
    // ইংরেজিতে লিখলে সাধারণত কমপক্ষে ৩ অক্ষর টাইপ করতে হবে, তবে সংখ্যাযুক্ত
    // ছোট কোয়েরিতে (3d/5g/4k) ২ অক্ষরই যথেষ্ট — তারপর case-insensitive
    // substring মিল যথেষ্ট — যেমন "neo" লিখলেই "Neon Light" ধরা পড়বে।
    const lower = raw.toLowerCase();
    const isDigitQuery = /\d/.test(lower);
    const minLen = isDigitQuery ? MIN_EN_LEN_DIGIT : MIN_EN_LEN;
    if (lower.length < minLen) return null;

    if (lower.length < MIN_EN_LEN) {
      // ছোট (২-অক্ষর সংখ্যাযুক্ত) কোয়েরি: পুরো বিবরণের বদলে শুধু নাম/ট্যাগ/
      // ক্যাটাগরির শব্দ-সীমানায় মেলানো, যাতে ভুলভাবে অপ্রাসঙ্গিক প্রোডাক্ট চলে না আসে।
      const restrictedHay = [p.name || '', p.tags || '', p.cat || '', p.brand || ''].join(' ').toLowerCase();
      const wb = new RegExp(`(^|[^a-z0-9])${escapeRegExp(lower)}`, 'i');
      return wb.test(restrictedHay) ? 0 : null;
    }

    const hay = [
      p.name || '', p.desc || '', p.cat || '', p.tags || '', p.brand || '',
      Object.values(p.specs || {}).join(' '),
    ].join(' ').toLowerCase();
    if (hay.includes(lower)) return 0;

    // বানান-ভুল (typo) সহনশীল মিল: শুধু নাম/ট্যাগ/ক্যাটাগরির শব্দের ওপর, যাতে
    // বড় ডেসক্রিপশনের এলোমেলো শব্দে ভুল মিল না হয়।
    const qWords = lower.split(/[^a-z0-9]+/).filter(Boolean);
    if (!qWords.length) return null;
    const fuzzyHay = enWords([p.name, p.tags, p.cat, p.brand].filter(Boolean).join(' '));
    const fs = fuzzyScore(qWords.filter((w) => w.length >= FUZZY_MIN_LEN), fuzzyHay);
    // ছোট (<৪ অক্ষর) শব্দ থাকলে সেগুলো সাধারণ substring-এই মিলতে হবে
    const shortOk = qWords.filter((w) => w.length < FUZZY_MIN_LEN).every((w) => hay.includes(w));
    const hasFuzzyWords = qWords.some((w) => w.length >= FUZZY_MIN_LEN);
    if (!hasFuzzyWords || !shortOk || fs === Infinity) return null;
    return 1 + fs;
  }

  const scored: { p: Product; s: number }[] = [];
  for (const p of prods) {
    const s = scoreProd(p);
    if (s !== null) scored.push({ p, s });
  }
  return scored
    .sort((a, b) => (a.s - b.s) || ((a.p.stock <= 0 ? 1 : 0) - (b.p.stock <= 0 ? 1 : 0)))
    .map((x) => x.p);
}

export function matchCategories(cats: Category[], query: string, limit = 5): Category[] {
  const raw = (query || '').trim();
  if (!raw) return [];
  // ক্যাটাগরির নাম শুধু ইংরেজিতেই সংরক্ষিত আছে (আলাদা কোনো বাংলা নাম/alias
  // ডেটা নেই), তাই বাংলা কোয়েরিতে ক্যাটাগরি-সাজেশন দেখানো হয় না — ভুল/অর্ধেক
  // মিল দেখানোর চেয়ে কিছু না দেখানোই সঠিক।
  if (BANGLA_RE.test(raw)) return [];
  const lower = raw.toLowerCase();
  if (lower.length < MIN_EN_LEN) return [];
  const words = lower.split(/\s+/).filter(Boolean);

  return cats
    .map((c) => {
      const name = (c.name || '').toLowerCase();
      const id = (c.id || '').toLowerCase();
      const haystackSpaced = `${name} ${id}`;
      let score = 0;
      if (name.startsWith(lower) || id.startsWith(lower)) score = 3;
      else if (words.some((w) => w.length >= MIN_EN_LEN && name.split(' ').some((part) => part.startsWith(w)))) score = 2;
      else if (haystackSpaced.includes(lower)) score = 1;
      else if (fuzzyScore(words.filter((w) => w.length >= FUZZY_MIN_LEN), enWords(haystackSpaced)) !== Infinity
        && words.every((w) => w.length >= FUZZY_MIN_LEN)) score = 0.5; // বানান-ভুলসহ মিল (সবচেয়ে কম অগ্রাধিকার)
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}

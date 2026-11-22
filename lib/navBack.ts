// "ফিরে যান" বাটনের জন্য: window.history.length > 1 দিয়ে বোঝা যায় না আগের পেজটা এই সাইটেরই কিনা
// (নতুন ট্যাবে বা অন্য সাইট থেকে এসে ঢুকলেও length > 1 হতে পারে, তখন router.back() সাইটের বাইরে নিয়ে যেত)।
// তাই সাইটের ভেতরের নেভিগেশন গোনা হয় (sessionStorage) — GlobalOverlays প্রতি পাথ-বদলে trackInAppNav() ডাকে।

import { RESERVED_URL_PREFIXES } from '@/types/guides';

const KEY = 'vc_inapp_nav';

function read(): number {
  try {
    return Math.max(0, Number(sessionStorage.getItem(KEY)) || 0);
  } catch {
    return 0;
  }
}

function write(n: number): void {
  try {
    sessionStorage.setItem(KEY, String(Math.max(0, n)));
  } catch {
    // storage unavailable
  }
}

/** পাথ বদলালে ডাকুন। isPop=true মানে ব্রাউজারের back/forward বাটন (গণনা কমে), নইলে নতুন নেভিগেশন (বাড়ে)। */
export function trackInAppNav(isPop: boolean): void {
  if (isPop && pendingJump !== null) {
    // history.go(±n) দিয়ে লাফ — গণনা n ধাপ বদলায় (back=ঋণাত্মক, forward=ধনাত্মক)
    write(read() + pendingJump);
    pendingJump = null;
    return;
  }
  write(isPop ? read() - 1 : read() + 1);
}

let pendingJump: number | null = null;

/** আগের পেজ সাইটেরই হলে true — তখন router.back() নিরাপদ। */
export function canGoBackInApp(): boolean {
  return typeof window !== 'undefined' && read() > 0;
}

// ── অ্যাকাউন্ট পেজ থেকে "ফিরে যান": প্রোডাক্ট পেজ থেকে ঢুকলে সেই প্রোডাক্টে ফেরা ──
// GlobalOverlays প্রতি পাথ-বদলে noteAccountOrigin(আগের পাথ, নতুন পাথ) ডাকে।
const ACCOUNT_FROM_KEY = 'vc_account_from';

export function noteAccountOrigin(prevPath: string | null, nextPath: string): void {
  try {
    if (nextPath === '/account') {
      if (prevPath && prevPath.startsWith('/product/')) {
        sessionStorage.setItem(ACCOUNT_FROM_KEY, prevPath);
      } else if (prevPath !== '/account') {
        sessionStorage.removeItem(ACCOUNT_FROM_KEY);
      }
    }
  } catch {
    // storage unavailable
  }
}

/** অ্যাকাউন্টে আসার আগে প্রোডাক্ট পেজে থাকলে তার পাথ, নইলে '/' (হোম) */
export function getAccountBackTarget(): string {
  try {
    const v = sessionStorage.getItem(ACCOUNT_FROM_KEY) || '';
    // শুধু সাইটের ভেতরের প্রোডাক্ট পাথ গ্রহণযোগ্য (ওপেন-রিডাইরেক্ট এড়াতে)
    if (/^\/product\/[^/?#\s]+$/.test(v)) return v;
  } catch {
    // ignore
  }
  return '/';
}

// ══════════════════════════════════════════════════════════════════════════════
// 🎨 কালার-ভেরিয়েন্ট হিস্ট্রি: একই কালার-গ্রুপের প্রোডাক্টে ঘোরাঘুরি করলে ব্রাউজার-হিস্ট্রিতে
// প্রতিটা ভেরিয়েন্ট মাত্র একবার (প্রথম-ভিজিটের ক্রমে) থাকে; তাই "ফিরে যান"/ব্যাক-জেসচারে
// ভেরিয়েন্টগুলো একবার করে দেখে তারপর হোমে যায়। আগে প্রতিটা ক্লিকে নতুন এন্ট্রি জমে ব্যাক
// অনেকবার চাপতে হতো।
//
// কৌশল: নতুন ভেরিয়েন্ট → সাধারণ push (এন্ট্রি যোগ); আগে দেখা ভেরিয়েন্ট → history.go(দূরত্ব)
// (নতুন এন্ট্রি বানায় না, আগের এন্ট্রিতে লাফ দেয়)। সব ধাপ ব্যর্থ হলে সাধারণ push-এ ফিরে যায়।
// বন্ধ করতে: নিচের VARIANT_HISTORY_ENABLED = false করুন — তখন আগের মতো সাধারণ লিংক।
// ══════════════════════════════════════════════════════════════════════════════
export const VARIANT_HISTORY_ENABLED = true;

// 🌐 সব ডিটেইল পেজ (প্রোডাক্ট + গাইড) একই "গ্রুপ"-এ — কালার-ভেরিয়েন্ট বাদেও বর্ণনার টেক্সট-লিংক, রিলেটেড কার্ড, গাইড↔প্রোডাক্ট
// সবখানে একই নিয়ম চলে (কেন্দ্রীয় লিসেনার: lib/useDetailNavHistory.ts)। কালার-ভেরিয়েন্টের লিংকও এই গ্রুপেই পড়ে।
export const DETAIL_GROUP = 'detail';

// গাইড পেজ রুট-লেভেলে (/[...segments]), কোনো কমন প্রিফিক্স নেই — তাই "গাইড" চেনা হয় সাইটের নিজস্ব RESERVED_URL_PREFIXES
// (types/guides.ts, GlobalOverlays-এর isGuidePage-ও এটাই ব্যবহার করে) বাদ দিয়ে: ওগুলো গাইড নয় (হোম, ক্যাটাগরি, সার্চ,
// চেকআউট, অ্যাকাউন্ট, ফুটারের পলিসি-পেজ ইত্যাদি)। পলিসি-পেজ ইচ্ছাকৃতভাবে ডিটেইল নয় — ওগুলোর নিজস্ব স্ক্রল-মেমোরি আছে
// (lib/scrollMemory.ts)।
// ⚠️ রুট-লেভেলের যেসব আসল রুট RESERVED_URL_PREFIXES-এ নেই (types/guides.ts ছোঁয়া হয় না) অথচ গাইড নয়:
// /products (গ্রিড/তালিকা), /collection/[slug], /warranty (পলিসি-পেজ)। এগুলো আগে ভুলে "গাইড" ধরা হতো — ফলে প্রোডাক্ট থেকে
// /products-এ ব্যাক করলে "ডিটেইল→ডিটেইল" ভেবে পেজ জোর করে উপরে টানা হতো, আর স্ট্যাকও সাফ হতো না।
// নতুন টপ-লেভেল (গাইড-নয় এমন) রুট বানালে এখানেও যোগ করুন।
const NON_GUIDE_ROOTS = ['products', 'collection', 'warranty'];

/** প্রোডাক্ট পেজ বা গাইড পেজ হলে true */
export function isDetailPath(path: string): boolean {
  const p = normPath(path);
  if (p.startsWith('/product/')) return p.length > '/product/'.length;
  const seg = p.split('/')[1];
  if (!seg || seg.includes('.')) return false; // হোম, অথবা sitemap.xml/ছবির মতো ফাইল
  if (NON_GUIDE_ROOTS.includes(seg)) return false;
  return !RESERVED_URL_PREFIXES.includes(seg);
}

// কেন্দ্রীয় লিসেনার একই ক্লিক সামলালে কালার-ভেরিয়েন্ট বাটনের পুরনো onClick যেন দ্বিতীয়বার হিস্ট্রি না বদলায়
let centralStamp = 0;
export function noteCentralHandled(): void {
  centralStamp = Date.now();
}

// আগে-দেখা পেজে লাফ (history.go) ব্যর্থ ধরার আগে অপেক্ষা। আগে ৭০০ms ছিল — ধীর মোবাইল নেটে পেজ আনতে এর বেশি লাগলে
// ব্যর্থ ভেবে নতুন এন্ট্রি জমত, হিস্ট্রি ভাঙা মনে হতো।
const JUMP_FALLBACK_MS = 2500;

const VH_KEY = 'vc_variant_hist';
const VH_INTENT_KEY = 'vc_variant_intent';

interface VariantHist {
  c: string; // কালার-গ্রুপ আইডি
  s: string[]; // প্রথম-ভিজিটের ক্রমে পাথ (প্রতিটা একবার) — ব্রাউজার-হিস্ট্রির ধারাবাহিক এন্ট্রি
  i: number; // এখন s-এর কোন ঘরে আছি
}

function normPath(p: string): string {
  const only = p.split(/[?#]/)[0];
  try { return decodeURIComponent(only); } catch { return only; }
}

function readVH(): VariantHist | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(VH_KEY) || 'null');
    if (v && typeof v.c === 'string' && Array.isArray(v.s) && typeof v.i === 'number') return v as VariantHist;
  } catch {
    // ignore
  }
  return null;
}

function writeVH(v: VariantHist | null): void {
  try {
    if (v) sessionStorage.setItem(VH_KEY, JSON.stringify(v));
    else sessionStorage.removeItem(VH_KEY);
  } catch {
    // ignore
  }
}

// লাফের "ব্যর্থ ধরার" টাইমার (নিচে)। লাফ সফল হলে (popstate এলে) বন্ধ করা জরুরি — নইলে ২.৫ সেকেন্ডের মধ্যে ওই একই পেজে
// ফিরে এলে টাইমার ভুল করে ভাবে "লাফ কাজ করেনি" আর বাড়তি push করে হিস্ট্রি নষ্ট করে (A↔B দ্রুত ঘুরলে ঘটত)।
let jumpTimer: number | undefined;
function clearJumpTimer(): void {
  if (jumpTimer !== undefined) {
    window.clearTimeout(jumpTimer);
    jumpTimer = undefined;
  }
}

/** GlobalOverlays: প্রতি পাথ-বদলে ডাকে — ভেরিয়েন্ট-হিস্ট্রির পয়েন্টার ঠিক রাখে */
export function variantHistoryOnNav(pathname: string, isPop: boolean): void {
  if (isPop) clearJumpTimer(); // লাফ (বা অন্য ব্যাক) পৌঁছেছে — ব্যর্থতার টাইমার আর দরকার নেই
  const st = readVH();
  if (!st) return;
  const here = normPath(pathname);
  if (isPop) {
    const idx = st.s.findIndex((p) => normPath(p) === here);
    if (idx < 0) {
      // ব্যাকে স্ট্যাকের বাইরের পেজে (হোম, /products, সার্চ…) গেলাম — ঘোরাঘুরির সিস্টেম থেকে বেরিয়েছি, মেমরি সাফ।
      // (আগে এখানে কিছুই মুছত না — পুরনো স্ট্যাক পরের প্রোডাক্টে ঢুকে ব্যাক করলে ভুল পেজে নিয়ে যেত)
      writeVH(null);
      return;
    }
    if (idx !== st.i) writeVH({ ...st, i: idx });
    return;
  }
  // নতুন নেভিগেশন: আমাদের নিজের ভেরিয়েন্ট-ক্লিক হলে রাখি, অন্য যেকোনো কিছু হলে হিস্ট্রি রিসেট
  let intent = '';
  try { intent = sessionStorage.getItem(VH_INTENT_KEY) || ''; sessionStorage.removeItem(VH_INTENT_KEY); } catch { /* ignore */ }
  if (intent && normPath(intent) === here) {
    const j = st.s.findIndex((p) => normPath(p) === here);
    if (j >= 0 && j !== st.i) writeVH({ ...st, i: j });
    return;
  }
  writeVH(null);
}

/**
 * ভেরিয়েন্ট-লিংকের onClick থেকে ডাকুন। true ফেরত দিলে আমরা নেভিগেশন নিজে সামলেছি
 * (ডাকার জায়গায় e.preventDefault() দিন); false হলে সাধারণ Link-নেভিগেশন চলবে।
 */
export function handleVariantClick(
  e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; button: number },
  groupId: string,
  targetHref: string,
  push: (href: string) => void,
): boolean {
  if (!VARIANT_HISTORY_ENABLED || typeof window === 'undefined') return false;
  if (groupId !== DETAIL_GROUP && Date.now() - centralStamp < 100) return false; // কেন্দ্রীয় লিসেনার এই ক্লিক ইতিমধ্যে সামলেছে
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return false;
  try {
    const cur = normPath(window.location.pathname);
    const target = normPath(targetHref);
    if (!target || target === cur) return false;

    let st = readVH();
    if (!st || st.c !== groupId || normPath(st.s[st.i] || '') !== cur) {
      st = { c: groupId, s: [cur], i: 0 };
    }
    const idx = st.s.findIndex((p) => normPath(p) === target);

    // (ক) আগে-দেখা ভেরিয়েন্ট → হিস্ট্রিতে লাফ, নতুন এন্ট্রি নয়
    if (idx >= 0) {
      const delta = idx - st.i;
      if (delta === 0) return false;
      writeVH({ ...st, i: idx });
      pendingJump = delta;
      clearJumpTimer();
      window.history.go(delta);
      jumpTimer = window.setTimeout(() => {
        jumpTimer = undefined;
        if (normPath(window.location.pathname) === cur) {
          // লাফ কাজ করেনি (সম্ভবত হিস্ট্রি বদলে গেছে) — সাধারণ push, হিস্ট্রি রিসেট
          pendingJump = null;
          writeVH({ c: groupId, s: [cur, target], i: 1 });
          try { sessionStorage.setItem(VH_INTENT_KEY, target); } catch { /* ignore */ }
          push(targetHref);
        }
      }, JUMP_FALLBACK_MS);
      return true;
    }

    // (খ) নতুন ভেরিয়েন্ট — সাধারণ push।
    // মাঝখান (st.i < শেষ) থেকে নতুন পেজে গেলে ব্রাউজার নিজেই সামনের (forward) এন্ট্রিগুলো কেটে ফেলে — সব ব্রাউজারের
    // স্বাভাবিক আচরণ। তাই আমাদের স্ট্যাকও সেখানেই ছাঁটি: [হোম, A, B, C] তে B থেকে D-তে গেলে স্ট্যাক = [A, B, D]।
    // (আগে শেষ এন্ট্রি C-তে লাফ দিয়ে তারপর D push করা হতো — হিস্ট্রি [.., B, C, D] হয়ে D থেকে ব্যাকে B-র বদলে C আসত।)
    const keep = st.s.slice(0, st.i + 1);
    writeVH({ c: groupId, s: [...keep, target], i: keep.length });
    try { sessionStorage.setItem(VH_INTENT_KEY, target); } catch { /* ignore */ }
    return false; // সাধারণ Link push
  } catch {
    return false;
  }
}

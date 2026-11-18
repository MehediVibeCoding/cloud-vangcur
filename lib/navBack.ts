// "ফিরে যান" বাটনের জন্য: window.history.length > 1 দিয়ে বোঝা যায় না আগের পেজটা এই সাইটেরই কিনা
// (নতুন ট্যাবে বা অন্য সাইট থেকে এসে ঢুকলেও length > 1 হতে পারে, তখন router.back() সাইটের বাইরে নিয়ে যেত)।
// তাই সাইটের ভেতরের নেভিগেশন গোনা হয় (sessionStorage) — GlobalOverlays প্রতি পাথ-বদলে trackInAppNav() ডাকে।

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

/** GlobalOverlays: প্রতি পাথ-বদলে ডাকে — ভেরিয়েন্ট-হিস্ট্রির পয়েন্টার ঠিক রাখে */
export function variantHistoryOnNav(pathname: string, isPop: boolean): void {
  const st = readVH();
  if (!st) return;
  const here = normPath(pathname);
  if (isPop) {
    const idx = st.s.findIndex((p) => normPath(p) === here);
    if (idx >= 0 && idx !== st.i) writeVH({ ...st, i: idx });
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
      window.history.go(delta);
      window.setTimeout(() => {
        if (normPath(window.location.pathname) === cur) {
          // লাফ কাজ করেনি (সম্ভবত হিস্ট্রি বদলে গেছে) — সাধারণ push, হিস্ট্রি রিসেট
          pendingJump = null;
          writeVH({ c: groupId, s: [cur, target], i: 1 });
          try { sessionStorage.setItem(VH_INTENT_KEY, target); } catch { /* ignore */ }
          push(targetHref);
        }
      }, 700);
      return true;
    }

    // (খ) নতুন ভেরিয়েন্ট
    const tail = st.s.length - 1;
    if (st.i === tail) {
      writeVH({ ...st, s: [...st.s, target], i: tail + 1 });
      try { sessionStorage.setItem(VH_INTENT_KEY, target); } catch { /* ignore */ }
      return false; // সাধারণ Link push
    }
    // মাঝখানে থেকে নতুন ভেরিয়েন্টে গেলে push করলে সামনের এন্ট্রিগুলো কেটে যেত —
    // তাই আগে শেষ এন্ট্রিতে লাফ, তারপর push।
    const delta = tail - st.i;
    writeVH({ c: groupId, s: [...st.s, target], i: tail + 1 });
    pendingJump = delta;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.removeEventListener('popstate', onPop);
      try { sessionStorage.setItem(VH_INTENT_KEY, target); } catch { /* ignore */ }
      push(targetHref);
    };
    const onPop = () => window.setTimeout(go, 60);
    window.addEventListener('popstate', onPop);
    window.setTimeout(go, 700);
    window.history.go(delta);
    return true;
  } catch {
    return false;
  }
}

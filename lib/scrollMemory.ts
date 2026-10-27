// ফাইলের পাথ: lib/scrollMemory.ts
// [NEW ব্যাচ ১৪] ফুটারের পলিসি লিংকে ঢোকার আগে বর্তমান পেজের স্ক্রল-পজিশন মনে রাখা, আর "ফিরে যান"-এ
// সেই পজিশনে ফেরানো।
//
// কেন দরকার: পেজ-ট্রানজিশনে (PageTransition, mode="wait") ব্যাক করার মুহূর্তে ব্রাউজার নিজের
// স্ক্রল-রিস্টোর চালায় যখন পর্দায় এখনো ছোট পলিসি পেজটাই থাকে — তাই পজিশন উপরে কেটে যায়। এখানে আমরা
// নিজে পজিশন সেভ করি, আর গন্তব্য পেজ আঁকা হয়ে লম্বা হলে তারপর সেখানে স্ক্রল করি।
//
// [v2] শুধু px সংখ্যা সেভ করলে ভুল জায়গায় নামত: হোমের নিচের সেকশনগুলো content-visibility:auto দিয়ে আঁকা, আর
// ব্যাক করে ফিরলে ব্রাউজার সেগুলোর আসল উচ্চতা ভুলে অনুমানে (contain-intrinsic-size) ফিরে যায় — ফলে পেজের মোট উচ্চতা
// ক্লিকের সময়ের আসল উচ্চতার সাথে মেলে না, সেভ করা px অন্য জায়গায় পড়ে। তাই এখন তিন স্তরে সেভ/ফেরানো হয়:
//   ১) ফুটারের লিংকে ক্লিক হলে — সেই লিংকটাই "নোঙর": ফিরে এসে ওই লিংক খুঁজে পর্দার একই উচ্চতায় বসানো হয়
//   ২) পেজের একদম নিচের দিকে (শেষ ৪০০px) থাকলে — নিচ থেকে একই দূরত্বে বসানো হয় (নিচের অংশের মাপ নির্ভরযোগ্য)
//   ৩) নইলে আগের মতো px
// আর জায়গায় বসার পর লেআউট স্থির না হওয়া পর্যন্ত (সর্বোচ্চ ৩ সেকেন্ড) প্রতি ফ্রেমে ঠিক রাখা হয় — আগে মাত্র ০.৪৫ সেকেন্ড
// একই px-এ ধরে রাখা হতো, তাই পরে উচ্চতা বদলালে সংশোধন হতো না।

const MAP_KEY = 'vc_sr_map_v2';
const FLAG_KEY = 'vc_sr_back_v1';
const MAX_ENTRIES = 12;
const FLAG_TTL_MS = 8000;
const MAX_WAIT_MS = 3000;
const STABLE_MS = 600;
// জায়গায় প্রথম বসার পর অন্তত এতক্ষণ নজর রাখি — সেকশন/ছবি দেরিতে আসল মাপে এলে তখনও সংশোধন হয়
const MIN_ACTIVE_MS = 1500;
const NEAR_BOTTOM_PX = 400;

// যেসব পথে ঢুকলে ফেরার সময় পজিশন ফেরাতে হবে (ফুটারের "গ্রাহক সেবা" লিংক)
export const POLICY_PATH_PREFIXES = ['/guide', '/shipping', '/warranty', '/refund-policy', '/privacy-policy', '/terms'];

export function isPolicyPath(path: string): boolean {
  return POLICY_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));
}

/** সেভ করা অবস্থান */
interface SavedPos {
  /** স্ক্রল-px */
  y: number;
  /** পেজের নিচ থেকে দূরত্ব (px) */
  b: number;
  /** সেভের সময় পেজের মোট উচ্চতা */
  h: number;
  /** নোঙর: ফুটারের যে লিংকে ক্লিক হয়েছিল + ক্লিকের সময় পর্দার উপর থেকে তার দূরত্ব */
  a?: { sel: string; top: number };
}

export function currentLocationKey(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function readMap(): Record<string, SavedPos> {
  try {
    const raw = sessionStorage.getItem(MAP_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, SavedPos>) {
  try {
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete map[k];
    sessionStorage.setItem(MAP_KEY, JSON.stringify(map));
  } catch {
    // sessionStorage বন্ধ থাকলে চুপচাপ বাদ
  }
}

export function saveScrollPosition(link?: Element | null): void {
  const y = Math.round(window.scrollY);
  const h = document.documentElement.scrollHeight;
  const max = Math.max(0, h - window.innerHeight);
  const pos: SavedPos = { y, b: Math.max(0, max - y), h };
  // ফুটারের লিংক হলে সেটাকেই নোঙর বানাই (একই href-এর লিংক ফুটারে একটাই)
  const href = link?.getAttribute('href');
  if (link && href && !href.includes('"') && link.closest('footer')) {
    pos.a = { sel: `footer a[href="${href}"]`, top: Math.round(link.getBoundingClientRect().top) };
  }
  const key = currentLocationKey();
  const map = readMap();
  delete map[key]; // সবচেয়ে নতুনটা শেষে থাকুক
  map[key] = pos;
  writeMap(map);
}

// "ফিরে যান" চাপার সময় — গন্তব্য পেজে পজিশন ফেরানোর অনুরোধ রেখে যায়
export function markScrollRestore(): void {
  try {
    sessionStorage.setItem(FLAG_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function clearFlag() {
  try {
    sessionStorage.removeItem(FLAG_KEY);
  } catch {
    // ignore
  }
}

let cancelActive: (() => void) | null = null;

// গন্তব্য পেজে (pathname বদলানোর পর) ডাকা হয়। অনুরোধ না থাকলে কিছুই করে না।
export function restoreScrollIfRequested(): void {
  let flag: string | null = null;
  try {
    flag = sessionStorage.getItem(FLAG_KEY);
  } catch {
    return;
  }
  if (!flag) return;
  clearFlag();
  if (Date.now() - Number(flag) > FLAG_TTL_MS) return;

  const key = currentLocationKey();
  const map = readMap();
  const saved = map[key];
  if (!saved || typeof saved.y !== 'number' || saved.y <= 0) return;
  delete map[key];
  writeMap(map);

  if (cancelActive) cancelActive();
  let stopped = false;
  const start = performance.now();
  let lastH = -1;
  let stableSince = 0;
  let placedAt = 0;

  const stop = () => {
    stopped = true;
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('keydown', stop);
    window.removeEventListener('mousedown', stop);
    cancelActive = null;
  };
  cancelActive = stop;
  // ইউজার নিজে স্ক্রল/টাচ করলে আমরা আর জোর করি না
  window.addEventListener('wheel', stop, { passive: true });
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('keydown', stop);
  window.addEventListener('mousedown', stop);

  const jump = (top: number) => window.scrollTo({ top, left: 0, behavior: 'instant' as ScrollBehavior });

  // এই মুহূর্তে কোথায় বসা উচিত — এখনো বলার মতো অবস্থা না হলে (পেজ ছোট/নোঙর আঁকা হয়নি) null
  const desiredTop = (H: number, maxScroll: number): number | null => {
    if (saved.a) {
      const el = document.querySelector(saved.a.sel);
      if (el) return Math.round(window.scrollY + el.getBoundingClientRect().top - saved.a.top);
    }
    if (saved.b < NEAR_BOTTOM_PX) {
      // নিচের দিকে ছিল: পেজ অন্তত অর্ধেক লম্বা না হলে (স্কেলেটন/অর্ধেক আঁকা) অপেক্ষা
      return H >= (saved.h || 0) * 0.5 ? maxScroll - saved.b : null;
    }
    return maxScroll >= saved.y - 2 ? saved.y : null;
  };

  const tick = () => {
    if (stopped) return;
    const now = performance.now();
    const H = document.documentElement.scrollHeight;
    const maxScroll = Math.max(0, H - window.innerHeight);
    const want = desiredTop(H, maxScroll);

    if (want !== null) {
      if (!placedAt) placedAt = now;
      const target = Math.max(0, Math.min(want, maxScroll));
      if (Math.abs(window.scrollY - target) > 1) {
        jump(target);
        stableSince = 0;
      } else if (H === lastH) {
        // জায়গায় আছে আর উচ্চতাও বদলাচ্ছে না — কিছুক্ষণ এমন থাকলে স্থির ধরে ছেড়ে দিই
        if (!stableSince) stableSince = now;
        if (now - stableSince >= STABLE_MS && now - placedAt >= MIN_ACTIVE_MS) {
          stop();
          return;
        }
      } else {
        stableSince = 0;
      }
    }
    lastH = H;

    if (now - start > MAX_WAIT_MS) {
      // সময় শেষ: যা পারি তাই — জানা অবস্থান থাকলে সেখানে, নইলে সেভ করা px (পেজের সীমার ভেতরে)
      jump(Math.max(0, Math.min(want ?? saved.y, maxScroll)));
      stop();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

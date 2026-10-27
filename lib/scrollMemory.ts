// ফাইলের পাথ: lib/scrollMemory.ts
// [NEW ব্যাচ ১৪] ফুটারের পলিসি লিংকে ঢোকার আগে বর্তমান পেজের স্ক্রল-পজিশন মনে রাখা, আর "ফিরে যান"-এ
// সেই পজিশনে ফেরানো।
//
// কেন দরকার: পেজ-ট্রানজিশনে (PageTransition, mode="wait") ব্যাক করার মুহূর্তে ব্রাউজার নিজের
// স্ক্রল-রিস্টোর চালায় যখন পর্দায় এখনো ছোট পলিসি পেজটাই থাকে — তাই পজিশন উপরে কেটে যায়। এখানে আমরা
// নিজে পজিশন সেভ করি, আর গন্তব্য পেজ আঁকা হয়ে লম্বা হলে তারপর সেখানে স্ক্রল করি।

const MAP_KEY = 'vc_sr_map_v1';
const FLAG_KEY = 'vc_sr_back_v1';
const MAX_ENTRIES = 12;
const FLAG_TTL_MS = 8000;
const MAX_WAIT_MS = 2800;

// যেসব পথে ঢুকলে ফেরার সময় পজিশন ফেরাতে হবে (ফুটারের "গ্রাহক সেবা" লিংক)
export const POLICY_PATH_PREFIXES = ['/guide', '/shipping', '/warranty', '/refund-policy', '/privacy-policy', '/terms'];

export function isPolicyPath(path: string): boolean {
  return POLICY_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));
}

export function currentLocationKey(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function readMap(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(MAP_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, number>) {
  try {
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete map[k];
    sessionStorage.setItem(MAP_KEY, JSON.stringify(map));
  } catch {
    // sessionStorage বন্ধ থাকলে চুপচাপ বাদ
  }
}

export function saveScrollPosition(): void {
  const y = Math.round(window.scrollY);
  const key = currentLocationKey();
  const map = readMap();
  delete map[key]; // সবচেয়ে নতুনটা শেষে থাকুক
  map[key] = y;
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
  const y = map[key];
  if (typeof y !== 'number' || y <= 0) return;
  delete map[key];
  writeMap(map);

  if (cancelActive) cancelActive();
  let stopped = false;
  const start = performance.now();
  let reachedAt = 0;

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

  const tick = () => {
    if (stopped) return;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const elapsed = performance.now() - start;
    if (maxScroll >= y - 2) {
      // যথেষ্ট লম্বা হয়েছে — বসাই, তারপর আরও একটু সময় ধরে ধরে রাখি (ছবি/সেকশন লোডে উচ্চতা বদলালে)
      jump(y);
      if (!reachedAt) reachedAt = performance.now();
      if (performance.now() - reachedAt > 450) { stop(); return; }
    } else if (elapsed > MAX_WAIT_MS) {
      jump(Math.min(y, maxScroll));
      stop();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

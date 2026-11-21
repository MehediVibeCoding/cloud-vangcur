// 🧪 ব্যাক-হিস্ট্রি লজিকের সিমুলেটেড টেস্ট (ব্রাউজার ছাড়াই): npx tsx scripts/test-nav-history.ts
// নকল window/history/sessionStorage বানিয়ে lib/navBack.ts-এর আসল কোড চালায়, GlobalOverlays-এর মতো প্রতি পাথ-বদলে
// variantHistoryOnNav + trackInAppNav ডাকে। আসল ফোনে (iOS Safari, ব্যাক-জেসচার) একবার হাতে টেস্ট এখনো দরকার।
import {
  DETAIL_GROUP, handleVariantClick, isDetailPath, trackInAppNav, variantHistoryOnNav,
} from '../lib/navBack';

const store = new Map<string, string>();
const listeners: Record<string, Array<() => void>> = {};
const entries: string[] = ['/'];
let idx = 0;

function popNav() {
  (listeners['popstate'] || []).slice().forEach((f) => f());
  variantHistoryOnNav(entries[idx], true);
  trackInAppNav(true);
}
function pushNav(href: string) {
  const path = href.split(/[?#]/)[0];
  entries.splice(idx + 1);
  entries.push(path);
  idx = entries.length - 1;
  variantHistoryOnNav(path, false);
  trackInAppNav(false);
}

(globalThis as unknown as Record<string, unknown>).window = {
  location: { get pathname() { return entries[idx]; } },
  history: {
    go(d: number) {
      setTimeout(() => {
        const n = idx + d;
        if (n < 0 || n >= entries.length) return;
        idx = n;
        popNav();
      }, 5);
    },
  },
  addEventListener(t: string, f: () => void) { (listeners[t] ||= []).push(f); },
  removeEventListener(t: string, f: () => void) { listeners[t] = (listeners[t] || []).filter((x) => x !== f); },
  setTimeout: (f: () => void, ms: number) => setTimeout(f, ms),
};
(globalThis as unknown as Record<string, unknown>).sessionStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};

const wait = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const ev = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 };

/** কেন্দ্রীয় লিসেনারের মতো: দুটোই ডিটেইল পেজ হলে handleVariantClick, নইলে সাধারণ লিংক */
async function click(target: string) {
  const cur = entries[idx];
  if (isDetailPath(cur) && isDetailPath(target)) {
    if (handleVariantClick(ev, DETAIL_GROUP, target, pushNav)) { await wait(160); return; } // মাঝ-স্ট্যাকে: লাফ + ৬০ms পরে push
  }
  pushNav(target);
  await wait();
}
async function back() { window.history.go(-1); await wait(); }
function reset() { entries.splice(0, entries.length, '/'); idx = 0; store.clear(); }

let failed = 0;
function expect(name: string, cond: boolean, info: string) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  → ' + info}`);
  if (!cond) failed++;
}
const A = '/product/a-1', B = '/product/b-2', C = '/neon-light-guide';

(async () => {
  // ১) A↔B বারবার ঘুরলে হিস্ট্রিতে শুধু দুটো এন্ট্রি; ব্যাকে একবার A, তারপর হোম
  reset(); await click(A);
  for (let n = 0; n < 7; n++) await click(n % 2 === 0 ? B : A); // B,A,B,A,B,A,B — শেষে B-তে
  expect('১ক) ৭ বার ঘুরে হিস্ট্রি = [হোম, A, B]', entries.length === 3 && entries[idx] === B, JSON.stringify(entries) + ' @' + entries[idx]);
  await back();
  expect('১খ) B থেকে ব্যাকে একবার A', entries[idx] === A, entries[idx]);
  await back();
  expect('১গ) আবার ব্যাকে হোম', entries[idx] === '/', entries[idx]);

  // ২) তিন পেজ (প্রোডাক্ট↔গাইড মিলিয়ে) ঘুরে ঘুরে
  reset(); await click(A); await click(B); await click(C); await click(A); await click(C); await click(B);
  expect('২ক) A,B,গাইড ঘুরে হিস্ট্রি = [হোম, A, B, C] (৪টা)', entries.length === 4, JSON.stringify(entries));

  // ৩) মাঝখান থেকে নতুন পেজে গেলে এন্ট্রি হারায় না
  reset(); await click(A); await click(B); await back();
  await click(C);
  expect('৩ক) মাঝ থেকে নতুন পেজে — হিস্ট্রি [হোম, A, B, C]', entries.join(',') === ['/', A, B, C].join(','), JSON.stringify(entries));
  expect('৩খ) এখন C-তে', entries[idx] === C, entries[idx]);

  // ৪) ক্লাস্টারের বাইরে (সার্চ/হোম) গিয়ে ফিরলে স্ট্যাক রিসেট, কিছু ভাঙে না
  reset(); await click(A); await click(B); await click('/search');
  await click(A); await click(B);
  expect('৪ক) বাইরে ঘুরে এসে A→B: স্বাভাবিক push', entries[idx] === B, entries[idx]);
  await click(A);
  expect('৪খ) এরপর A-তে ফেরা: লাফ, নতুন এন্ট্রি নয়', entries.filter((p) => p === A).length === 2 && entries[idx] === A, JSON.stringify(entries));

  // ৫) isDetailPath
  expect('৫ক) প্রোডাক্ট ও গাইড ডিটেইল', isDetailPath('/product/x-1') && isDetailPath('/neon-guide') && isDetailPath('/a/b'), '');
  expect('৫খ) হোম/সার্চ/ক্যাটাগরি/পলিসি/ফাইল ডিটেইল নয়',
    !isDetailPath('/') && !isDetailPath('/search') && !isDetailPath('/category/x') && !isDetailPath('/guide') && !isDetailPath('/terms') && !isDetailPath('/sitemap.xml'), '');

  console.log(failed ? `\n${failed} টা ব্যর্থ` : '\nসব পাস');
  process.exit(failed ? 1 : 0);
})();

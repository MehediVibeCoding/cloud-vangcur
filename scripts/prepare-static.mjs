// স্ট্যাটিক Worker (`vangcur-static`, wrangler.static.jsonc)-এর ফাইল সাজানো।
// চলে `opennextjs-cloudflare build`-এর পর: `.open-next/assets` থেকে শুধু ব্রাউজারে-নামা ফাইলগুলো কপি করে
// `.open-next/static-site`-এ রাখে আর CORS + ক্যাশ হেডার (_headers) লেখে।
//
// ⚠️ কোনো ফাইল না পেলে এই স্ক্রিপ্ট ব্যর্থ হয় (exit 1) — তাতে ডিপ্লয় থেমে যায়, মূল সাইট আগের অবস্থায় থাকে।
//    এটা ইচ্ছাকৃত: ফাইল ছাড়া নতুন HTML গেলে পেজ সাদা দেখাত।
// ⚠️ এখানকার তালিকা আর lib/staticUrl.ts-এর ব্যবহার মিলিয়ে রাখতে হবে। নতুন ফাইল static.vangcur.com থেকে
//    দিতে চাইলে এখানে যোগ করুন। যা সার্ভার নিজের হোস্ট থেকে আনে (resvg.wasm, fonts/invoice/*) বা মূল
//    ডোমেইনে লাগে (robots.txt, sitemap, manifest, og-image, icon, .well-known) — সেগুলো এখানে দেবেন না।

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = '.open-next/assets';
const OUT = '.open-next/static-site';

const COPY_DIRS = ['_next/static', 'brands'];
const COPY_FILES = [
  'footer-illustration-desktop.webp',
  'footer-illustration-mobile.webp',
  'vangcur-team-avatar.png',
  // বাংলা-ডিজিট ফন্ট: globals.css-এর url('/fonts/...') CSS ফাইলের নিজের হোস্টে (static.vangcur.com) খোঁজে,
  // তাই ফাইলটা এখানেও থাকতে হবে — না থাকলে প্রতিটা পেজলোডে ৪০৪ (২৪ ঘন্টায় ~১৫টা) আর ফন্ট নামে না।
  'fonts/noto-sans-bengali-digits-v1.woff2',
];

function fail(msg) {
  console.error(`❌ prepare-static: ${msg}`);
  process.exit(1);
}

function countFiles(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? countFiles(join(dir, e.name)) : 1;
  }
  return n;
}

if (!existsSync(SRC)) fail(`${SRC} নেই — আগে \`opennextjs-cloudflare build\` চালাতে হবে।`);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const d of COPY_DIRS) {
  const from = join(SRC, d);
  if (!existsSync(from) || !statSync(from).isDirectory()) fail(`ফোল্ডার পাওয়া যায়নি: ${from}`);
  if (countFiles(from) === 0) fail(`ফোল্ডার খালি: ${from}`);
  cpSync(from, join(OUT, d), { recursive: true });
}
for (const f of COPY_FILES) {
  const from = join(SRC, f);
  if (!existsSync(from)) fail(`ফাইল পাওয়া যায়নি: ${from}`);
  mkdirSync(join(OUT, f, '..'), { recursive: true });
  cpSync(from, join(OUT, f));
}

// 🔖 build-id.json: StaleTabReload (bfcache-এ ফেরা ট্যাব পুরনো ডেপ্লয়ের কিনা) এটা পড়ে। আগে /api/build-id (মূল Worker-এর Next রুট,
// প্রতিবার Worker জাগত); এখন এই স্ট্যাটিক হোস্ট থেকে — Worker-কোড নেই, রিকোয়েস্ট ফ্রি। আইডি next.config.js-এর NEXT_PUBLIC_BUILD_ID-র
// একই উৎস থেকে (একই বিল্ডে একই মান)। খালি হলে {"id":""} — ক্লায়েন্ট তখন কিছুই করে না (আগের /api/build-id-র মতোই)।
// ⚠️ হোস্ট ফাইলটা মূল সাইটের আগে ডেপ্লয় হয় (static:deploy আগে চলে), তাই ডেপ্লয়ের কয়েক সেকেন্ড-মিনিটের ফাঁকে একটা ট্যাব আগেভাগে
//    রিলোড হতে পারে — রিলোডে পুরনো মূল সাইটই আসে, ক্ষতি নেই; একবারের বেশি লুপ হয় না (শুধু bfcache-restore-এ চেক)।
const buildId =
  process.env.WORKERS_CI_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || '';
writeFileSync(join(OUT, 'build-id.json'), JSON.stringify({ id: buildId }));

// CORS: ফন্ট (woff2) আলাদা হোস্ট থেকে নামলে ব্রাউজার CORS হেডার চায়। ফাইলগুলো সবই পাবলিক।
// ক্যাশ: `_next/static`-এর নামে হ্যাশ আছে → ১ বছর immutable (public/_headers-এর নিয়মই)।
// লোগো/ব্র্যান্ড/ফুটার ছবির নামে ভার্সন নেই → ৭ দিন (আগের মতোই; বদলাতে হলে নতুন নামে আপলোড করুন)।
const headers = `/*
  Access-Control-Allow-Origin: *
  Cross-Origin-Resource-Policy: cross-origin
  X-Content-Type-Options: nosniff
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
/brands/*
  Cache-Control: public, max-age=604800
/footer-illustration-*
  Cache-Control: public, max-age=604800
/vangcur-team-avatar.png
  Cache-Control: public, max-age=604800
/fonts/noto-sans-bengali-digits-v1.woff2
  Cache-Control: public, max-age=31536000, immutable
/build-id.json
  Cache-Control: no-store
`;
writeFileSync(join(OUT, '_headers'), headers);

console.log(`✅ prepare-static: ${countFiles(OUT)} ফাইল ${OUT}-এ প্রস্তুত`);

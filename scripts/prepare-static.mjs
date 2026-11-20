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
`;
writeFileSync(join(OUT, '_headers'), headers);

console.log(`✅ prepare-static: ${countFiles(OUT)} ফাইল ${OUT}-এ প্রস্তুত`);

// 🩹 satori@0.48.1 (standalone) Cloudflare Workers-এ সরাসরি চলে না:
//   ১) টেক্সট-শেপিংয়ের harfbuzz wasm ভেতরে base64 হিসেবে ঢোকানো এবং রানটাইমে `WebAssembly.instantiate(bytes)` দিয়ে
//      কম্পাইল হয় — Workers এটা নিষিদ্ধ করে ("Wasm code generation disallowed by embedder")।
//   ২) emscripten কোড `self.location.href` পড়ে, Workers-এ `self.location` নেই।
// এই স্ক্রিপ্ট (বিল্ডের আগে চালাতে হয়): wasm বের করে generated/hb.wasm-এ রাখে (wrangler এটাকে আগে-কম্পাইল-করা মডিউল হিসেবে
// ইম্পোর্ট করে), আর standalone.js প্যাচ করে যাতে সেই মডিউল ব্যবহার করে। satori-র ভার্সন package.json-এ পিন করা;
// ভার্সন বদলালে প্যাটার্ন না মিললে স্ক্রিপ্ট ইচ্ছাকৃতভাবে ব্যর্থ হয় (চুপচাপ ভাঙা ইনভয়েসের চেয়ে বিল্ড ফেল ভালো)।
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const pkgPath = require.resolve('satori/package.json');
const file = join(dirname(pkgPath), 'dist', 'standalone.js');
const MARK = '/*vangcur-hb-patched*/';

let src = readFileSync(file, 'utf8');

// generated/hb.wasm সবসময় (নতুন করে) তৈরি — প্যাচ আগে হয়ে থাকলেও
const original = src.includes(MARK) ? null : src;
const b64src = original ?? src;
const m = b64src.match(/AGFzbQ[A-Za-z0-9+/=]{10000,}/);
if (!m) {
  if (src.includes(MARK)) {
    if (!readFileSync(new URL('../generated/hb.wasm', import.meta.url), { flag: 'r' }).length) throw new Error('generated/hb.wasm খালি');
    console.log('[patch-satori] আগেই প্যাচ করা আছে');
    process.exit(0);
  }
  throw new Error('[patch-satori] harfbuzz wasm base64 খুঁজে পাওয়া যায়নি — satori ভার্সন বদলেছে?');
}

if (original) {
  const instPattern = 'var yA=await O(d),VA=await WebAssembly.instantiate(yA,BA);return VA';
  const locPattern = 'C&&(A=self.location.href)';
  if (!src.includes(instPattern)) throw new Error('[patch-satori] instantiate প্যাটার্ন মেলেনি');
  if (!src.includes(locPattern)) throw new Error('[patch-satori] location প্যাটার্ন মেলেনি');
  src = src
    .replace(
      instPattern,
      'var yA=globalThis.__HB_WASM_MODULE__?null:await O(d),VA=globalThis.__HB_WASM_MODULE__?{instance:await WebAssembly.instantiate(globalThis.__HB_WASM_MODULE__,BA),module:globalThis.__HB_WASM_MODULE__}:await WebAssembly.instantiate(yA,BA);return VA',
    )
    .replace(locPattern, 'C&&(A=(self.location&&self.location.href)||"")');
  writeFileSync(file, MARK + src);
}

const outDir = new URL('../generated/', import.meta.url);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL('hb.wasm', outDir), Buffer.from(m[0], 'base64'));
console.log(`[patch-satori] ✅ প্যাচ সম্পন্ন, hb.wasm = ${Buffer.from(m[0], 'base64').length} bytes`);

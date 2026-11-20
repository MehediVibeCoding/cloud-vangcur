// স্ট্যাটিক Worker (`vangcur-static`) ডিপ্লয় — Workers Builds-এ মূল Worker ডিপ্লয়ের আগে চলে (package.json: static:deploy)।
//
// ⚠️ কেন সরাসরি `wrangler deploy -c wrangler.static.jsonc` নয়: Workers Builds বিল্ডের ভেতরের প্রতিটা `wrangler deploy`-এর
//    Worker-নাম জোর করে মূল Worker-এর নামে (cloud-vangcur) বদলে দেয় (WRANGLER_CI_OVERRIDE_NAME), আর অন্য Worker-এর
//    ট্যাগ মেলায় (WRANGLER_CI_MATCH_TAG)। সরাসরি চালালে স্ট্যাটিক কনফিগ মূল সাইটের ওপরেই বসে যেত! তাই এই দুটো
//    ভেরিয়েবল বাদ দিয়ে, `--name` সরাসরি দিয়ে চালানো হয়। মূল Worker-এর ডিপ্লয় (opennextjs-cloudflare deploy) এতে অপরিবর্তিত।
// ⚠️ ডিপ্লয়ের পর যাচাই: static.vangcur.com থেকে একটা আসল ফাইল নামে কিনা দেখা হয়। না নামলে এই স্ক্রিপ্ট ব্যর্থ হয় →
//    মূল সাইটের ডিপ্লয় হয় না, তাই নতুন HTML কখনো ফাঁকা স্ট্যাটিক হোস্টের দিকে তাকিয়ে থাকে না।
// STATIC_DEPLOY_DRY_RUN=1 দিলে শুধু শুকনো-চালানো (কিছু আপলোড হয় না)।

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const NAME = 'vangcur-static';
const SITE = '.open-next/static-site';
const ORIGIN = 'https://static.vangcur.com';
const dry = process.env.STATIC_DEPLOY_DRY_RUN === '1';

function fail(msg) {
  console.error(`❌ deploy-static: ${msg}`);
  process.exit(1);
}

if (!existsSync(SITE)) fail(`${SITE} নেই — আগে build ও static:prepare চালাতে হবে।`);

const env = { ...process.env };
delete env.WRANGLER_CI_OVERRIDE_NAME;
delete env.WRANGLER_CI_MATCH_TAG;

const args = ['wrangler', 'deploy', '-c', 'wrangler.static.jsonc', '--name', NAME];
if (dry) args.push('--dry-run');
const r = spawnSync('npx', args, { stdio: 'inherit', env });
if (r.status !== 0) fail(`wrangler deploy ব্যর্থ (exit ${r.status})`);
if (dry) {
  console.log('✅ deploy-static: dry-run শেষ');
  process.exit(0);
}

// যাচাইয়ের ফাইল: বিল্ডের একটা আসল JS চাঙ্ক (নাম হ্যাশসহ, তাই পুরনো ডিপ্লয়ের ফাইল ভুল করে মিলবে না)
const chunksDir = join(SITE, '_next/static/chunks');
const sample = existsSync(chunksDir) ? readdirSync(chunksDir).find((f) => f.endsWith('.js')) : undefined;
if (!sample) fail('যাচাইয়ের জন্য কোনো JS চাঙ্ক পাওয়া যায়নি');
const url = `${ORIGIN}/_next/static/chunks/${sample}`;

let lastErr = 'unknown';
for (let i = 1; i <= 8; i++) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const acao = res.headers.get('access-control-allow-origin');
    if (res.ok && acao === '*') {
      console.log(`✅ deploy-static: ${url} → ${res.status}, CORS ঠিক আছে`);
      process.exit(0);
    }
    lastErr = `status ${res.status}, access-control-allow-origin=${acao}`;
  } catch (e) {
    lastErr = String(e);
  }
  console.log(`… যাচাই চেষ্টা ${i}/8 ব্যর্থ (${lastErr}); ৫ সেকেন্ড পর আবার`);
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
fail(`${url} নামানো গেল না (${lastErr}) — মূল সাইটের ডিপ্লয় থামানো হলো`);

# 🧾 Vangcur — ইনভয়েস সিস্টেম (Invoice System)
**সর্বশেষ আপডেট:** ২১ নভেম্বর ২০২৬
**সংক্ষেপে:** ইনভয়েস PNG এখন **Vercel-এ** বানানো হয়। Cloudflare Worker-ভিত্তিক বিকল্প কোড `workers/invoice/`-এ **নিষ্ক্রিয় অবস্থায় রাখা আছে** — ভবিষ্যতে Vercel থেকে Cloudflare-এ ফিরলে (বা Workers Paid প্ল্যানে গেলে) আবার চালু করা যাবে।

---

## ১. এখন কীভাবে কাজ করে (সক্রিয় পথ: Vercel)

```
ব্রাউজার
  │  GET /api/invoice/png?id=…&phone=…
  ▼
Cloudflare Worker (cloud-vangcur) — app/api/invoice/png/route.ts
  │  ১. রেট-লিমিট (IP প্রতি মিনিটে ৮টি)
  │  ২. অর্ডার যাচাই (id + phone) ও ডাউনলোড-সীমা claim (ব্যর্থ হলে release)
  │  ৩. POST { order, contact } + header `x-invoice-secret`
  ▼
Vercel (প্রজেক্ট `vangcurweb`) — /api/invoice/render   [রিপো: MehediVibeCoding/Vangcur]
  │  headless Chromium (Puppeteer + @sparticuz/chromium) → HTML টেমপ্লেট → ৩x স্ক্রিনশট
  ▼
PNG → Worker → ব্রাউজার (ডাউনলোড)
```

| বিষয় | বিবরণ |
| :--- | :--- |
| মূল সাইটের রুট | `app/api/invoice/png/route.ts` (যাচাই, লিমিট, Vercel-কে ডাকা) |
| Vercel-এর রুট | `app/api/invoice/render/route.ts` — **Vangcur রিপোতে** (POST, গোপন চাবি ছাড়া ৪০১/৫০৩) |
| টেমপ্লেট (PNG-এর ডিজাইন) | Vangcur রিপোর `lib/invoice/InvoiceCardBody.tsx` + `renderInvoiceHtml.tsx` |
| Cloudflare Secret | `INVOICE_RENDER_URL` (Vercel ঠিকানা, শেষে `/` ছাড়া), `INVOICE_RENDER_SECRET` |
| Vercel Env | `INVOICE_RENDER_SECRET` (Cloudflare-এরটার সাথে **হুবহু এক**) + Supabase ভ্যারিয়েবলগুলো |
| Vercel মিডলওয়্যার | `/api/invoice/render` "গোপন-চাবি-সুরক্ষিত" তালিকায় (IP রেট-লিমিট থেকে বাদ) |

### কেন Vercel? (মাপা সংখ্যা)
Cloudflare **Free plan**-এ CPU সীমা ১০ms। ইনভয়েসের satori + resvg-wasm রেন্ডার আসলে ~২ সেকেন্ড CPU খায়:

- ১ম রিকোয়েস্ট (ঠান্ডা শুরু): **২০১০ms → `exceededCpu`, ব্যর্থ**
- ২য় রিকোয়েস্ট: ১৭৫১ms → সফল (Cloudflare মাঝে মাঝে সীমা ছাড়ালে ছাড় দেয়, ধারাবাহিক হলে বন্ধ করে — ভরসাযোগ্য নয়)
- লোকাল পরীক্ষা: সময়ের সিংহভাগ resvg-র রাস্টারাইজে। ৩x→২x জুম করলে রাস্টারাইজ প্রায় অর্ধেক হয়, `overflow:hidden` সরালে ~২৫% কমে — তবু ১০ms-এর বহু উপরে।

Vercel-এ অপেক্ষার সময় Worker-এর CPU গোনা হয় না (শুধু `fetch` অপেক্ষা), তাই মূল সাইট ১০ms-এর মধ্যেই থাকে।

### ইনভয়েসে প্রোডাক্টের ছবি কোথা থেকে আসে?
ছবি Vercel-এর নিজের নয়। অর্ডারে সংরক্ষিত প্রথম ছবির URL (`items[].imgs[0]`, সাধারণত R2: `https://img.vangcur.com/…`) Chromium **সরাসরি ইন্টারনেট থেকে নামায়**:
- Vercel-এ `NEXT_PUBLIC_SITE_URL` ও `NEXT_PUBLIC_R2_IMAGE_BASE` **দুটোই** সেট থাকলে URL হয় `https://vangcur.com/cdn-cgi/image/width=120,…/https://img.vangcur.com/…` (Cloudflare Images ছোট করে দেয়; Worker চালু হয় না)।
- কোনোটা না থাকলে মূল URL-ই (`img.vangcur.com`, R2 পাবলিক) সরাসরি নামে।
- লোগো আসে Vercel-এর নিজের `public/vangcur-logo.png` থেকে, সোশ্যাল আইকন কোডে বাঁধা (data URI)।
- ছবি লোড ব্যর্থ হলে (সর্বোচ্চ ৮ সেকেন্ড অপেক্ষার পর) কার্ডে 📦 placeholder দেখায়, ইনভয়েস আটকায় না।

### ⚠️ টেমপ্লেট এখন একাধিক জায়গায় — ডিজাইন বদলালে সব মেলাতে হবে
| কোথায় | কী কাজে | কখন বদলাতে হবে |
| :--- | :--- | :--- |
| এই রিপোর `lib/invoice/InvoiceCardBody.tsx` | সাইটের **অন-স্ক্রিন প্রিভিউ** (`/checkout/invoice`) | সবসময় |
| **Vangcur রিপোর** `lib/invoice/InvoiceCardBody.tsx` | **ডাউনলোড হওয়া PNG** (Vercel যা আঁকে) | সবসময় — নইলে প্রিভিউ আর ডাউনলোড আলাদা দেখাবে |
| `workers/invoice/src/InvoiceSatoriBody.tsx` | শুধু নিষ্ক্রিয় Worker (satori-সামঞ্জস্য সংস্করণ) | ভবিষ্যতে Worker চালু করলে |

---

## ২. নিষ্ক্রিয় বিকল্প: Cloudflare Worker (`workers/invoice/`)

**অবস্থা:** কোড সম্পূর্ণ ও পরীক্ষিত (লোকাল `wrangler dev` + Cloudflare-এ ডিপ্লয় সফল হয়েছিল), কিন্তু **এখন ব্যবহার হয় না**। Cloudflare থেকে `vangcur-invoice` Worker ও তার বিল্ড ট্রিগার মুছে ফেলা হয়েছে (২১ নভেম্বর ২০২৬); মূল সাইটের কনফিগে কোনো বাইন্ডিংও নেই।

**কখন আবার কাজে লাগবে:** Cloudflare **Workers Paid** প্ল্যানে গেলে (CPU সীমা ডিফল্ট ৩০ সেকেন্ড, তখন ~২ সেকেন্ড কোনো সমস্যা নয়), অথবা Vercel বাদ দিয়ে সবকিছু Cloudflare-এ আনলে।

### পুনরায় চালু করার ধাপ
1. **Worker তৈরি:** Cloudflare → Workers & Pages → Create → Import a repository (`cloud-vangcur`)।
   - Project name: ঠিক `vangcur-invoice`
   - Root directory: `workers/invoice`
   - Build command: `node scripts/patch-satori.mjs`
   - Deploy command: `npx wrangler deploy`
   - (ঐচ্ছিক) Build watch paths: `workers/invoice/*`, `lib/invoice/socialBadgeIcons.ts`
2. **বাইন্ডিং যোগ:** মূল `wrangler.jsonc`-এর `services`-এ
   ```jsonc
   { "binding": "INVOICE_RENDERER", "service": "vangcur-invoice" }
   ```
   ⚠️ Worker আগে থেকে না থাকলে মূল সাইটের ডিপ্লয় ফেল করবে — তাই ধাপ ১ আগে।
3. **রুট পুনরুদ্ধার:** `/api/invoice/png`-এর Service-Binding সংস্করণ git ইতিহাসে আছে:
   ```
   git show 0e5dfc9:app/api/invoice/png/route.ts      # PR #41-এর পরের সংস্করণ
   ```
   (এটা `getCloudflareContext().env.INVOICE_RENDERER.fetch(...)` দিয়ে Worker ডাকে।) তখন Vercel-এর `INVOICE_RENDER_*` সিক্রেট আর লাগবে না।
4. **টেমপ্লেট মেলান:** `workers/invoice/src/InvoiceSatoriBody.tsx` চালু অবস্থার `lib/invoice/InvoiceCardBody.tsx`-এর সাথে মিলিয়ে নিন (মাঝের সময়ে ডিজাইন বদলে থাকতে পারে)।
5. **পরীক্ষা:** একটা টেস্ট অর্ডারের ইনভয়েস ডাউনলোড করে Cloudflare Observability-তে `cpuTimeMs` দেখুন।

### কোডের গুরুত্বপূর্ণ কৌশল ও ফাঁদ (যাতে আবার ভুল না হয়)
- **wasm রানটাইমে কম্পাইল নিষিদ্ধ:** Workers `WebAssembly.instantiate(bytes)` অনুমতি দেয় না। এজন্য `satori/layout.wasm` ও `@resvg/resvg-wasm/index_bg.wasm` সরাসরি `import` করা (wrangler এগুলোকে আগে-কম্পাইল-করা মডিউল ধরে)।
- **harfbuzz (বাংলা যুক্তাক্ষরের শেপিং) wasm:** satori-র ভেতরে base64 হিসেবে ঢোকানো, তাই `scripts/patch-satori.mjs` বিল্ডের আগে চালাতে হয় — সেটা wasm বের করে `generated/hb.wasm`-এ রাখে ও `standalone.js` প্যাচ করে। satori ভার্সন `0.48.1`-এ **পিন করা**; ভার্সন বদলালে প্যাটার্ন না মিললে স্ক্রিপ্ট ইচ্ছাকৃতভাবে ব্যর্থ হয় (বিল্ড ফেল)।
- **`boxSizing: 'border-box'`:** satori ০.৪৮-এর লেআউটে `width:100%` + `padding` ডান দিকের ৪৪px কেটে দেয় — Worker-এর টেমপ্লেটে এটা ঠিক করা আছে (মূল সাইটের পুরনো `lib/invoice/InvoiceSatoriBody.tsx`-এ নেই)।
- **`overflow:hidden` = বাড়তি CPU:** মূল বাক্সে `overflow:hidden` থাকলে satori প্রতিটা উপাদানের জন্য `mask` বানায় (৭৭টা), resvg ধীর হয়। Worker-এর টেমপ্লেটে এটা সরালে ছবি প্রায় হুবহু একই থাকে (সর্বোচ্চ পিক্সেল পার্থক্য ৪/৭৬৫), CPU ~২৫% কমে। (এখনো সরানো হয়নি, ইচ্ছে হলে করা যায়।)
- **ফন্ট বান্ডলে:** `@fontsource/hind-siliguri` ও `@fontsource/dm-sans` থেকে ৮টা `.woff` (`wrangler.jsonc`-এর `Data` রুল)। resvg-তে ফন্ট দিতে হয় না — satori টেক্সটকে আগেই path-এ রূপান্তর করে।
- **`package-lock.json` আবশ্যক:** Cloudflare Workers Builds `npm ci` চালায়।
- **`socialBadgeIcons.ts` মূল `lib/`-এ থাকতে হবে:** Worker এটা `../../../lib/invoice/socialBadgeIcons` থেকে `import` করে (কপি রাখা হয়নি) — **ফাইলটা সরাবেন/মুছবেন না।**
- **আকার:** বান্ডল ৪.৮ MB, সংকুচিত ১.৯ MB (Free সীমা ৩ MB-এর মধ্যে; Paid ১০ MB)।
- **অ্যাক্সেস:** `workers_dev: false`, কোনো Route নেই — শুধু Service Binding দিয়ে পৌঁছানো যায়, বাইরে থেকে কেউ ডাকতে পারে না।
- **ছবির URL:** মূল সাইট আগেই `optimizeCloudinaryUrl(url, 120)` করে `itemImageUrls` পাঠায়; Worker লোগো `https://vangcur.com/vangcur-logo.png` থেকে আনে (অনুমোদিত হোস্ট তালিকা আছে)।

### মূল সাইটে অব্যবহৃত পুরনো কোড (ইচ্ছাকৃতভাবে রাখা)
`lib/invoice/renderInvoiceSvg.ts`, `lib/invoice/satoriAssets.ts`, `lib/invoice/InvoiceSatoriBody.tsx`, `public/resvg.wasm`, `package.json`-এর `satori` ও `@resvg/resvg-wasm` — **কোনো রুট এগুলো আর ব্যবহার করে না**, মূল Worker-এর বান্ডলেও ঢোকে না। পরে নিশ্চিত হলে মুছে ফেলা যাবে; মুছলে `lib/invoice/socialBadgeIcons.ts` **রেখে** দিতে হবে।

---

## ৩. সমস্যা হলে (Troubleshooting)

| লক্ষণ | সম্ভাব্য কারণ |
| :--- | :--- |
| ডাউনলোডে ৫০০, Cloudflare লগে ~৭০ms-এ ব্যর্থ | Cloudflare-এ `INVOICE_RENDER_URL` / `INVOICE_RENDER_SECRET` সেট নেই |
| ৫০০, লগে ~১–২ সেকেন্ড অপেক্ষা | Vercel এরর ফেরত দিয়েছে। Vercel → Logs দেখুন: `405` = নতুন রুটসহ ভার্সন লাইভ নয় (বিল্ড ব্যর্থ/পুরনো ডিপ্লয়); `401` = দুই জায়গার চাবি মেলেনি; `503` = Vercel-এ `INVOICE_RENDER_SECRET` নেই বা Redeploy হয়নি; `404` = `INVOICE_RENDER_URL` ভুল |
| Vercel বিল্ড ফেল: "Your project's URL and API key are required" | Vercel Production Env-এ `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` নেই |
| প্রথম ডাউনলোড ৫–১৫ সেকেন্ড লাগে | স্বাভাবিক — Vercel-এ Chromium ঠান্ডা শুরু |
| প্রিভিউ ও ডাউনলোড করা ছবি আলাদা দেখায় | দুই রিপোর `InvoiceCardBody.tsx` মেলেনি (উপরের ⚠️ টেবিল) |
| Cloudflare লগে এরর মেসেজের লেখা নেই | Workers Observability `console.error(msg, err)`-এ শুধু স্ট্যাক দেখায়; কারণ বুঝতে Vercel Logs দেখুন |

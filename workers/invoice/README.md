# ⏸️ vangcur-invoice (নিষ্ক্রিয়)

ইনভয়েস PNG রেন্ডারের Cloudflare Worker (satori + resvg-wasm)। **এখন ব্যবহার হয় না** — ইনভয়েস বানায় Vercel।
ভবিষ্যতে Cloudflare-এ (Workers Paid প্ল্যানে) ফিরলে আবার চালু করার জন্য রাখা আছে।

- কেন বন্ধ, কীভাবে আবার চালু করবেন, ফাঁদগুলো কী: **[`/INVOICE_SYSTEM.md`](../../INVOICE_SYSTEM.md)** (বিশেষ করে ধারা ২)
- Cloudflare-এ এই নামে কোনো Worker/ট্রিগার এখন নেই; কোড রিপোতেই আছে।
- ⚠️ `lib/invoice/socialBadgeIcons.ts` (মূল রিপোর) মুছবেন না — `src/InvoiceSatoriBody.tsx` সেটা ইমপোর্ট করে।

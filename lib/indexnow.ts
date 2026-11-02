import 'server-only';

// 🔎 IndexNow (Bing/Yandex/Naver ইত্যাদিতে তাৎক্ষণিক URL সাবমিশন)
const HOST = 'vangcur.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

// lib/productData.ts-এর makeSlug()-এর হুবহু কপি — ওই ফাইল ক্লায়েন্ট স্টোর ইমপোর্ট করে,
// তাই সার্ভার রুটে সরাসরি ইমপোর্ট করা হয়নি। (productData.ts-এ বদলালে এখানেও বদলান)
export function makeSlug(str: string): string {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function productUrl(prod: { id: number | string; name: string }): string {
  return `https://${HOST}/product/${makeSlug(prod.name)}-${prod.id}`;
}

export async function submitToIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number; reason?: string }> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return { ok: false, reason: 'INDEXNOW_KEY সেট করা নেই' };

  const urlList = [...new Set(urls)].filter((u) => u.startsWith(`https://${HOST}/`)).slice(0, 100);
  if (urlList.length === 0) return { ok: false, reason: 'বৈধ URL নেই' };

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: process.env.INDEXNOW_KEY_LOCATION || `https://${HOST}/${key}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(8000),
    });
    // ২০০ = সফল, ২০২ = গ্রহণ করা হয়েছে (কী ভ্যালিডেশন বাকি)
    if (res.status === 200 || res.status === 202) return { ok: true, status: res.status };
    return { ok: false, status: res.status, reason: `IndexNow উত্তর ${res.status}` };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'নেটওয়ার্ক ত্রুটি' };
  }
}

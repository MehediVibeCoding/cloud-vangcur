import 'server-only';

// এই ফাইলটা নতুন (satori-ভিত্তিক) ইনভয়েস রেন্ডারারের জন্য — পুরনো
// renderInvoiceHtml.tsx / InvoiceCardBody.tsx (অন-স্ক্রিন প্রিভিউ, যেটা
// গ্রাহক সাইটে দেখেন) একদম অপরিবর্তিত থাকছে, এটা শুধু সার্ভার-সাইড PNG
// জেনারেশনের (app/api/invoice/png/route.ts) জন্য আলাদা পাইপলাইন।

export async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    const contentType = res.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${base64}`;
  } catch {
    // ছবি লোড ব্যর্থ হলে পুরো ইনভয়েস জেনারেশন আটকে দেওয়া ঠিক না — null
    // ফেরত দিলে কম্পোনেন্ট placeholder ব্যবহার করবে (পুরনো আচরণের মতোই,
    // যেখানে ব্রাউজারে <img> লোড ব্যর্থ হলে broken icon দেখাত না, graceful).
    return null;
  }
}

async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Font fetch failed: ${url} (status ${res.status})`);
  }
  return res.arrayBuffer();
}

const FONT_WEIGHTS = [400, 500, 600, 700] as const;
type FontWeight = (typeof FONT_WEIGHTS)[number];

const FONT_FILES: Record<'Hind Siliguri' | 'DM Sans', Record<FontWeight, string>> = {
  'Hind Siliguri': {
    400: 'hind-siliguri-bengali-400-normal.woff',
    500: 'hind-siliguri-bengali-500-normal.woff',
    600: 'hind-siliguri-bengali-600-normal.woff',
    700: 'hind-siliguri-bengali-700-normal.woff',
  },
  'DM Sans': {
    400: 'dm-sans-latin-400-normal.woff',
    500: 'dm-sans-latin-500-normal.woff',
    600: 'dm-sans-latin-600-normal.woff',
    700: 'dm-sans-latin-700-normal.woff',
  },
};

export type SatoriFontEntry = {
  name: 'Hind Siliguri' | 'DM Sans';
  data: ArrayBuffer;
  weight: FontWeight;
  style: 'normal';
};

export type LoadedInvoiceFonts = {
  satoriFonts: SatoriFontEntry[];
  // resvg-কে রাস্টারাইজেশনের সময় একই ফন্ট আবার লাগবে (satori শুধু SVG
  // <text> বসায়, আসল গ্লিফ আঁকে resvg) — তাই দুটো জায়গাতেই পাস করতে হয়।
  fontBuffers: Uint8Array[];
};

// মডিউল-স্কোপ ক্যাশ: একই Worker isolate-এ বারবার request এলে প্রতিবার নতুন
// করে fetch না করে পুনর্ব্যবহার হবে (cold start-এই শুধু একবার লোড হবে)।
let cachedFonts: LoadedInvoiceFonts | null = null;

export async function loadInvoiceFonts(assetBaseUrl: string): Promise<LoadedInvoiceFonts> {
  if (cachedFonts) return cachedFonts;

  const jobs: Promise<SatoriFontEntry>[] = [];
  (Object.keys(FONT_FILES) as Array<'Hind Siliguri' | 'DM Sans'>).forEach((name) => {
    FONT_WEIGHTS.forEach((weight) => {
      const fileName = FONT_FILES[name][weight];
      jobs.push(
        fetchAsArrayBuffer(`${assetBaseUrl}/fonts/invoice/${fileName}`).then((data) => ({
          name,
          data,
          weight,
          style: 'normal' as const,
        }))
      );
    });
  });

  const satoriFonts = await Promise.all(jobs);
  const fontBuffers = satoriFonts.map((f) => new Uint8Array(f.data));

  cachedFonts = { satoriFonts, fontBuffers };
  return cachedFonts;
}

// resvg-wasm-এর WASM বাইনারি, একইভাবে /public থেকে fetch করে init করা হয় —
// bundler-নির্দিষ্ট `import ... from '*.wasm'` সিনট্যাক্সের ঝামেলা এড়াতে।
let resvgReady: Promise<void> | null = null;

export async function ensureResvgWasm(assetBaseUrl: string): Promise<void> {
  if (!resvgReady) {
    const { initWasm } = await import('@resvg/resvg-wasm');
    resvgReady = initWasm(fetch(`${assetBaseUrl}/resvg.wasm`)).catch((err) => {
      // init ব্যর্থ হলে পরের রিকোয়েস্টে আবার চেষ্টা করার সুযোগ রাখা
      resvgReady = null;
      throw err;
    });
  }
  return resvgReady;
}

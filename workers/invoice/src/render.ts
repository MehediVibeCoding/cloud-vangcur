// মূল সাইটের lib/invoice/renderInvoiceSvg.ts + app/api/invoice/png/route.ts-এর রেন্ডার অংশ এখানে একত্র করা হয়েছে।
// তফাত শুধু: (১) wasm আগে থেকে কম্পাইল করা মডিউল হিসেবে ইম্পোর্ট (রানটাইমে কম্পাইল Workers-এ নিষিদ্ধ),
// (২) ফন্ট বান্ডলে, (৩) ছবির URL মূল সাইট আগেই বানিয়ে পাঠায়।
import satori, { init as initSatori } from 'satori/standalone';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import layoutWasm from 'satori/layout.wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
// harfbuzz wasm (বাংলা টেক্সট-শেপিং) — scripts/patch-satori.mjs বিল্ডের আগে এটা বের করে generated/-এ রাখে
import hbWasm from '../generated/hb.wasm';
import { InvoiceSatoriBody, INVOICE_SATORI_WIDTH, type InvoiceSatoriContact } from './InvoiceSatoriBody';
import { SATORI_FONTS, FONT_BUFFERS } from './fonts';
import type { Order } from './orderTypes';

// প্যাচ-করা satori এই আগে-কম্পাইল-করা মডিউল ব্যবহার করে (রানটাইমে কম্পাইল Workers-এ নিষিদ্ধ)
(globalThis as unknown as { __HB_WASM_MODULE__: WebAssembly.Module }).__HB_WASM_MODULE__ = hbWasm;

// emoji normal font দিয়ে আঁকা যায় না — Twemoji SVG দিয়ে প্রতিস্থাপন (মূল সাইটের তালিকার হুবহু কপি)।
// InvoiceSatoriBody.tsx বা dueMsg-এ নতুন emoji যোগ হলে এখানেও যোগ করুন।
const EMOJI_LIST = ['📦', '📞', '✉️', '🌐', '🎉'];

function toCodePoints(emoji: string): string {
  return Array.from(emoji)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join('-');
}

const GRAPHEME_IMAGES: Record<string, string> = Object.fromEntries(
  EMOJI_LIST.map((e) => [e, `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${toCodePoints(e)}.svg`]),
);

// আসল কন্টেন্ট এর চেয়ে ছোট হবে; resvg পরে bounding box অনুযায়ী crop করে (মূল সাইটের মতোই)।
const MAX_CANVAS_HEIGHT = 2600;

export interface RenderRequest {
  order: Order;
  ds: string;
  contact: InvoiceSatoriContact;
  dueMsg: string;
  advancePaid: number;
  balanceDue: number;
  isFreeShipping: boolean;
  /** মূল সাইটের ঠিকানা — লোগো আনতে লাগে (শুধু অনুমোদিত হোস্ট) */
  assetBaseUrl: string;
  /** order.items-এর সাথে সাজানো, আগে থেকে অপটিমাইজ করা ছবির URL (বা null) */
  itemImageUrls: (string | null)[];
}

const ALLOWED_ASSET_ORIGINS = new Set(['https://vangcur.com', 'https://www.vangcur.com']);
const FETCH_TIMEOUT_MS = 4000;
const MAX_IMAGE_BYTES = 1_500_000;

let wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = Promise.all([initSatori(layoutWasm), initWasm(resvgWasm)])
      .then(() => undefined)
      .catch((err) => {
        wasmReady = null; // ব্যর্থ হলে পরের রিকোয়েস্টে আবার চেষ্টা
        throw err;
      });
  }
  return wasmReady;
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// ছবি লোড ব্যর্থ হলে null — মূল সাইটের আচরণের মতোই পুরো ইনভয়েস আটকায় না (কম্পোনেন্ট placeholder দেখায়)
async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    if (!url.startsWith('https://')) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;
    const contentType = res.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${toBase64(buf)}`;
  } catch {
    return null;
  }
}

let cachedLogo: string | null = null;
async function loadLogo(origin: string): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  const logo = await fetchAsDataUri(`${origin}/vangcur-logo.png`);
  if (logo) cachedLogo = logo;
  return logo;
}

export async function renderInvoicePng(req: RenderRequest): Promise<Uint8Array> {
  const origin = ALLOWED_ASSET_ORIGINS.has(req.assetBaseUrl) ? req.assetBaseUrl : 'https://vangcur.com';

  const [, logoDataUri, itemImageDataUris] = await Promise.all([
    ensureWasm(),
    loadLogo(origin),
    Promise.all((req.itemImageUrls || []).map((u) => (u ? fetchAsDataUri(u) : Promise.resolve(null)))),
  ]);

  const svg = await satori(
    InvoiceSatoriBody({
      order: req.order,
      ds: req.ds,
      contact: req.contact,
      dueMsg: req.dueMsg,
      advancePaid: req.advancePaid,
      balanceDue: req.balanceDue,
      isFreeShipping: req.isFreeShipping,
      logoDataUri,
      itemImageDataUris,
    }),
    {
      width: INVOICE_SATORI_WIDTH,
      height: MAX_CANVAS_HEIGHT,
      fonts: SATORI_FONTS,
      graphemeImages: GRAPHEME_IMAGES,
    },
  );

  // scale 3x — মূল সাইটের মতোই (retina কোয়ালিটি)
  const resvg = new Resvg(svg, {
    font: { fontBuffers: FONT_BUFFERS, loadSystemFonts: false },
    background: '#FFFFFF',
    fitTo: { mode: 'zoom', value: 3 },
  });

  const bbox = resvg.innerBBox();
  if (bbox) resvg.cropByBBox(bbox);

  const rendered = resvg.render();
  const png = rendered.asPng();
  rendered.free();
  resvg.free();
  return png;
}

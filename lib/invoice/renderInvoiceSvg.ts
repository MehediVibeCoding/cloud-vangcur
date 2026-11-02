import 'server-only';
import satori from 'satori';
import type { Order } from '@/types';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { InvoiceSatoriBody, INVOICE_SATORI_WIDTH, type InvoiceSatoriContact } from './InvoiceSatoriBody';
import { fetchAsDataUri, loadInvoiceFonts } from './satoriAssets';

// emoji normal font দিয়ে আঁকা যায় না — Twemoji SVG দিয়ে প্রতিস্থাপন করা
// হয় (satori-র `graphemeImages` অপশন)। এই জায়গায় যত emoji ব্যবহার হয়
// (InvoiceSatoriBody.tsx + invoiceViewModel.ts-এর dueMsg) সবগুলো এখানে
// তালিকাভুক্ত থাকা দরকার, নাহলে সেগুলোর জায়গায় ফাঁকা/বক্স দেখাবে।
const EMOJI_LIST = ['📦', '📞', '✉️', '🌐', '🎉'];

function toCodePoints(emoji: string): string {
  return Array.from(emoji)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join('-');
}

const GRAPHEME_IMAGES: Record<string, string> = Object.fromEntries(
  EMOJI_LIST.map((e) => [e, `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${toCodePoints(e)}.svg`])
);

// পর্যাপ্ত বড় একটা ক্যানভাস উচ্চতা — আসল কন্টেন্ট (আইটেম সংখ্যা অনুযায়ী)
// এর চেয়ে ছোট হবে বলে ধরে নেওয়া হচ্ছে। route.ts পরে resvg দিয়ে
// প্রকৃত কন্টেন্টের bounding box বের করে ছবিটা ঠিক মাপে crop করে।
const MAX_CANVAS_HEIGHT = 2600;

export async function renderInvoiceSvg(params: {
  order: Order;
  ds: string;
  contact: InvoiceSatoriContact;
  dueMsg: string;
  advancePaid: number;
  balanceDue: number;
  isFreeShipping: boolean;
  assetBaseUrl: string;
}): Promise<{ svg: string; fontBuffers: Uint8Array[] }> {
  const { order, assetBaseUrl } = params;

  const [{ satoriFonts, fontBuffers }, logoDataUri, itemImageDataUris] = await Promise.all([
    loadInvoiceFonts(assetBaseUrl),
    fetchAsDataUri(`${assetBaseUrl}/vangcur-logo.png`),
    Promise.all(
      (order.items || []).map((item) => {
        const url = item.imgs && item.imgs[0];
        if (typeof url !== 'string' || !url.startsWith('http')) return Promise.resolve(null);
        return fetchAsDataUri(optimizeCloudinaryUrl(url, 120));
      })
    ),
  ]);

  const svg = await satori(
    InvoiceSatoriBody({
      ...params,
      logoDataUri,
      itemImageDataUris,
    }),
    {
      width: INVOICE_SATORI_WIDTH,
      height: MAX_CANVAS_HEIGHT,
      fonts: satoriFonts,
      graphemeImages: GRAPHEME_IMAGES,
    }
  );

  return { svg, fontBuffers };
}

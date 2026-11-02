'use client';

// 📈 ক্লায়েন্ট-সাইড ই-কমার্স ট্র্যাকিং — GA4 (gtag) + Meta Pixel (fbq) + Meta CAPI + Clarity + GTM dataLayer।
// ⚠️ এক্সপোর্ট করা ফাংশনের নাম ও আর্গুমেন্ট আগের মতোই — তাই product/checkout পেজের কল বদলাতে হয় না।
//
// ডিডুপ্লিকেশন: Pixel (ব্রাউজার) ও CAPI (সার্ভার) একই event_id পাঠায়, Meta নিজে ডুপ্লিকেট বাদ দেয়।
// Purchase-এর event_id সবসময় `purchase_<অর্ডার নম্বর>` — একই অর্ডার দুবার গেলেও একবারই গণনা হয়।

export interface AnalyticsItem {
  item_id: string | number;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

const CURRENCY = 'BDT';
const NO_TRACK_KEY = 'vc_notrack'; // Analytics.tsx-এর সাথে একই কী

function trackingDisabled(): boolean {
  try {
    return window.localStorage.getItem(NO_TRACK_KEY) === '1';
  } catch {
    return false;
  }
}

function newEventId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readCookie(name: string): string | undefined {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : undefined;
  } catch {
    return undefined;
  }
}

// ── GTM dataLayer (আগের আচরণ অপরিবর্তিত — GTM ব্যবহার না করলেও ক্ষতি নেই) ──
export function pushToDataLayer(event: string, ecommerceData?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({
    event,
    ...ecommerceData,
  });
}

function ga4Event(name: string, params: Record<string, unknown>): void {
  try {
    window.gtag?.('event', name, params);
  } catch {
    /* ট্র্যাকিং কখনো সাইট ভাঙবে না */
  }
}

function clarityEvent(name: string): void {
  try {
    window.clarity?.('event', name);
  } catch {
    /* ignore */
  }
}

// Meta Pixel (ব্রাউজার) + CAPI (সার্ভার, same-origin রুট, /api/meta-capi -> Cloudflare Worker ইনভোকেশন)।
// Purchase-এর CAPI সার্ভারে অর্ডার DB থেকে যাচাই হয়, তাই ওটা সবসময় সার্ভারে পাঠানো জরুরি।
// ViewContent-এর জন্য আগে প্রতিটা প্রোডাক্ট-ভিউতেও CAPI কল হতো — কিন্তু ব্রাউজার Pixel (fbq)
// আগে থেকেই ViewContent পাঠায়, তাই সার্ভার-সাইড ডুপ্লিকেট অপ্রয়োজনীয় ফাংশন-ইনভোকেশন
// (১ লাখ ভিজিটরে আনুমানিক ৩ লাখ ইনভোকেশন)। এখন withCapi=false দিলে শুধু Pixel পাঠায়, CAPI বাদ।
function metaEvent(
  name: 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase',
  customData: Record<string, unknown>,
  eventId: string,
  extra?: Record<string, unknown>,
  withCapi: boolean = true,
): void {
  try {
    window.fbq?.('track', name, customData, { eventID: eventId });
  } catch {
    /* ignore */
  }
  if (!withCapi) return;
  try {
    void fetch('/api/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event_name: name,
        event_id: eventId,
        event_source_url: window.location.href,
        fbp: readCookie('_fbp'),
        fbc: readCookie('_fbc'),
        custom_data: customData,
        ...extra,
      }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function toGaItems(items: AnalyticsItem[]) {
  return items.map((i) => ({
    item_id: String(i.item_id),
    item_name: i.item_name,
    price: i.price,
    quantity: i.quantity || 1,
    item_category: i.item_category || 'General',
  }));
}

function toMetaData(items: AnalyticsItem[], value: number) {
  return {
    content_type: 'product',
    content_ids: items.map((i) => String(i.item_id)),
    content_name: items.map((i) => i.item_name).join(', ').slice(0, 200),
    contents: items.map((i) => ({ id: String(i.item_id), quantity: i.quantity || 1, item_price: i.price })),
    num_items: items.reduce((s, i) => s + (i.quantity || 1), 0),
    value,
    currency: CURRENCY,
  };
}

// ── ১. প্রোডাক্ট দেখা ──
export function trackViewItem(item: AnalyticsItem): void {
  const ga = toGaItems([{ ...item, quantity: 1 }]);
  pushToDataLayer('view_item', { ecommerce: { currency: CURRENCY, value: item.price, items: ga } });
  if (typeof window === 'undefined' || trackingDisabled()) return;
  ga4Event('view_item', { currency: CURRENCY, value: item.price, items: ga });
  // withCapi=false: শুধু ব্রাউজার Pixel, সার্ভার-সাইড CAPI কল নেই (উপরের মন্তব্য দেখুন)
  metaEvent('ViewContent', toMetaData([{ ...item, quantity: 1 }], item.price), newEventId('vc'), undefined, false);
}

// ── ২. কার্টে যোগ ──
export function trackAddToCart(item: AnalyticsItem, qty = 1): void {
  const value = item.price * qty;
  const ga = toGaItems([{ ...item, quantity: qty }]);
  pushToDataLayer('add_to_cart', { ecommerce: { currency: CURRENCY, value, items: ga } });
  if (typeof window === 'undefined' || trackingDisabled()) return;
  ga4Event('add_to_cart', { currency: CURRENCY, value, items: ga });
  metaEvent('AddToCart', toMetaData([{ ...item, quantity: qty }], value), newEventId('atc'));
  clarityEvent('add_to_cart');
}

// ── ৩. চেকআউট শুরু ──
export function trackBeginCheckout(items: AnalyticsItem[], totalValue: number): void {
  const ga = toGaItems(items);
  pushToDataLayer('begin_checkout', { ecommerce: { currency: CURRENCY, value: totalValue, items: ga } });
  if (typeof window === 'undefined' || trackingDisabled()) return;
  ga4Event('begin_checkout', { currency: CURRENCY, value: totalValue, items: ga });
  metaEvent('InitiateCheckout', toMetaData(items, totalValue), newEventId('ic'));
  clarityEvent('begin_checkout');
}

// ── ৪. অর্ডার সম্পন্ন ──
// সার্ভারে /api/meta-capi অর্ডার নম্বর দিয়ে DB থেকে আসল মোট দাম, ইমেইল ও ফোন নিয়ে নেয় —
// তাই ব্রাউজার থেকে ভুয়া Purchase পাঠানো যায় না, আর কাস্টমারের তথ্য ব্রাউজারে আনতে হয় না।
export function trackPurchase(
  transactionId: string | number,
  totalValue: number,
  shippingCost: number,
  items: AnalyticsItem[],
): void {
  const ga = toGaItems(items);
  pushToDataLayer('purchase', {
    ecommerce: {
      transaction_id: String(transactionId),
      value: totalValue,
      shipping: shippingCost,
      currency: CURRENCY,
      items: ga,
    },
  });
  if (typeof window === 'undefined' || trackingDisabled()) return;
  ga4Event('purchase', {
    transaction_id: String(transactionId),
    value: totalValue,
    shipping: shippingCost,
    currency: CURRENCY,
    items: ga,
  });
  metaEvent('Purchase', toMetaData(items, totalValue), `purchase_${transactionId}`, {
    order_num: String(transactionId),
  });
  clarityEvent('purchase');
}

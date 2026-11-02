// ফাইলের পাথ: lib/showcaseData.ts
// ─────────────────────────────────────────────────────────────────────────────
// হোম পেজের "কালেকশন কার্ড (৪টি)" ও "স্পটলাইট প্রোডাক্ট (২টি)" সেকশনের ডেটা।
//
// ডেটা আসে store_settings টেবিলের একটাই key থেকে: 'vc_home_showcase' (JSON)।
// অ্যাডমিন প্যানেলের "হোম শোকেস" পেজ (/design/home-showcase) এই key-তেই সেভ করে।
// কিছু না পেলে (বা ফেচ ব্যর্থ হলে) নিচের DEFAULT_SHOWCASE ব্যবহার হয় — পেজ কখনো ক্র্যাশ করে না।
//
// কালেকশন: ৪টা কার্ডের প্রতিটার স্থায়ী collectionId (gift/premium/room-decor/useful-tools) আছে। কার্ডে ক্লিক করলে
// /collection/<collectionId> পেজে যায়, আর সেখানে custom_products.collections কলামে ওই id থাকা
// প্রোডাক্টগুলো দেখায় (lib/collectionData.ts)।
//
// ⚠️ এই ফাইলের টাইপ ও ডিফল্ট Mehediadmin-এর lib/constants/homeShowcase.ts-এর সাথে হুবহু মিল রাখতে
// হবে। একটা বদলালে অন্যটাও বদলান।
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseSupabaseVal } from './categoryData';
import { logWarn } from './logger';
import type { SettingsMap } from './storeSettingsBatch';

export const SHOWCASE_SETTING_KEY = 'vc_home_showcase';
export const SHOWCASE_CARD_COUNT = 4;
export const SHOWCASE_SPOTLIGHT_COUNT = 2;

// প্রতিটা কার্ড-স্লটের স্থায়ী কালেকশন id (ক্রম গুরুত্বপূর্ণ — কার্ড #১ = gift ...)
export const COLLECTION_IDS = ['gift', 'premium', 'room-decor', 'useful-tools'] as const;

// পুরনো কালেকশন আইডি → নতুন আইডি (পুরনো লিংক/বুকমার্ক যেন ভাঙে না)
export const LEGACY_COLLECTION_IDS: Record<string, CollectionId> = {
  unique: 'room-decor',
  cute: 'useful-tools',
};
export type CollectionId = (typeof COLLECTION_IDS)[number];

// অক্ষর সীমা
export const SHOWCASE_LIMITS = {
  headingLead: 60,
  headingHl: 24,
  cardTitle: 22,
  badge: 24,
  title: 80,
  desc: 500,
  descRecommended: 250, // এর বেশি হলে মোবাইলে ছবি বেশি ক্রপ হতে পারে — অ্যাডমিনে সতর্কবার্তা দেখায়
  spotBtn: 22,
  link: 300,
  product: 60,
  feature: 60,
  featureCount: 8,
  note: 160,
} as const;

export interface ShowcaseHeading {
  /** প্রথম লাইনের ধূসর লেখা */
  lead: string;
  leadEn: string;
  /** দ্বিতীয় লাইনের ইটালিক হাইলাইট শব্দ */
  hl: string;
  hlEn: string;
}

export interface ShowcaseCard {
  img: string;
  /** কার্ডের নিচের বাটনে বসা কালেকশনের নাম */
  title: string;
  titleEn: string;
  /** স্থায়ী — অ্যাডমিন থেকে বদলানো যায় না */
  collectionId: CollectionId;
}

export type SpotlightLinkType = 'product' | 'category';

export interface ShowcaseSpotlight {
  enabled: boolean;
  img: string;
  badge: string;
  badgeEn: string;
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
  /** ঐচ্ছিক — ছবির নিচে-বামে গ্লাস চিপে বসা প্রোডাক্টের নাম */
  product: string;
  productEn: string;
  /** ঐচ্ছিক — টিক-চিহ্নসহ ফিচার তালিকা (সর্বোচ্চ featureCount টা) */
  features: string[];
  featuresEn: string[];
  /** ঐচ্ছিক — তালিকার নিচের শেষ লাইন */
  note: string;
  noteEn: string;
  /** ঐচ্ছিক — ০ বা ফাঁকা হলে দাম দেখাবে না */
  price: number;
  btn: string;
  btnEn: string;
  /** অ্যাডমিন যা লেখে: প্রোডাক্টের লিংক বা আইডি (সেভের সময় সার্ভার এটা থেকে productId বের করে) */
  link: string;
  linkType: SpotlightLinkType;
  productId?: number;
  productName?: string;
  catId: string;
}

export interface ShowcaseConfig {
  enabled: boolean;
  heading: ShowcaseHeading;
  cards: ShowcaseCard[];
  spotlights: ShowcaseSpotlight[];
}

// ডেমো ছবি (পরে অ্যাডমিন প্যানেল থেকে বদলানো হবে)
const IMG_SQUARE = 'https://res.cloudinary.com/dkjzleczw/image/upload/v1790567648/vangcur/reviews/ujkyrgbuz0ajb0eeebws.webp';
const IMG_WIDE = 'https://res.cloudinary.com/dkjzleczw/image/upload/v1791453080/ChatGPT_Image_Oct_8_2026_03_41_59_PM_mjfh7t.png';
const IMG_TALL = 'https://res.cloudinary.com/dkjzleczw/image/upload/v1789009718/9f60ce93-82e1-4b01-8764-374a9560cf30_lnrcrq.png';

export const DEFAULT_SHOWCASE: ShowcaseConfig = {
  enabled: true,
  heading: {
    lead: 'আপনার পছন্দের গ্যাজেট খুঁজে নিন',
    leadEn: 'Find your favourite gadgets',
    hl: 'কিউরেটেড কালেকশন',
    hlEn: 'Curated Collection',
  },
  cards: [
    { img: IMG_TALL, title: 'গিফট আইডিয়া', titleEn: 'Gift Ideas', collectionId: 'gift' },
    { img: IMG_WIDE, title: 'প্রিমিয়াম গ্যাজেট', titleEn: 'Premium Gadgets', collectionId: 'premium' },
    { img: IMG_SQUARE, title: 'রুম ডেকর', titleEn: 'Room Decor', collectionId: 'room-decor' },
    { img: IMG_TALL, title: 'ইউজফুল টুলস', titleEn: 'Useful Tools', collectionId: 'useful-tools' },
  ],
  spotlights: [
    {
      enabled: true,
      img: IMG_SQUARE,
      badge: 'হট সেলিং',
      badgeEn: 'Hot Selling',
      title: 'আপনার রুমকেও এরকম Pinterest স্টাইলে বানাতে চান?',
      titleEn: 'Want your room to look this Pinterest-worthy too?',
      desc: 'এই লাইটটা একবার ঘরে জ্বললে, কেউ চোখ ফিরাতে পারবেন না—সত্যি!',
      descEn: 'Once this light glows in your room, nobody will be able to look away — really!',
      product: 'RGB Neon Light – 16 Fit / 5 Meter',
      productEn: 'RGB Neon Light – 16 Fit / 5 Meter',
      features: [
        'রিমোট + অ্যাপে কন্ট্রোল',
        '৯৬টা LED প্রতি মিটার!',
        'Waterproof, Easy Setup',
        'অসংখ্য কালার মোড',
        'Bluetooth Connectivity',
        'Safe + Durable + Premium Quality',
        '৬ মাসের Replacement Warranty!',
      ],
      featuresEn: [
        'Remote + app control',
        '96 LEDs per metre!',
        'Waterproof, easy setup',
        'Countless colour modes',
        'Bluetooth connectivity',
        'Safe + durable + premium quality',
        '6-month replacement warranty!',
      ],
      note: 'ঘর, গেমিং সেটআপ, ব্যাকগ্রাউন্ড ডেকোর—সবকিছুর জন্য পারফেক্ট।',
      noteEn: 'Perfect for your room, gaming setup and background decor — everything.',
      price: 0,
      btn: 'বিস্তারিত দেখুন',
      btnEn: 'View details',
      link: '',
      linkType: 'category',
      catId: '',
    },
    {
      enabled: true,
      img: IMG_WIDE,
      badge: 'ইউনিক কালেকশন',
      badgeEn: 'Unique Pick',
      title: 'জ্যামে, ক্লাসরুমে বা লোডশেডিংয়ে—ঠান্ডা হাওয়া এখন হাতের মুঠোয়',
      titleEn: 'In traffic, in class or in a power cut — cool air in the palm of your hand',
      desc: 'সাধারণ ফ্যানের মতো বাতাস ছড়ায় না। হাই-স্পিড ব্রাশলেস মোটর আর এয়ার জেট ডাক্টে ঠান্ডা হাওয়া যায় সোজা আপনার মুখে।',
      descEn: 'It does not scatter the air like an ordinary fan — the brushless motor and air-jet duct send cool air straight to your face.',
      product: 'Xiaomi AISOLOVE F01 Handheld Turbo Fan',
      productEn: 'Xiaomi AISOLOVE F01 Handheld Turbo Fan',
      features: [
        '৫টি স্পিড লেভেল — মৃদু থেকে তীব্র টার্বো',
        '2000mAh রিচার্জেবল ব্যাটারি',
        'High-Speed Jet Air Channel',
        'Type-C চার্জ, পাওয়ার ব্যাংকেও চলে',
        'মাত্র ১২৫ গ্রাম, পকেট-সাইজ',
        'Low-Noise Brushless Motor (৩৯dB)',
      ],
      featuresEn: [
        '5 speed levels — gentle to turbo',
        '2000mAh rechargeable battery',
        'High-speed jet air channel',
        'Type-C charging, runs on a power bank too',
        'Only 125 g, pocket-sized',
        'Low-noise brushless motor (39 dB)',
      ],
      note: 'ক্লাস, লাইব্রেরি, বাস বা পড়ার টেবিল—ব্যক্তিগত স্বস্তির জন্য পারফেক্ট।',
      noteEn: 'Class, library, bus or study desk — perfect for personal comfort.',
      price: 0,
      btn: 'বিস্তারিত দেখুন',
      btnEn: 'View details',
      link: '',
      linkType: 'category',
      catId: '',
    },
  ],
};

// ── সানিটাইজ: ডিবি থেকে আসা যেকোনো অদ্ভুত ডেটা নিরাপদ টাইপে আনে ─────────────────────────
function str(v: unknown, fallback: string, max: number): string {
  if (typeof v !== 'string') return fallback;
  return v.trim().slice(0, max);
}

function strList(v: unknown, fallback: string[], maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return fallback;
  return v
    .map((x) => (typeof x === 'string' ? x.trim().slice(0, maxLen) : ''))
    .filter(Boolean)
    .slice(0, maxItems);
}

function imgUrl(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const t = v.trim();
  // শুধু https ছবি বা সাইটের নিজস্ব পাথ — javascript:/data: ইত্যাদি বাদ
  if (/^https:\/\//i.test(t) || (t.startsWith('/') && !t.startsWith('//'))) return t;
  return fallback;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeCard(raw: unknown, fb: ShowcaseCard): ShowcaseCard {
  const r = isObj(raw) ? raw : {};
  const L = SHOWCASE_LIMITS;
  return {
    img: imgUrl(r.img, fb.img) || fb.img,
    title: str(r.title, fb.title, L.cardTitle) || fb.title,
    titleEn: str(r.titleEn, fb.titleEn, L.cardTitle),
    // 🔒 সবসময় ডিফল্টের স্থায়ী id — সেভ করা ডেটা থেকে কখনো পড়া হয় না
    collectionId: fb.collectionId,
  };
}

function normalizeSpotlight(raw: unknown, fb: ShowcaseSpotlight): ShowcaseSpotlight {
  const r = isObj(raw) ? raw : {};
  const L = SHOWCASE_LIMITS;
  const linkType: SpotlightLinkType = r.linkType === 'product' ? 'product' : 'category';
  const pidNum = Number(r.productId);
  const productId = Number.isFinite(pidNum) && pidNum > 0 ? pidNum : undefined;
  const priceNum = Number(r.price);
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : fb.enabled,
    img: imgUrl(r.img, fb.img) || fb.img,
    badge: str(r.badge, fb.badge, L.badge),
    badgeEn: str(r.badgeEn, fb.badgeEn, L.badge),
    title: str(r.title, fb.title, L.title),
    titleEn: str(r.titleEn, fb.titleEn, L.title),
    desc: str(r.desc, fb.desc, L.desc),
    descEn: str(r.descEn, fb.descEn, L.desc),
    product: str(r.product, fb.product, L.product),
    productEn: str(r.productEn, fb.productEn, L.product),
    features: strList(r.features, fb.features, L.featureCount, L.feature),
    featuresEn: strList(r.featuresEn, fb.featuresEn, L.featureCount, L.feature),
    note: str(r.note, fb.note, L.note),
    noteEn: str(r.noteEn, fb.noteEn, L.note),
    price: Number.isFinite(priceNum) && priceNum > 0 ? Math.round(priceNum) : 0,
    btn: str(r.btn, fb.btn, L.spotBtn),
    btnEn: str(r.btnEn, fb.btnEn, L.spotBtn),
    link: str(r.link, '', L.link),
    // প্রোডাক্ট বেছে না থাকলে প্রোডাক্ট-লিংক অচল — ক্যাটাগরি লিংকে ফিরিয়ে দেওয়া হয়
    linkType: linkType === 'product' && productId ? 'product' : 'category',
    productId: linkType === 'product' ? productId : undefined,
    productName: linkType === 'product' && typeof r.productName === 'string' ? r.productName.slice(0, 120) : undefined,
    catId: typeof r.catId === 'string' ? r.catId.trim().slice(0, 60) : fb.catId,
  };
}

export function normalizeShowcase(raw: unknown): ShowcaseConfig {
  const d = DEFAULT_SHOWCASE;
  if (!isObj(raw)) return d;
  const L = SHOWCASE_LIMITS;
  const h = isObj(raw.heading) ? raw.heading : {};
  const cards = Array.isArray(raw.cards) ? raw.cards : [];
  const spots = Array.isArray(raw.spotlights) ? raw.spotlights : [];
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : d.enabled,
    heading: {
      lead: str(h.lead, d.heading.lead, L.headingLead),
      leadEn: str(h.leadEn, d.heading.leadEn, L.headingLead),
      hl: str(h.hl, d.heading.hl, L.headingHl),
      hlEn: str(h.hlEn, d.heading.hlEn, L.headingHl),
    },
    cards: d.cards.map((fb, i) => normalizeCard(cards[i], fb)).slice(0, SHOWCASE_CARD_COUNT),
    spotlights: d.spotlights.map((fb, i) => normalizeSpotlight(spots[i], fb)).slice(0, SHOWCASE_SPOTLIGHT_COUNT),
  };
}

export function collectionHref(collectionId: string): string {
  return `/collection/${collectionId}`;
}

const QUERY_TIMEOUT_MS = 3500;

export async function fetchShowcase(
  supabase: SupabaseClient,
  preloaded?: SettingsMap | null,
): Promise<ShowcaseConfig> {
  try {
    // preloaded (lib/storeSettingsBatch.ts) থাকলে আলাদা কোয়েরি যায় না; না থাকলে আগের মতোই
    let data: { setting_value: unknown } | null;
    let error: unknown = null;
    if (preloaded) {
      data = SHOWCASE_SETTING_KEY in preloaded ? { setting_value: preloaded[SHOWCASE_SETTING_KEY] } : null;
    } else {
      let abortSignal: AbortSignal | undefined;
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        abortSignal = AbortSignal.timeout(QUERY_TIMEOUT_MS);
      }

      const res = await supabase
        .from('store_settings')
        .select('setting_value')
        .eq('setting_key', SHOWCASE_SETTING_KEY)
        .abortSignal(abortSignal as AbortSignal)
        .maybeSingle();
      data = res.data;
      error = res.error;
    }

    if (error || !data) return DEFAULT_SHOWCASE;
    return normalizeShowcase(parseSupabaseVal<unknown>(data.setting_value));
  } catch (e) {
    logWarn('Home showcase fetch failed:', e);
    return DEFAULT_SHOWCASE;
  }
}

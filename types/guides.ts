// ফাইলের পাথ: types/guides.ts
// [NEW] প্রোগ্রামেটিক SEO "Guide Pages" সিস্টেমের সব টাইপ ডেফিনিশন।
// এখানে টাইপ পাল্টালে guide_pages টেবিলের `blocks` কলামের শেপও সেভাবেই বদলাতে হবে।

/** প্রতিটা টেক্সট ফিল্ড বাংলা ও ইংরেজি — দুটোই লাগবে, খালি রাখা যাবে না */
export interface LocalizedText {
  bn: string;
  en: string;
}

interface BaseBlock {
  /** অ্যাডমিনে drag-reorder ও React key-এর জন্য স্টেবল আইডি, যেমন 'hero-1' */
  id: string;
  /** [NEW] app/components/guides/GuideIcons.tsx-এর GUIDE_ICON_REGISTRY-তে থাকা
   *  key — BlockHeading এই আইকনটা একটা ব্র্যান্ড-কালার সার্কেলে দেখায় (raw
   *  ইমোজির বদলে, AGENTS.md নো-ইমোজি পলিসি)। guide-content-parser.ts পেস্ট
   *  করার সময় heading-এর টেক্সট দেখে অটোমেটিক বসিয়ে দেয় — না থাকলে
   *  BlockHeading ডিফল্ট 'spark' আইকন দেখায়, ভাঙে না। */
  headingIcon?: string;
}

export interface HeroBlock extends BaseBlock {
  type: 'hero';
  eyebrow?: LocalizedText;
  title: LocalizedText;
  subtitle?: LocalizedText;
  image?: { url: string; alt: LocalizedText };
}

export interface RichTextBlock extends BaseBlock {
  type: 'richText';
  heading?: LocalizedText;
  paragraphs: LocalizedText[];
}

export interface CardItem {
  /** app/components/guides/GuideIcon.tsx-এর ICON_REGISTRY-তে থাকা key, যেমন 'bedroom' | 'shop' | 'camera' */
  icon?: string;
  title: LocalizedText;
  description: LocalizedText;
  tag?: LocalizedText;
}

export interface CardGridBlock extends BaseBlock {
  type: 'cardGrid';
  heading?: LocalizedText;
  columns: 2 | 3 | 4;
  cards: CardItem[];
}

export interface PriceRow {
  label: LocalizedText;
  unit?: LocalizedText;
  /** রেঞ্জ হওয়ায় ফ্রি-টেক্সট, যেমন "৫০০ – ১,৩৫০" */
  priceRangeBdt: string;
}

export interface PriceTableBlock extends BaseBlock {
  type: 'priceTable';
  heading?: LocalizedText;
  note?: LocalizedText;
  rows: PriceRow[];
}

export interface ComparisonRow {
  /** এই সারির লেবেল, যেমন "Glow-এর ধরন" */
  label: LocalizedText;
  /** columnHeaders-এর সাথে ইনডেক্স মিলিয়ে মান — length অবশ্যই columnHeaders.length-এর সমান */
  values: LocalizedText[];
}

export interface ComparisonTableBlock extends BaseBlock {
  type: 'comparisonTable';
  heading?: LocalizedText;
  columnHeaders: LocalizedText[];
  rows: ComparisonRow[];
}

export interface StepItem {
  title: LocalizedText;
  description: LocalizedText;
  image?: { url: string; alt: LocalizedText };
  warning?: LocalizedText;
}

export interface StepsBlock extends BaseBlock {
  type: 'steps';
  heading?: LocalizedText;
  steps: StepItem[];
}

export interface ChecklistBlock extends BaseBlock {
  type: 'checklist';
  heading?: LocalizedText;
  items: LocalizedText[];
  /** [NEW] 'checkbox' — আসল "কেনার আগে Checklist"/"Quick Checklist"-জাতীয়
   *  সেকশনে ✅ আইকন-সহ দেখায়। 'plain' — "কোন কাজে কোনটা ভালো"-জাতীয় সাধারণ
   *  তথ্যমূলক বুলেট-লিস্টে (এগুলো আসলে চেক করার তালিকা না) কোনো checkbox আইকন
   *  ছাড়াই সাধারণ বুলেট হিসেবে দেখায়। guide-content-parser.ts সাবসেকশনের raw
   *  heading (### ...) দেখে এটা সেট করে — heading-এ "চেকলিস্ট/checklist" শব্দ
   *  না থাকলে 'plain'। পুরনো ডেটায় (এই ফিল্ড যোগ হওয়ার আগে সেভ করা) এই ফিল্ড
   *  না থাকলে রেন্ডারার নিজের heading-ভিত্তিক ফলব্যাক হিউরিস্টিক ব্যবহার করে —
   *  দেখুন app/components/guides/GuideBlocks.tsx-এর isChecklistHeading()। */
  style?: 'checkbox' | 'plain';
}

export interface ImageTextBlock extends BaseBlock {
  type: 'imageText';
  heading?: LocalizedText;
  paragraphs: LocalizedText[];
  image: { url: string; alt: LocalizedText };
  imageSide: 'left' | 'right';
}

export interface ProductRecommendationBlock extends BaseBlock {
  type: 'productRecommendation';
  heading?: LocalizedText;
  productId: number;
  blurb?: LocalizedText;
}

export interface FaqItem {
  question: LocalizedText;
  answer: LocalizedText;
}

export interface FaqBlock extends BaseBlock {
  type: 'faq';
  heading?: LocalizedText;
  items: FaqItem[];
}

export interface RelatedLinkItem {
  title: LocalizedText;
  /** পুরনো raw href — এখনো সাপোর্টেড (বাইরের লিংক, বা যেকোনো non-guide পেজের জন্য) */
  href?: string;
  /** নতুন, প্রেফার্ড উপায় — অন্য একটা guide_pages রো-কে সরাসরি রেফারেন্স করে।
   *  থাকলে href-এর বদলে এটাই ব্যবহার হয়, আর URL রেন্ডার-টাইমে resolve হয় (টেমপ্লেটের
   *  url_prefix + slug দিয়ে) — তাই টার্গেট পেজের slug/prefix বদলালেও লিংক ভাঙে না। */
  targetPageId?: string;
  icon?: string;
}

export interface RelatedLinksBlock extends BaseBlock {
  type: 'relatedLinks';
  heading?: LocalizedText;
  items: RelatedLinkItem[];
}

export interface GalleryItem {
  image: { url: string; alt: LocalizedText };
  caption?: LocalizedText;
  tags?: string[];
}

export interface GalleryBlock extends BaseBlock {
  type: 'gallery';
  heading?: LocalizedText;
  items: GalleryItem[];
}

export interface CtaBlock extends BaseBlock {
  type: 'cta';
  heading: LocalizedText;
  buttonLabel: LocalizedText;
  /** raw href (বাইরের লিংক/product পেজ/ইত্যাদির জন্য) — targetPageId না থাকলে এটা ব্যবহার হয় */
  href?: string;
  /** অন্য একটা guide page-কে রেফারেন্স করলে — RelatedLinkItem.targetPageId-এর মতোই আচরণ করে */
  targetPageId?: string;
}

/** নতুন ব্লক-টাইপ যোগ করতে হলে এখানে union-এ একটা লাইন যোগ করলেই GuideBlockRenderer-এ সুইচ-কেস যোগ করার আগ পর্যন্ত TS এরর দেখাবে */
export type GuideBlock =
  | HeroBlock
  | RichTextBlock
  | CardGridBlock
  | PriceTableBlock
  | ComparisonTableBlock
  | StepsBlock
  | ChecklistBlock
  | ImageTextBlock
  | ProductRecommendationBlock
  | FaqBlock
  | RelatedLinksBlock
  | GalleryBlock
  | CtaBlock;

/** guide_page_templates.key-কে রেফারেন্স করে — এখন থেকে fixed union না, কারণ নতুন
 *  টেমপ্লেট Mehediadmin-এর Template Manager দিয়ে কোডে হাত না দিয়েই যোগ করা যায় */
export type GuidePageType = string;

export interface GuidePage {
  id: string;
  page_type: GuidePageType;
  slug: string;
  category_id: string | null;
  product_id: number | null;
  meta_title_bn: string;
  meta_title_en: string;
  meta_description_bn: string;
  meta_description_en: string;
  h1_bn: string;
  h1_en: string;
  target_keywords: string[];
  blocks: GuideBlock[];
  is_published: boolean;
  published_at: string | null;
  updated_at: string;
}

/** guide_page_templates টেবিলের একটা রো — কোন page_type-এর জন্য কী ব্লক-স্কেলিটন,
 *  কোন URL prefix, category না product-ভিত্তিক — সবকিছু এখন এখান থেকে আসে,
 *  কোডে হার্ডকোড করা কিছু না। */
export interface GuidePageTemplate {
  id: string;
  key: string;
  name_bn: string;
  name_en: string;
  scope: 'category' | 'product';
  /** খালি স্ট্রিং হলে root-এ সরাসরি /[slug]; নাহলে /{url_prefix}/[slug] — কোনো
   *  ভাগাভাগি "/guides" ছাতা নেই, প্রতিটা টেমপ্লেট রুট-লেভেলে নিজস্ব namespace পায় */
  url_prefix: string;
  block_skeleton: GuideBlock[];
  is_active: boolean;
  updated_at: string;
}

/** নতুন টেমপ্লেট বানানোর সময় url_prefix হিসেবে Vangcur-এর existing top-level static
 *  route-এর নাম বসানো যাবে না — নাহলে সেই রুটের সাথে সংঘর্ষ হতে পারে। গাইড পেজগুলো
 *  এখন root-level ক্যাচ-অল দিয়ে সার্ভ হয় (কোনো ভাগাভাগি "/guides" ছাতা নেই), তাই
 *  এই লিস্টে Vangcur-এর প্রতিটা প্রকৃত top-level রুট থাকা জরুরি। নতুন static রুট
 *  যোগ হলে এই লিস্টেও যোগ করে দিতে হবে (Vangcur ও Mehediadmin দুই জায়গাতেই)। */
export const RESERVED_URL_PREFIXES = [
  'account', 'api', 'category', 'checkout', 'guide', 'guides', 'offers',
  'product', 'reset-password', 'search', 'track-order',
  'privacy-policy', 'refund-policy', 'shipping', 'terms',
];

/** guide_page_templates-এর একটা রো থেকে লাইভ URL পাথ বানানো — root-level, কোনো
 *  ভাগাভাগি "/guides" ছাতা ছাড়া। প্রতিটা টেমপ্লেট তার নিজের url_prefix দিয়ে
 *  নিজস্ব namespace পায় (pillar খালি prefix দিয়ে সরাসরি রুটে, comparison
 *  /compare-এ, ইত্যাদি) — সব জায়গায় (sitemap, breadcrumb, related-links
 *  resolution) এই একই ফাংশন ব্যবহার করা উচিত, যাতে prefix বদলালে একজায়গায়
 *  বদলালেই সব জায়গায় সঠিক থাকে। */
export function guidePageUrlPath(slug: string, urlPrefix: string): string {
  const prefix = urlPrefix.replace(/^\/|\/$/g, '');
  return prefix ? `/${prefix}/${slug}` : `/${slug}`;
}

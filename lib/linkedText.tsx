// ফাইলের পাথ: lib/linkedText.tsx
// সব SEO কনটেন্টের ভেতরে (প্রোডাক্ট Description/Features/Extra Info/FAQ,
// গাইড পেজের RichText/Checklist/CardGrid/FAQ ইত্যাদি) ৩ ধরনের ইনলাইন
// মার্কডাউন থাকতে পারে, আর যেকোনো গভীরতায় একটা আরেকটার ভেতরে বসতে পারে:
//   ১. `[লেখা](/url)`  — লিংক
//   ২. `**লেখা**`       — বোল্ড (লেখার ভেতরে পুরোটা বা আংশিক একটা লিংক থাকতে পারে)
//   ৩. `*লেখা*`         — italic (এর ভেতরেও বোল্ড/লিংক থাকতে পারে, যেমন
//                         `*(বিস্তারিত: **[গাইড →](/url)**)*`)
// renderLinkedText() এই তিনটাই — যত গভীরেই নেস্টেড হোক — একসাথে পার্স করে
// আসল React নোডে বদলে দেয়।
//
// [হার্ডেনিং, দ্বিতীয় দফা] প্রথম দফায় শুধু `**[লেখা](url)**` (বোল্ড পুরোটাই
// একটা লিংক) আলাদাভাবে বিশেষ-কেস হিসেবে ফিক্স হয়েছিল — কিন্তু `*(কিছু টেক্সট
// **[লিংক →](url)** আরও টেক্সট)*` -এর মতো "ইতালিকের ভেতরে বোল্ড-লিংক" প্যাটার্ন
// তখনও ভাঙত: বোল্ড-লিংকের জন্য যে অংশটা আলাদা করে প্রসেস হতো, সেটা ইতালিকের
// খোলা `*` আর বন্ধ `*` — এই দুটোকে দুই টুকরায় আলাদা করে ফেলত, ফলে কোনো টুকরাতেই
// পূর্ণ জোড়া না থাকায় দুটো `*`-ই raw অক্ষর হিসেবে থেকে যেত (স্ক্রিনশটে
// রিপোর্ট হওয়া "*(" আর ")*" বাগ, ঠিক এটাই)।
//
// এখন পুরো ব্যাপারটা একটা ছোট recursive-descent parser দিয়ে single-pass-এ হয়:
// বাঁ থেকে ডানে স্ক্যান করতে করতে যেখানে `[`, `**`, বা `*` পাওয়া যায়, সেখানে
// তার সঠিক জোড়া (matching close) পুরো স্ট্রিং-এর যেকোনো দূরত্বে খোঁজা হয় —
// মাঝে অন্য কোনো link/emphasis থাকলেও সেটা টপকে গিয়ে (nested হিসেবে ধরে)
// আসল জোড়াটা বের করা হয়। জোড়া পাওয়া গেলে ভেতরের অংশটুকু আবার recursively এই
// একই পার্সার দিয়ে প্রসেস হয় — তাই যেকোনো গভীরতার নেস্টিং (bold-in-italic,
// link-in-bold, ইত্যাদি) নিরাপদে কাজ করে। জোড়া না পাওয়া গেলে (ভুল/অসম্পূর্ণ
// মার্কডাউন) সেই একটা `*`/`[` অক্ষরকে নিরাপদে প্লেইন টেক্সট হিসেবে রেখে
// এগিয়ে যাওয়া হয় — কখনো ক্র্যাশ করে না, কখনো বাকি পুরো টেক্সট গিলে ফেলে না।
//
// এছাড়া AGENTS.md-এর "নো-ইমোজি পলিসি" রেন্ডার-টাইমেও একটা সেফটি-নেট হিসেবে
// জোরদার করা হয়েছে — raw pictograph/emoji অক্ষর (থাকলে, ভুলে থেকে গেলেও)
// এখান থেকে স্ট্রিপ হয়ে যায়। তীরচিহ্ন (→ ইত্যাদি, "...দেখুন →" স্টাইলের CTA-তে
// ইচ্ছাকৃতভাবে ব্যবহৃত) এই রেঞ্জের বাইরে, তাই অক্ষত থাকে।
//
// ব্যবহার: plain text-এর জায়গায় {renderLinkedText(text)} বসালেই হবে —
// উপরের কোনো সিনট্যাক্স না থাকলে আগের মতোই প্লেইন স্ট্রিং হিসেবে রেন্ডার হবে।

import Link from 'next/link';
import { sanitizeHref } from './security';

const EMOJI_PATTERN = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
// দ্রুত early-exit: লিংক/বোল্ড/ইতালিক/ইমোজি — এই ৪টার একটাও না থাকলে বাকি কোনো প্রসেসিং লাগবে না
const HAS_ANYTHING_TO_PARSE = /\]\(|\*|[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

function stripEmoji(s: string): string {
  return s.replace(EMOJI_PATTERN, '');
}

function linkClassName(bold: boolean): string {
  return bold
    ? 'font-bold text-brand-light underline decoration-brand-light/40 underline-offset-2 hover:decoration-brand-light'
    : 'font-semibold text-brand-light underline decoration-brand-light/40 underline-offset-2 hover:decoration-brand-light';
}

function makeLinkNode(label: string, href: string, bold: boolean, keyRef: { n: number }): React.ReactNode {
  const cleanLabel = stripEmoji(label);
  // 🛡️ ফিক্স (audit P2-B12): লেখা থেকে পার্স হওয়া href allow-list দিয়ে
  // যাচাই করা হচ্ছে (http/https/মেইলটু/tel + internal path ছাড়া বাকি সব `#`) —
  // বৈধ লিংকের জন্য আউটপুট অপরিবর্তিত থাকে।
  const safeHref = sanitizeHref(href);
  const isInternal = safeHref.startsWith('/');
  const className = linkClassName(bold);
  return isInternal ? (
    <Link key={keyRef.n++} href={safeHref} className={className}>
      {cleanLabel}
    </Link>
  ) : (
    <a key={keyRef.n++} href={safeHref} target="_blank" rel="noopener noreferrer" className={className}>
      {cleanLabel}
    </a>
  );
}

/** `text[i]` থেকে `[লেখা](url)` মেলে কিনা দেখে — মিললে নোড আর পরের ইনডেক্স রিটার্ন করে */
function tryMatchLink(
  text: string,
  i: number,
  bold: boolean,
  keyRef: { n: number }
): { node: React.ReactNode; next: number } | null {
  if (text[i] !== '[') return null;
  const closeBracket = text.indexOf(']', i + 1);
  if (closeBracket === -1 || text[closeBracket + 1] !== '(') return null;
  const closeParen = text.indexOf(')', closeBracket + 2);
  if (closeParen === -1) return null;
  const label = text.slice(i + 1, closeBracket);
  const href = text.slice(closeBracket + 2, closeParen);
  if (!label || !href || /\s/.test(href)) return null; // href-এ স্পেস থাকলে এটা বৈধ URL না, লিংক হিসেবে ধরব না
  return { node: makeLinkNode(label, href, bold, keyRef), next: closeParen + 1 };
}

/** `**` (বোল্ড) বা `*` (ইতালিক)-এর সঠিক বন্ধ-জোড়াটা খোঁজে, মাঝে থাকা নেস্টেড
 *  bold/italic/link টপকে গিয়ে — জোড়া না পেলে -1 রিটার্ন করে */
function findClosing(text: string, start: number, marker: '**' | '*'): number {
  let i = start;
  while (i < text.length) {
    const idx = text.indexOf('*', i);
    if (idx === -1) return -1;
    const isDouble = text[idx + 1] === '*';
    if (marker === '**') {
      if (isDouble) return idx; // ** এর বন্ধ জোড়া পাওয়া গেছে
      i = idx + 1; // একটা স্ট্রে সিঙ্গেল *, টপকে যাও
      continue;
    }
    // marker === '*' (italic) — মাঝে একটা ** (নেস্টেড বোল্ড) পড়লে সেটা টপকে যাও
    if (isDouble) {
      const nestedClose = text.indexOf('**', idx + 2);
      i = nestedClose === -1 ? idx + 2 : nestedClose + 2;
      continue;
    }
    return idx; // ইতালিকের বন্ধ জোড়া (একটা স্ট্যান্ডঅ্যালোন *)
  }
  return -1;
}

/** মূল recursive parser — text-এর ভেতরে যেকোনো গভীরতার link/bold/italic নেস্টিং পার্স করে */
function parseInline(text: string, keyRef: { n: number }, boldCtx: boolean): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let buf = '';
  let i = 0;

  const flush = () => {
    if (buf) {
      out.push(stripEmoji(buf));
      buf = '';
    }
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === '[') {
      const m = tryMatchLink(text, i, boldCtx, keyRef);
      if (m) {
        flush();
        out.push(m.node);
        i = m.next;
        continue;
      }
    }

    if (ch === '*' && text[i + 1] === '*') {
      const close = findClosing(text, i + 2, '**');
      if (close !== -1) {
        flush();
        const inner = parseInline(text.slice(i + 2, close), keyRef, true);
        // পুরো বোল্ড-অংশটাই যদি একটামাত্র লিংক হয় (যেমন `**[...](url)**`),
        // তাহলে <strong> র‍্যাপার ছাড়াই সরাসরি বোল্ড-স্টাইল লিংকটা বসে —
        // নাহলে ("**গুরুত্বপূর্ণ টেক্সট**" বা মিশ্র কনটেন্ট) স্বাভাবিক <strong>।
        if (inner.length === 1 && typeof inner[0] !== 'string') {
          out.push(inner[0]);
        } else {
          out.push(
            <strong key={keyRef.n++} className="font-bold text-ink">
              {inner}
            </strong>
          );
        }
        i = close + 2;
        continue;
      }
      // বন্ধ `**` কোথাও পাওয়া যায়নি (অসম্পূর্ণ/ভাঙা মার্কডাউন) — এই দুটো `*`-কে
      // একসাথে "একটা ইউনিট" ধরে সিঙ্গেল-স্টার ইতালিক হিসেবে আবার চেষ্টা করা
      // ঠিক না: তাহলে দ্বিতীয় `*`-টাকেই ভুলবশত প্রথমটার "বন্ধনী" ধরে ফেলা হয়
      // (দুটো মিলে একটা ফাঁকা `<em></em>` হয়ে যায়)। তার বদলে শুধু প্রথম `*`-টা
      // প্লেইন অক্ষর হিসেবে রেখে এক ধাপ এগোনো হয় — পরের ধাপে দ্বিতীয় `*`-টা
      // নিজে থেকেই নতুন করে যাচাই হবে (হয়তো সেটা কোনো italic-এর আসল শুরু)।
      buf += ch;
      i += 1;
      continue;
    }

    if (ch === '*') {
      const close = findClosing(text, i + 1, '*');
      if (close !== -1) {
        flush();
        out.push(<em key={keyRef.n++}>{parseInline(text.slice(i + 1, close), keyRef, boldCtx)}</em>);
        i = close + 1;
        continue;
      }
    }

    buf += ch;
    i += 1;
  }

  flush();
  return out;
}

export function renderLinkedText(text: string | undefined | null): React.ReactNode {
  if (!text) return text ?? '';
  if (!HAS_ANYTHING_TO_PARSE.test(text)) return text; // বেশিরভাগ লাইনেই কিছু পার্স করার থাকে না
  const keyRef = { n: 0 };
  return parseInline(text, keyRef, false);
}

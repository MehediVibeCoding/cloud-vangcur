export interface WarrantyModalContent {
  title: string;
  body: string;
  rules: string[];
}

// ══════════════════════════════════════════════════════════════
//  ওয়ারেন্টি টেক্সট পার্সিং ও ভাষা-অনুযায়ী লেবেল
//  এডমিন থেকে ওয়ারেন্টি যেভাবেই আসুক (বাংলা/ইংরেজি, বাংলা বা ইংরেজি সংখ্যা,
//  "৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি", "6 Months Replacement Warranty",
//  "৫ দিন", "5 days replacement warranty" ইত্যাদি) — মেয়াদ + একক বের করে
//  সাইটের বর্তমান ভাষায় সঠিক লেবেল বানানো হয়। খালি হলে কিছুই দেখানো হয় না।
// ══════════════════════════════════════════════════════════════

export type WarrantyLang = 'bn' | 'en';
type WarrantyUnit = 'day' | 'month' | 'year';
type WarrantyKind = 'replacement' | 'official' | 'service' | 'plain';

export interface ParsedWarranty {
  amount: number;
  unit: WarrantyUnit;
  kind: WarrantyKind;
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

function toEnDigits(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

// বাংলা অঙ্ক → ইংরেজি অঙ্ক। ওয়ারেন্টি মডালের বাংলা টেক্সটে (যেকোনো সংখ্যা/মেয়াদের জন্য) ইংরেজি
// অঙ্ক দেখানোর একটাই জায়গা — আগে মডালে শুধু ৪টা নির্দিষ্ট মেয়াদের জন্য আলাদা আলাদা regex ছিল।
export function toEnglishDigits(s: string): string {
  return toEnDigits(s);
}

function toBnDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

const WORD_NUMBERS: Record<string, number> = {
  এক: 1, দুই: 2, তিন: 3, চার: 4, পাঁচ: 5, ছয়: 6, সাত: 7, আট: 8, নয়: 9, দশ: 10,
  এগারো: 11, বারো: 12, পনেরো: 15, ত্রিশ: 30,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12,
};

// লম্বা রূপ আগে — যাতে "দিনের" আগে "দিন" মিলে না যায়
const UNIT_RE =
  '(days?|দিনের|দিন|weeks?|wks?|সপ্তাহের|সপ্তাহে|সপ্তাহ|months?|mos?|মাসের|মাস|years?|yrs?|বছরের|বছর)';

export function hasWarranty(text?: string | null): boolean {
  return typeof text === 'string' && text.trim().length > 0;
}

export function parseWarranty(text?: string | null): ParsedWarranty | null {
  if (!hasWarranty(text)) return null;
  const s = toEnDigits((text as string).trim()).toLowerCase();

  let amount: number | null = null;
  let unitWord = '';

  // ⚠️ iOS 15 / Safari <16.4 রেজেক্স lookbehind (?<!...) সাপোর্ট করে না — লিটারেল থাকলে
  // পুরো প্রোডাক্ট পেজের JS chunk লোড-ই হয় না। তাই (^|[^...]) প্রিফিক্স গ্রুপ ব্যবহার
  // করা হয়েছে (একই অর্থ); ফলে সংখ্যা/ইউনিট গ্রুপ ২ ও ৩।
  let m = s.match(new RegExp('(^|[^\\d.])(\\d+(?:\\.\\d+)?)\\s*' + UNIT_RE));
  if (m) {
    amount = parseFloat(m[2]);
    unitWord = m[3];
  } else {
    const keys = Object.keys(WORD_NUMBERS).join('|');
    m = s.match(new RegExp('(^|[^a-z])(' + keys + ')\\s*' + UNIT_RE));
    if (m) {
      amount = WORD_NUMBERS[m[2]];
      unitWord = m[3];
    } else {
      m = s.match(/(^|[^\d.])(\d+)(m|y)(?![a-z])/);
      if (m) {
        amount = Number(m[2]);
        unitWord = m[3] === 'm' ? 'month' : 'year';
      }
    }
  }
  if (amount === null || !Number.isFinite(amount) || amount <= 0) return null;

  let unit: WarrantyUnit;
  if (/^(d|দিন)/.test(unitWord)) unit = 'day';
  else if (/^(w|সপ্তাহ)/.test(unitWord)) {
    unit = 'day';
    amount = amount * 7; // সপ্তাহ → দিন
  } else if (/^(m|মাস)/.test(unitWord)) unit = 'month';
  else unit = 'year';

  // সমতুল্য মেয়াদ এক রূপে আনা
  if (unit === 'day' && amount === 180) { unit = 'month'; amount = 6; }
  else if (unit === 'day' && amount === 365) { unit = 'year'; amount = 1; }
  else if (unit === 'day' && amount === 730) { unit = 'year'; amount = 2; }
  else if (unit === 'month' && amount >= 12 && amount % 12 === 0) { unit = 'year'; amount = amount / 12; }

  let kind: WarrantyKind = 'plain';
  if (/official|অফিসিয়াল/.test(s)) kind = 'official';
  else if (/service|সার্ভিস/.test(s)) kind = 'service';
  else if (/replace|রিপ্লেস/.test(s)) kind = 'replacement';

  return { amount, unit, kind };
}

// সাইটের বর্তমান ভাষা অনুযায়ী ওয়ারেন্টির লেবেল। খালি হলে '' ফেরত দেয়।
// মেয়াদ বোঝা না গেলে (যেমন "Lifetime") লেখাটা হুবহু ফেরত দেয়।
export function formatWarrantyLabel(text: string | null | undefined, lang: WarrantyLang): string {
  if (!hasWarranty(text)) return '';
  const raw = (text as string).trim();
  const p = parseWarranty(raw);
  if (!p) return raw;

  const num = String(p.amount);
  if (lang === 'en') {
    const unitEn =
      p.unit === 'day' ? (p.amount === 1 ? 'Day' : 'Days')
      : p.unit === 'month' ? (p.amount === 1 ? 'Month' : 'Months')
      : 'Year';
    const suffix =
      p.kind === 'replacement' ? 'Replacement Warranty'
      : p.kind === 'official' ? 'Official Warranty'
      : p.kind === 'service' ? 'Service Warranty'
      : 'Warranty';
    return `${num} ${unitEn} ${suffix}`;
  }
  const unitBn = p.unit === 'day' ? 'দিনের' : p.unit === 'month' ? 'মাসের' : 'বছরের';
  const suffixBn =
    p.kind === 'replacement' ? 'রিপ্লেসমেন্ট ওয়ারেন্টি'
    : p.kind === 'official' ? 'অফিসিয়াল ওয়ারেন্টি'
    : p.kind === 'service' ? 'সার্ভিস ওয়ারেন্টি'
    : 'ওয়ারেন্টি';
  return `${toBnDigits(num)} ${unitBn} ${suffixBn}`;
}

function tierOf(p: ParsedWarranty | null): '7d' | '6m' | '1y' | '2y' | null {
  if (!p) return null;
  if (p.unit === 'day' && p.amount === 7) return '7d';
  if (p.unit === 'month' && p.amount === 6) return '6m';
  if (p.unit === 'year' && p.amount === 1) return '1y';
  if (p.unit === 'year' && p.amount === 2) return '2y';
  return null;
}

export function getWarrantyModalContent(warrantyText?: string, lang: WarrantyLang = 'bn'): WarrantyModalContent {
  const parsed = parseWarranty(warrantyText);
  let tier = tierOf(parsed);
  // ৭ দিন / ৬ মাসের তৈরি টেক্সটে শুধু "ফ্রি রিপ্লেসমেন্ট" বলা আছে — সার্ভিস বা অফিসিয়াল
  // ওয়ারেন্টির বেলায় সেটা ভুল তথ্য দেবে, তাই এই দুই ক্ষেত্রে জেনেরিক (ধরন-অনুযায়ী) টেক্সটে যাওয়া হবে।
  if ((tier === '7d' || tier === '6m') && parsed && (parsed.kind === 'service' || parsed.kind === 'official')) {
    tier = null;
  }
  const kind: WarrantyKind = parsed ? parsed.kind : 'plain';

  if (lang === 'en') {
    const rules = [
      'An uncut unboxing video must be shown as proof.',
      'The original box and invoice paper must be returned intact.',
      'Physical or water damage is not covered.',
    ];
    if (tier === '7d') {
      return {
        title: '1 Week (7 Days) Replacement Warranty Policy',
        body: 'Within 7 days from the order date, you get a free replacement for manufacturer defects or technical issues.',
        rules,
      };
    }
    if (tier === '6m') {
      return {
        title: '6 Months Replacement Warranty Policy',
        body: 'For 180 days (6 months) from the order date, you get a free replacement for internal technical issues or manufacturer defects.',
        rules,
      };
    }
    if (tier === '1y') {
      return {
        title: '1 Year (12 Months) Warranty Policy',
        body: 'For 1 year (365 days) from the order date, you get a free replacement, or the brand\'s free service warranty, for manufacturer defects or hardware issues.',
        rules,
      };
    }
    if (tier === '2y') {
      return {
        title: '2 Year (24 Months) Warranty Policy',
        body: 'For 2 years (24 months) from the order date, you get a free replacement, or the brand\'s official free service warranty, for any hardware defect.',
        rules,
      };
    }
    if (parsed) {
      const bodyEn =
        kind === 'service'
          ? 'From the order date, manufacturer defects or technical issues are resolved through the brand\'s free service for the stated warranty period.'
          : kind === 'official'
            ? 'From the order date, you are covered by the brand\'s official warranty (free replacement or free service, as applicable) for manufacturer defects or technical issues during the stated warranty period.'
            : 'From the order date, you are covered for manufacturer defects or technical issues for the stated warranty period.';
      return {
        title: `${formatWarrantyLabel(warrantyText, 'en')} Policy`,
        body: bodyEn,
        rules,
      };
    }
    return {
      title: 'Vangcur Standard Warranty Policy',
      body: 'This product is sold under Vangcur\'s standard quality-control process. For the exact warranty period and terms, please check the product box or contact our customer support.',
      rules: [
        'We recommend keeping an unboxing video.',
        'Keep the invoice paper and the original box.',
        'Contact us if you face any problem.',
      ],
    };
  }

  if (tier === '7d') {
    return {
      title: '৭ দিন (১ সপ্তাহ) রিপ্লেসমেন্ট ওয়ারেন্টি পলিসি',
      body: 'প্রোডাক্টটি অর্ডার করার দিন থেকে পরবর্তী ৭ দিনের মধ্যে প্রস্তুতকারক ত্রুটি বা টেকনিক্যাল সমস্যার জন্য ফ্রিতে রিপ্লেসমেন্ট পাবেন।',
      rules: [
        'আন-কাট আনবক্সিং ভিডিও প্রমাণ হিসেবে প্রদর্শন করতে হবে।',
        'মূল বক্স ও ইনভয়েস পেপার অক্ষত ফেরত দিতে হবে।',
        'ফিজিক্যাল বা ওয়াটার ড্যামেজ গ্রহণযোগ্য নয়।',
      ],
    };
  }
  if (tier === '6m') {
    return {
      title: '৬ মাস রিপ্লেসমেন্ট ওয়ারেন্টি পলিসি',
      body: 'প্রোডাক্টটি অর্ডার করার দিন থেকে পরবর্তী ১৮০ দিন (৬ মাস) পর্যন্ত অভ্যন্তরীণ টেকনিক্যাল সমস্যা বা প্রস্তুতকারক ত্রুটির জন্য ফ্রিতে রিপ্লেসমেন্ট পাবেন।',
      rules: [
        'কুরিয়ার থেকে পার্সেল বুঝে নেওয়ার সময়ের আন-কাট আনবক্সিং ভিডিও দেখাতে হবে।',
        'ক্লেইমের সময় প্রোডাক্টের অরিজিনাল বক্স, ইনভয়েস পেপার এবং এক্সেসরিজ ফেরত দিতে হবে।',
        'পুড়ে যাওয়া বা ওয়াটার ড্যামেজ গ্রহণযোগ্য নয়।',
      ],
    };
  }
  if (tier === '1y') {
    return {
      title: '১ বছর (১২ মাস) ওয়ারেন্টি পলিসি',
      body: 'প্রোডাক্টটি অর্ডার করার দিন থেকে পরবর্তী ১ বছর (৩৬৫ দিন) পর্যন্ত প্রস্তুতকারক ত্রুটি বা হার্ডওয়্যারজনিত সমস্যার জন্য কাস্টমার ফ্রি রিপ্লেসমেন্ট অথবা ব্র্যান্ডের ফ্রি সার্ভিস ওয়ারেন্টি সুবিধা পাবেন।',
      rules: [
        'প্রথমবার বক্স খোলার সময়ের আন-কাট আনবক্সিং ভিডিও সংরক্ষণ ও প্রদর্শন করতে হবে।',
        'ইনভয়েস পেপার ও সিরিয়াল নম্বর সহ মূল বক্স জমা দিতে হবে।',
        'ফিজিক্যাল ড্যামেজ বা সফটওয়্যার মডিফিকেশন গ্রহণযোগ্য নয়।',
      ],
    };
  }
  if (tier === '2y') {
    return {
      title: '২ বছর (২৪ মাস) ওয়ারেন্টি পলিসি',
      body: 'প্রোডাক্টটি অর্ডার করার দিন থেকে পরবর্তী ২ বছর (২৪ মাস) পর্যন্ত যেকোনো প্রকার হার্ডওয়্যার ত্রুটির জন্য কাস্টমার ফ্রি রিপ্লেসমেন্ট অথবা ব্র্যান্ডের অফিসিয়াল ফ্রি সার্ভিস ওয়ারেন্টি সুবিধা পাবেন।',
      rules: [
        'পার্সেল বুঝে নেওয়ার সময়ের আন-কাট আনবক্সিং ভিডিও প্রমাণ হিসেবে আবশ্যক।',
        'অরিজিনাল ইনভয়েস পেপার, বক্স এবং ওয়ারেন্টি কার্ড ক্লেইমের সময় জমা দিতে হবে।',
        'ফিজিক্যাল বা লিকুইড ড্যামেজ গ্রহণযোগ্য নয়।',
      ],
    };
  }
  if (parsed) {
    const bodyBn =
      kind === 'service'
        ? 'প্রোডাক্টটি অর্ডার করার দিন থেকে নির্ধারিত মেয়াদের মধ্যে প্রস্তুতকারক ত্রুটি বা টেকনিক্যাল সমস্যা দেখা দিলে ব্র্যান্ডের ফ্রি সার্ভিসের মাধ্যমে সমাধান পাবেন।'
        : kind === 'official'
          ? 'প্রোডাক্টটি অর্ডার করার দিন থেকে নির্ধারিত মেয়াদের মধ্যে প্রস্তুতকারক ত্রুটি বা টেকনিক্যাল সমস্যার জন্য ব্র্যান্ডের অফিসিয়াল ওয়ারেন্টি (প্রযোজ্য হিসেবে ফ্রি রিপ্লেসমেন্ট বা ফ্রি সার্ভিস) সুবিধা পাবেন।'
          : 'প্রোডাক্টটি অর্ডার করার দিন থেকে নির্ধারিত মেয়াদের মধ্যে প্রস্তুতকারক ত্রুটি বা টেকনিক্যাল সমস্যার জন্য ওয়ারেন্টি সুবিধা পাবেন।';
    return {
      title: `${formatWarrantyLabel(warrantyText, 'bn')} পলিসি`,
      body: bodyBn,
      rules: [
        'আনবক্সিং ভিডিও প্রমাণ হিসেবে দেখাতে হবে।',
        'মূল বক্স ও ইনভয়েস পেপার অক্ষত ফেরত দিতে হবে।',
        'ফিজিক্যাল বা ওয়াটার ড্যামেজ গ্রহণযোগ্য নয়।',
      ],
    };
  }
  return {
    title: 'Vangcur স্ট্যান্ডার্ড ওয়ারেন্টি পলিসি',
    body: 'এই প্রোডাক্টটি Vangcur-এর স্ট্যান্ডার্ড মান নিয়ন্ত্রণ প্রক্রিয়ার অধীনে বিক্রয় করা হয়েছে। নির্দিষ্ট ওয়ারেন্টির মেয়াদ ও শর্তাবলির জন্য পণ্যের বক্স অথবা আমাদের কাস্টমার সাপোর্টে যোগাযোগ করুন।',
    rules: [
      'আনবক্সিং ভিডিও রাখার পরামর্শ দেওয়া হচ্ছে।',
      'ইনভয়েস পেপার ও মূল বক্স সংরক্ষণ করুন।',
      'সমস্যার জন্য আমাদের সাথে যোগাযোগ করুন।',
    ],
  };
}

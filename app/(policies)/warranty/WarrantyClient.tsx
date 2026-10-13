'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n/useT';
import {
  PolicyHeader,
  PolicySection,
  PolicyNote,
  PolicyBulletPoint,
  policyPClass,
  policyUlClass,
  policySubheadingClass,
} from '../PolicyContent';

const iconProps = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function ShieldCheckMarkIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CalendarClockIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CrossCircleIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function WorkflowStepsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

function RefreshExchangeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

const linkClass = 'font-bold text-brand-light hover:underline';

export default function WarrantyClient() {
  const { lang } = useT();
  const en = lang === 'en';

  return (
    <>
      <PolicyHeader
        icon={<ShieldCheckMarkIcon />}
        title={en ? 'Warranty Policy' : 'ওয়ারেন্টি নীতিমালা'}
        subtitle={en ? 'Replacement & service warranty coverage' : 'রিপ্লেসমেন্ট ও সার্ভিস ওয়ারেন্টি কভারেজ'}
        updated={en ? 'October 2026' : 'অক্টোবর ২০২৬'}
      />

      <PolicySection
        icon={<ShieldCheckMarkIcon />}
        title={en ? '1. Warranty Types & Duration' : '১. ওয়ারেন্টির ধরন ও মেয়াদ'}
      >
        <p className={policyPClass}>
          {en
            ? 'The warranty of each product is shown in the warranty section of its product page, below the price and stock. The following warranty types are offered by Vangcur:'
            : 'প্রতিটি পণ্যের ওয়ারেন্টি সেই পণ্যের পেজে মূল্য ও স্টকের নিচে ওয়ারেন্টি অংশে লেখা থাকে। Vangcur-এ নিচের ধরনের ওয়ারেন্টি দেওয়া হয়:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {en
              ? '7-Day Replacement Warranty (standard products): within 7 days, manufacturing defects or technical issues are replaced free of charge.'
              : '৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি (সাধারণ পণ্য): ৭ দিনের মধ্যে প্রস্তুতকারক ত্রুটি বা টেকনিক্যাল সমস্যা দেখা দিলে ফ্রিতে রিপ্লেসমেন্ট।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? '6-Month (180 days) Replacement Warranty (selected products): free replacement for internal technical issues or manufacturer defects.'
              : '৬ মাস (১৮০ দিন) রিপ্লেসমেন্ট ওয়ারেন্টি (নির্বাচিত পণ্য): অভ্যন্তরীণ টেকনিক্যাল সমস্যা বা প্রস্তুতকারক ত্রুটিতে ফ্রিতে রিপ্লেসমেন্ট।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? '1-Year (365 days) Warranty (selected products): free replacement, or the brand’s free service warranty, for manufacturer defects or hardware issues.'
              : '১ বছর (৩৬৫ দিন) ওয়ারেন্টি (নির্বাচিত পণ্য): প্রস্তুতকারক ত্রুটি বা হার্ডওয়্যারজনিত সমস্যায় ফ্রি রিপ্লেসমেন্ট অথবা ব্র্যান্ডের ফ্রি সার্ভিস ওয়ারেন্টি।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? '2-Year (24 months) Warranty (selected products): free replacement, or the brand’s official free service warranty, for any hardware defect.'
              : '২ বছর (২৪ মাস) ওয়ারেন্টি (নির্বাচিত পণ্য): যেকোনো হার্ডওয়্যার ত্রুটিতে ফ্রি রিপ্লেসমেন্ট অথবা ব্র্যান্ডের অফিসিয়াল ফ্রি সার্ভিস ওয়ারেন্টি।'}
          </PolicyBulletPoint>
        </ul>
        <PolicyNote type="info">
          {en
            ? 'The warranty type and duration that apply to you are the ones written on the product page at the time of your order.'
            : 'অর্ডারের সময় পণ্যের পেজে যে ওয়ারেন্টির ধরন ও মেয়াদ লেখা থাকে, সেটাই আপনার ক্ষেত্রে প্রযোজ্য হবে।'}
        </PolicyNote>
      </PolicySection>

      <PolicySection
        icon={<CalendarClockIcon />}
        title={en ? '2. When Does the Warranty Start?' : '২. ওয়ারেন্টির মেয়াদ কবে থেকে শুরু হয়'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {en
              ? 'The warranty period is counted from the date you place the order.'
              : 'ওয়ারেন্টির মেয়াদ আপনার অর্ডার করার দিন থেকে গণনা শুরু হয়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? 'The time taken for delivery is included within the warranty period.'
              : 'পার্সেল ডেলিভারিতে যে সময় লাগে, সেটাও ওয়ারেন্টির মেয়াদের মধ্যেই ধরা হয়।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<CheckCircleIcon />}
        title={en ? '3. What Is Covered' : '৩. যা কভার করা হয়'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {en
              ? 'Manufacturing defects and internal technical problems where the product does not work normally.'
              : 'ম্যানুফ্যাকচারিং ত্রুটি এবং অভ্যন্তরীণ টেকনিক্যাল সমস্যা, যার কারণে পণ্য স্বাভাবিকভাবে কাজ করে না।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? 'Verified transit damage and wrong products, handled as a free replacement under our Refund & Replacement Policy.'
              : 'যাচাইকৃত পরিবহনকালীন ক্ষতি এবং ভুল পণ্য, যা আমাদের রিফান্ড ও রিপ্লেসমেন্ট নীতিমালা অনুযায়ী ফ্রি রিপ্লেসমেন্টের আওতায় পড়ে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? 'Every approved replacement is sent at Vangcur’s expense, with no extra delivery charge.'
              : 'অনুমোদিত প্রতিটি রিপ্লেসমেন্ট Vangcur-এর নিজ খরচে, কোনো বাড়তি ডেলিভারি চার্জ ছাড়া পাঠানো হয়।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<CrossCircleIcon />}
        title={en ? '4. What Is Not Covered' : '৪. যা কভার করা হয় না'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {en
              ? 'Physical breakage, including damage from accidental drops.'
              : 'হাত থেকে পড়ে ভাঙা-সহ যেকোনো ফিজিক্যাল ড্যামেজ।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? 'Burn marks and damage from high-voltage short circuits.'
              : 'পোড়া দাগ এবং উচ্চ ভোল্টেজের শর্টসার্কিটজনিত ক্ষতি।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en ? 'Water or liquid damage.' : 'ওয়াটার বা লিকুইড ড্যামেজ।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? 'Products that have been serviced or modified (including software modification) without authorization.'
              : 'অনুমতি ছাড়া সার্ভিসিং বা মডিফিকেশন (সফটওয়্যার মডিফিকেশনসহ) করা পণ্য।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<ChecklistIcon />}
        title={en ? '5. What You Need to File a Claim' : '৫. ক্লেইম করতে যা আবশ্যক'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {en
              ? 'A continuous, uncut unboxing video, starting from the sealed courier packet.'
              : 'কুরিয়ারের সিলযুক্ত প্যাকেট থেকে শুরু করে একটানা, কাট ছাড়া আনবক্সিং ভিডিও।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? 'The original, intact product box (damaged, taped or torn boxes are not accepted).'
              : 'অরিজিনাল ও অক্ষত প্রোডাক্ট বক্স (ছেঁড়া, ফাটা বা টেপ লাগানো বক্স গ্রহণযোগ্য নয়)।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? 'The original official invoice paper that came inside the parcel (downloaded or digital copies are not accepted).'
              : 'পার্সেলের ভেতরে থাকা আসল অফিসিয়াল ইনভয়েস পেপার (ডাউনলোড করা বা ডিজিটাল কপি গ্রহণযোগ্য নয়)।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? 'All cables, accessories and instructions that came in the box.'
              : 'বক্সের ভেতরের সব ক্যাবল, এক্সেসরিজ ও নির্দেশিকা।'}
          </PolicyBulletPoint>
        </ul>

        <div className={policySubheadingClass}>
          {en ? 'Extra requirements for longer warranties:' : 'দীর্ঘ মেয়াদের ওয়ারেন্টিতে অতিরিক্ত যা লাগবে:'}
        </div>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {en
              ? '1-Year warranty: the box with the serial number must be submitted.'
              : '১ বছরের ওয়ারেন্টি: সিরিয়াল নম্বরসহ মূল বক্স জমা দিতে হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? '2-Year warranty: the warranty card must be submitted along with the box and invoice.'
              : '২ বছরের ওয়ারেন্টি: বক্স ও ইনভয়েসের সাথে ওয়ারেন্টি কার্ড জমা দিতে হবে।'}
          </PolicyBulletPoint>
        </ul>

        <PolicyNote>
          {en
            ? 'Without continuous unboxing video proof, no warranty or replacement claim can be accepted.'
            : 'একটানা আনবক্সিং ভিডিও প্রমাণ ছাড়া কোনো ওয়ারেন্টি বা রিপ্লেসমেন্ট ক্লেইম গ্রহণযোগ্য হবে না।'}
        </PolicyNote>
      </PolicySection>

      <PolicySection
        icon={<WorkflowStepsIcon />}
        title={en ? '6. How to Claim Your Warranty' : '৬. ওয়ারেন্টি ক্লেইম করার নিয়ম'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {en
              ? 'Step 1: As soon as you notice a problem, message our official WhatsApp Support (01897-804055). For a broken, damaged or wrong product, reporting within 24 to 48 hours of receiving the parcel is best. If a problem appears later, you can still report it within the warranty period, and the sooner you report, the sooner we can resolve it.'
              : 'ধাপ ১: সমস্যা ধরা পড়ার সাথে সাথে আমাদের অফিসিয়াল WhatsApp সাপোর্টে (01897-804055) মেসেজ দিন। ভাঙা, ক্ষতিগ্রস্ত বা ভুল পণ্য এলে পার্সেল পাওয়ার ২৪ থেকে ৪৮ ঘণ্টার মধ্যে জানানো সবচেয়ে ভালো। পরে সমস্যা দেখা দিলেও ওয়ারেন্টির মেয়াদের মধ্যে জানাতে পারবেন, আর যত দ্রুত জানাবেন সমাধানও তত দ্রুত হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? 'Step 2: Send your order number, a short description of the problem and the unboxing video.'
              : 'ধাপ ২: আপনার অর্ডার নম্বর, সমস্যার সংক্ষিপ্ত বিবরণ এবং আনবক্সিং ভিডিও পাঠান।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {en
              ? 'Step 3: Our team verifies the video and the claim. For an approved replacement, the new product is booked to your address within 24 hours of verification, free of charge. Where a service warranty applies, we guide you through the brand’s free service process.'
              : 'ধাপ ৩: আমাদের টিম ভিডিও ও ক্লেইম যাচাই করবে। রিপ্লেসমেন্ট অনুমোদন হলে যাচাইয়ের ২৪ ঘণ্টার মধ্যে সম্পূর্ণ ফ্রিতে আপনার ঠিকানায় নতুন পণ্য বুক করা হবে। সার্ভিস ওয়ারেন্টি প্রযোজ্য হলে ব্র্যান্ডের ফ্রি সার্ভিসের প্রক্রিয়া আমরা জানিয়ে দেব।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<RefreshExchangeIcon />}
        title={en ? '7. Warranty vs. Return & Refund' : '৭. ওয়ারেন্টি এবং রিটার্ন ও রিফান্ডের পার্থক্য'}
      >
        <p className={policyPClass}>
          {en ? (
            <>
              Warranty covers genuine defects and is solved by a replacement or service. If the product has no defect, returns and refunds are not available for personal preference or a change of mind. Read the full rules on our{' '}
              <Link href="/refund-policy" className={linkClass}>Returns &amp; Refunds</Link> page.
            </>
          ) : (
            <>
              ওয়ারেন্টি শুধু প্রকৃত ত্রুটির জন্য, আর তার সমাধান হয় রিপ্লেসমেন্ট বা সার্ভিসের মাধ্যমে। পণ্যে কোনো ত্রুটি না থাকলে শুধু পছন্দ না হওয়া বা মন পরিবর্তনের কারণে রিটার্ন বা রিফান্ড হয় না। পূর্ণ নিয়ম দেখুন আমাদের{' '}
              <Link href="/refund-policy" className={linkClass}>রিটার্ন ও রিফান্ড নীতিমালা</Link> পেজে।
            </>
          )}
        </p>
      </PolicySection>

      <div className="mb-6 rounded-[14px] border border-border-base bg-white/60 p-4 text-center font-body text-[12px] text-muted">
        {en ? (
          <>
            This warranty policy applies together with our{' '}
            <Link href="/terms" className={linkClass}>Terms &amp; Conditions</Link>. Vangcur may update it from time to time.
          </>
        ) : (
          <>
            এই ওয়ারেন্টি নীতিমালা আমাদের{' '}
            <Link href="/terms" className={linkClass}>শর্তাবলী</Link>-র সাথে একত্রে প্রযোজ্য। ভাঙচুর কর্তৃপক্ষ প্রয়োজনে এটি হালনাগাদ করতে পারে।
          </>
        )}
      </div>
    </>
  );
}

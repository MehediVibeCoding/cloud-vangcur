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
} from '../PolicyContent';

function TruckShippingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function ClockTimeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PaymentVerifyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function BoxPackageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function RadarTrackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <path d="M12 6a6 6 0 0 1 6 6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function VideoShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect x="8" y="9" width="8" height="6" rx="1" />
      <polyline points="16 11 18 9 18 15 16 13" />
    </svg>
  );
}

function BulkWhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export default function ShippingClient() {
  const { lang } = useT();

  return (
    <>
      <PolicyHeader
        icon={<TruckShippingIcon />}
        title="অর্ডার ও শিপিং তথ্য (Order & Shipping Policy)"
        subtitle="ডেলিভারি কভারেজ, সময়সীমা ও অর্ডার প্রসেসিং নির্দেশিকা"
        updated="আগস্ট ২০২৬"
      />

      <PolicySection
        icon={<PaymentVerifyIcon />}
        title={lang === 'en' ? '1. Order Confirmation & Payment Verification' : '১. অর্ডার নিশ্চিতকরণ ও পেমেন্ট ভেরিফিকেশন'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'To ensure legitimate orders and protect against fake bookings or fraudulent parcel returns, Vangcur verifies orders through a secure advance payment model:'
            : 'অর্ডার নিশ্চিত করতে এবং ফেক বুকিং ও কুরিয়ার রিটার্নজনিত লোকসান রোধে Vangcur অগ্রিম ভেরিফিকেশন পদ্ধতিতে অর্ডার গ্রহণ করে:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Orders below ৳4,000: A nominal advance of ৳200 is verified via bKash Send Money to confirm customer intent.'
              : '৪,০০০ টাকার নিচে অর্ডার: ফিক্সড ২০০ টাকা বিকাশ সেন্ড মানির মাধ্যমে অগ্রিম যাচাই করে অর্ডার কনফার্ম করা হয়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Orders ৳4,000 – ৳20,000: A 5% advance on the total bill (including delivery charge) is required.'
              : '৪,০০০ থেকে ২০,০০০ টাকার অর্ডার: ডেলিভারি চার্জসহ মোট বিলের ৫% অগ্রিম পরিশোধ করতে হয়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Remaining Balance: The entire remaining balance is payable strictly via Cash on Delivery (COD) to the delivery agent upon receiving the package.'
              : 'বাকি বিল (Cash on Delivery): অগ্রিম বাদে বাকি টাকা পার্সেল হাতে পাওয়ার পর ডেলিভারিম্যানকে পরিশোধ করতে হবে।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<ClockTimeIcon />}
        title={lang === 'en' ? '2. Delivery Coverage & Timelines' : '২. ডেলিভারি এলাকা ও সময়সীমা'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'We deliver across all 64 districts in Bangladesh in direct partnership with Pathao Courier. Orders are securely packed and dispatched from our central hub within 24 business hours of payment verification.'
            : 'পাঠাও কুরিয়ারের সাথে সরাসরি অংশীদারিত্বে আমরা সমগ্র বাংলাদেশের ৬৪টি জেলাতেই হোম ডেলিভারি সেবা প্রদান করি। পেমেন্ট যাচাইয়ের ২৪ কার্যঘণ্টার মধ্যে আমাদের হাব থেকে পার্সেল কুরিয়ারে হস্তান্তর করা হয়।'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
          <div className="rounded-[14px] border border-border-base bg-white/90 p-4 shadow-xs">
            <div className="font-body text-[13px] font-extrabold text-brand-light">
              {lang === 'en' ? 'Inside Dhaka City Corporation' : 'ঢাকা সিটি কর্পোরেশনের ভেতরে'}
            </div>
            <div className="mt-1 font-body text-xs text-ink/85 leading-relaxed">
              <strong>{lang === 'en' ? 'Timeline: ' : 'সময়সীমা: '}</strong>
              {lang === 'en' ? '1 – 2 Business Days' : '১ – ২ কার্যদিবস'}
              <br />
              <strong>{lang === 'en' ? 'Shipping Charge: ' : 'ডেলিভারি চার্জ: '}</strong>
              {lang === 'en' ? '৳70 BDT' : '৭০ টাকা'}
            </div>
          </div>

          <div className="rounded-[14px] border border-border-base bg-white/90 p-4 shadow-xs">
            <div className="font-body text-[13px] font-extrabold text-brand-light">
              {lang === 'en' ? 'Outside Dhaka / All Bangladesh' : 'ঢাকা সিটির বাইরে / সারা বাংলাদেশ'}
            </div>
            <div className="mt-1 font-body text-xs text-ink/85 leading-relaxed">
              <strong>{lang === 'en' ? 'Timeline: ' : 'সময়সীমা: '}</strong>
              {lang === 'en' ? '2 – 4 Business Days' : '২ – ৪ কার্যদিবস'}
              <br />
              <strong>{lang === 'en' ? 'Shipping Charge: ' : 'ডেলিভারি চার্জ: '}</strong>
              {lang === 'en' ? '৳120 BDT' : '১২০ টাকা'}
            </div>
          </div>
        </div>

        <PolicyNote type="info">
          {lang === 'en'
            ? 'Promotional Deals: Shipping charges may be completely waived (FREE Shipping) during promotional coupon campaigns or through VIP Membership rewards.'
            : 'ফ্রি ডেলিভারি সুবিধা: প্রোমোশনাল কুপন কোড ব্যবহার কিংবা মেম্বারশিপ রিওয়ার্ড অর্জনের মাধ্যমে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি হতে পারে।'}
        </PolicyNote>
      </PolicySection>

      <PolicySection
        icon={<BoxPackageIcon />}
        title={lang === 'en' ? '3. Closed-Box Delivery Protocol' : '৩. ক্লোজড-বক্স ডেলিভারি মেথড'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'All fragile tech gadgets and lifestyle products are packed in tamper-proof secure boxes and handled through closed-box logistics:'
            : 'সকল গ্যাজেট ও লাইফস্টাইল পণ্য সুরক্ষিতভাবে বাবল র‍্যাপ ও সিলযুক্ত বক্সে ক্লোজড-বক্স পদ্ধতিতে সরবরাহ করা হয়:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Customers must pay the remaining COD amount to the delivery person before accepting the parcel and signing the receipt.'
              : 'কুরিয়ার নিয়মানুযায়ী ডেলিভারিম্যানকে অবশিষ্ট ক্যাশ অন ডেলিভারি টাকা পরিশোধ করে পার্সেল বুঝে নিতে হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'No on-the-spot personal returns: Couriers are independent delivery partners and cannot accept returns on the spot for subjective dislike. Any genuine issue is handled through our free replacement policy.'
              : 'অন-দ্য-স্পট রিটার্ন নেই: কুরিয়ার কর্মীরা কেবল পার্সেল ডেলিভারি করেন; অপছন্দের কারণে স্পটে রিটার্ন নেওয়ার নিয়ম নেই। কোনো কারিগরি ত্রুটি থাকলে আমরা সরাসরি তা রিপ্লেস করে দিই।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<RadarTrackIcon />}
        title={lang === 'en' ? '4. Live Parcel Tracking' : '৪. লাইভ পার্সেল ট্র্যাকিং'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? <>Once your parcel is handed over and booked, an automated courier tracking link is sent via SMS by Pathao Courier. Additionally, you can monitor live delivery status directly from our website&apos;s <Link prefetch={false} href="/track-order" className="font-bold text-brand-light hover:underline">Track Order</Link> page on your device or log in to track from any device anytime.</>
            : <>পার্সেল কুরিয়ারে হস্তান্তর ও বুকিং হওয়ার পর পাঠাও কুরিয়ারের পক্ষ থেকে স্বয়ংক্রিয় ট্র্যাকিং এসএমএস পাঠানো হয়। এছাড়া আমাদের ওয়েবসাইটের <Link prefetch={false} href="/track-order" className="font-bold text-brand-light hover:underline">অর্ডার ট্র্যাক</Link> পেজে আপনার ব্রাউজারের সাম্প্রতিক অর্ডারগুলো সরাসরি লাইভ দেখতে পারবেন অথবা লগইন করে যেকোনো ডিভাইস থেকে সার্বক্ষণিক ট্র্যাক করতে পারবেন।</>}
        </p>
      </PolicySection>

      <PolicySection
        icon={<VideoShieldIcon />}
        title={lang === 'en' ? '5. Parcel Receipt & Mandatory Unboxing Guideline' : '৫. পার্সেল গ্রহণ ও আনবক্সিং ভিডিও নির্দেশিকা'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'When receiving your parcel from the courier agent, please ensure the following safety measures:'
            : 'কুরিয়ার থেকে পার্সেল বুঝে নেওয়ার সময় গ্রাহকদের নিচের সতর্কতাগুলো অনুসরণের অনুরোধ করা হচ্ছে:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Check the outer security packaging to ensure the courier flyer is undamaged and properly sealed.'
              : 'প্যাকেটের বাইরের সিল অক্ষত রয়েছে কি না তা একবার চোখ বুলিয়ে নিন।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Preserve the official physical invoice paper provided inside the parcel box along with all packaging accessories.'
              : 'ভবিষ্যতের জন্য পার্সেলের ভেতরে থাকা মূল অফিসিয়াল ফিজিক্যাল ইনভয়েস পেপার ও প্রোডাক্টের বক্স সযত্নে সংরক্ষণ করুন।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Record a continuous, uncut unboxing video starting from the sealed package up to testing the product. This video is mandatory for any warranty or transit damage claim.'
              : 'পার্সেলটি খোলার শুরু থেকেই একটানা আন-কাট আনবক্সিং ভিডিও রেকর্ড করুন। কোনো ত্রুটি বা ট্রানজিট ড্যামেজ ক্লেইমের জন্য এই ভিডিও প্রমাণ হিসেবে আবশ্যক।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<BulkWhatsAppIcon />}
        title={lang === 'en' ? '6. Large & Bulk Orders (Above ৳20,000)' : '৬. লার্জ ও বাল্ক অর্ডার (২০,০০০ টাকার বেশি)'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'For security, customized logistics packaging, and tailored bulk discounts, orders exceeding ৳20,000 are not processed through standard online checkout. Our dedicated support team handles bulk orders directly via official WhatsApp to ensure priority handling.'
            : 'পার্সেল নিরাপত্তা, বিশেষ প্যাকেজিং এবং লার্জ অর্ডার ডিসকাউন্ট সুবিধার জন্য ২০,০০০ টাকার বেশি মূল্যের অর্ডার ওয়েবসাইটের সাধারণ চেকআউট দিয়ে গ্রহণ করা হয় না। গ্রাহককে সরাসরি আমাদের অফিসিয়াল WhatsApp সাপোর্টের মাধ্যমে স্পেশাল বাল্ক হ্যান্ডলিং সুবিধা দেওয়া হয়।'}
        </p>
      </PolicySection>

      <div className="mb-6 rounded-[14px] border border-border-base bg-white/60 p-4 text-center font-body text-[12px] text-muted">
        {lang === 'en'
          ? 'Fast, transparent, and insured delivery coverage across Bangladesh is our commitment.'
          : 'সারা বাংলাদেশে নিরাপদ, দ্রুত ও নির্ভরযোগ্য হোম ডেলিভারি দেওয়াই ভাঙচুর-এর অঙ্গীকার।'}
      </div>
    </>
  );
}

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

function DocumentTextIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function OrderCartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function TruckDeliveryIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function VideoRecordIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <polygon points="22 7 16 12 22 17 22 7" />
    </svg>
  );
}

function ShieldProtectionIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function RefreshExchangeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function UserSecurityIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CopyrightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M14.83 14.83a4 4 0 1 1 0-5.66" />
    </svg>
  );
}

function ScaleJusticeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h18" />
    </svg>
  );
}

export default function TermsClient() {
  const { lang } = useT();

  return (
    <>
      <PolicyHeader
        icon={<DocumentTextIcon />}
        title="শর্তাবলী (Terms & Conditions)"
        subtitle="ডিজিটাল কমার্স পরিচালনা ও বিক্রয় চুক্তি"
        updated="আগস্ট ২০২৬"
      />

      <PolicySection
        icon={<DocumentTextIcon />}
        title={lang === 'en' ? '1. Introduction & Operating Agreement' : '১. ভূমিকা ও পরিচালনা চুক্তি'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'Welcome to Vangcur (ভাঙচুর). By accessing, browsing, or placing an order through our website (vangcur.com), you acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. These terms comply with the Digital Commerce Operation Guidelines 2021 and the Consumer Rights Protection Act 2009 of Bangladesh.'
            : 'Vangcur (ভাঙচুর) ওয়েবসাইটে আপনাকে স্বাগতম। আমাদের ওয়েবসাইট (vangcur.com) ব্যবহার করে যেকোনো পণ্য অর্ডার করার মাধ্যমে আপনি এই শর্তাবলীর সাথে সম্পূর্ণভাবে সম্মত হচ্ছেন বলে গণ্য হবে। এই নীতিমালাটি বাংলাদেশের ডিজিটাল কমার্স পরিচালনা নির্দেশিকা ২০২১ এবং ভোক্তা অধিকার সংরক্ষণ আইন ২০০৯-এর আলোকে স্বচ্ছ ও নিরপেক্ষভাবে প্রণীত।'}
        </p>
        <p className={policyPClass}>
          {lang === 'en'
            ? 'If you do not agree with any part of these terms, please do not proceed with placing an order.'
            : 'আপনি যদি এই শর্তাবলীর কোনো অংশের সাথে একমত পোষণ না করেন, তবে অনুগ্রহ করে অর্ডার প্রক্রিয়া সম্পন্ন করা থেকে বিরত থাকুন।'}
        </p>
      </PolicySection>

      <PolicySection
        icon={<OrderCartIcon />}
        title={lang === 'en' ? '2. Order Placement & Customer Information' : '২. অর্ডার প্রদান ও তথ্যের নির্ভুলতা'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Before confirming an order, ensure that your full name, active mobile number, district, detailed delivery address, and payment verification details (bKash TxnID or last 4 digits) are 100% accurate.'
              : 'অর্ডার সম্পন্ন করার পূর্বে অবশ্যই আপনার পূর্ণ নাম, সচল মোবাইল নম্বর, জেলা, বিস্তারিত ঠিকানা এবং পেমেন্ট ভেরিফিকেশন তথ্য (বিকাশ ট্রানজেকশন আইডি বা শেষ ৪ ডিজিট) সঠিকভাবে প্রদান করুন।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Providing incorrect, incomplete, or false information grants Vangcur the complete right to hold or cancel your order to protect against fraudulent bookings.'
              : 'ভুল, অসম্পূর্ণ বা বিভ্রান্তিকর তথ্য প্রদান করলে প্রতারণামূলক অর্ডার রোধে Vangcur কর্তৃপক্ষ উক্ত অর্ডার স্থগিত বা বাতিল করার পূর্ণ অধিকার সংরক্ষণ করে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Orders are verified and handed over to our courier partner within 24 business hours. A live tracking SMS/link will be sent to your mobile number.'
              : 'অর্ডার কনফার্মেশনের ২৪ কার্যঘণ্টার মধ্যে পার্সেল কুরিয়ারে হস্তান্তর করা হয় এবং আপনার মোবাইল নম্বরে ট্র্যাকিং লিংক পাঠিয়ে দেওয়া হয়।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<CreditCardIcon />}
        title={lang === 'en' ? '3. Pricing, Advance Verification & Cash on Delivery' : '৩. মূল্য, অগ্রিম ভেরিফিকেশন ও ক্যাশ অন ডেলিভারি'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'All product prices on the website are displayed in Bangladeshi Taka (BDT) and are inclusive of relevant charges unless stated otherwise.'
            : 'ওয়েবসাইটে প্রদর্শিত সকল পণ্যের মূল্য বাংলাদেশি টাকায় (৳) নির্ধারিত।'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Tiered Advance Policy: To prevent fake bookings, orders below ৳4,000 require a fixed ৳200 advance. Orders between ৳4,000–৳20,000 require a 5% advance (on the total bill, including delivery charge) via bKash Send Money.'
              : 'অগ্রিম পেমেন্ট নীতিমালা: ফেক অর্ডার ও পার্সেল রিটার্ন রোধে ৪,০০০ টাকার নিচের অর্ডারে ফিক্সড ২০০ টাকা এবং ডেলিভারি চার্জসহ ৪,০০০ থেকে ২০,০০০ টাকার মোট বিলের অর্ডারে ৫% অগ্রিম পরিশোধ করতে হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Remaining Balance: The remaining balance is payable strictly via Cash on Delivery (COD) to the delivery agent upon receiving the package.'
              : 'অবশিষ্ট টাকা: অগ্রিম বাদে বাকি টাকা পার্সেল বুঝে নেওয়ার সময় ডেলিভারিম্যানকে ক্যাশ অন ডেলিভারি (COD) হিসেবে পরিশোধ করতে হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Security Guarantee: Vangcur will never ask for your bKash PIN, OTP, or card passwords. Verification is done solely via transaction reference.'
              : 'নিরাপত্তা নিশ্চয়তা: Vangcur কখনো গ্রাহকের বিকাশ পিন, ওটিপি বা কার্ড পাসওয়ার্ড চায় না বা সংরক্ষণ করে না।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<TruckDeliveryIcon />}
        title={lang === 'en' ? '4. Closed-Box Delivery & Parcel Receipt' : '৪. ক্লোজড-বক্স ডেলিভারি ও পার্সেল গ্রহণ'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'Vangcur operates closed-box home deliveries across all 64 districts in Bangladesh in partnership with Pathao Courier.'
            : 'Vangcur পাঠাও কুরিয়ারের মাধ্যমে সমগ্র বাংলাদেশের ৬৪টি জেলাতেই ক্লোজড-বক্স হোম ডেলিভারি পদ্ধতিতে পার্সেল সরবরাহ করে থাকে।'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'According to standard logistics regulations, customers must pay the remaining COD amount to the delivery person before accepting the parcel.'
              : 'কুরিয়ার নিয়মানুযায়ী ডেলিভারিম্যানকে আগে অবশিষ্ট ক্যাশ অন ডেলিভারি টাকা পরিশোধ করে পার্সেল বুঝে নিতে হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Courier delivery personnel are independent logistics agents and are not authorized to inspect, test, or approve technical returns on the spot.'
              : 'কুরিয়ার ডেলিভারিম্যান কেবল পার্সেল পৌঁছানোর দায়িত্বে থাকেন; স্পটে বসে প্রোডাক্টের টেকনিক্যাল পরীক্ষা বা রিটার্ন অনুমোদনের এখতিয়ার তাদের নেই।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<VideoRecordIcon />}
        title={lang === 'en' ? '5. Mandatory Unboxing Video Protocol' : '৫. আনবক্সিং ভিডিও নীতিমালা (বাধ্যতামূলক)'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'To protect consumers and prevent disputes regarding transit damage or missing accessories, recording a continuous, uncut unboxing video is mandatory:'
            : 'গ্রাহক ও মার্চেন্ট উভয়ের নিরাপত্তা এবং ট্রানজিট ড্যামেজ বা মিসিং প্রোডাক্টের জটিলতা নিরসনে পার্সেল খোলার সময় একটানা আনবক্সিং ভিডিও করা বাধ্যতামূলক:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'The video must begin from the sealed outer packaging, showing all labels, and continue without any cuts, edits, or pauses.'
              : 'ভিডিওটি প্যাকেটের বাইরে থেকে শুরু করে ভেতরের সকল এক্সেসরিজ পর্যন্ত একটানা আন-কাট ও আন-এডিটেডভাবে রেকর্ড করতে হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'For electronic gadgets, the video must demonstrate turning on the power or connecting the device.'
              : 'ইলেকট্রনিক পণ্যের ক্ষেত্রে ভিডিওতেই ডিভাইসটি পাওয়ার অন বা চার্জে দিয়ে পরীক্ষা করে দেখাতে হবে।'}
          </PolicyBulletPoint>
        </ul>

        <PolicyNote type="warning">
          {lang === 'en'
            ? 'Notice: As per e-commerce best practices and anti-fraud protocols, no warranty, transit damage, or missing item claim can be processed without continuous unboxing video proof.'
            : 'সতর্কবার্তা: একটানা আনবক্সিং ভিডিও প্রমাণ ছাড়া ভাঙা প্রোডাক্ট, মিসিং আইটেম কিংবা প্রাথমিক কারিগরি ত্রুটির কোনো ওয়ারেন্টি বা রিপ্লেসমেন্ট ক্লেইম গ্রহণযোগ্য হবে না।'}
        </PolicyNote>
      </PolicySection>

      <PolicySection
        icon={<ShieldProtectionIcon />}
        title={lang === 'en' ? '6. Warranty & Replacement Coverage' : '৬. ওয়ারেন্টি ও রিপ্লেসমেন্ট নীতিমালা'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Every standard product comes with a 1-week (7 days) replacement warranty. Selected items carry official coverage up to 6 months, 1 year, or 2 years as indicated on their product pages.'
              : 'সাধারণ পণ্যে ৭ দিনের ফ্রি রিপ্লেসমেন্ট ওয়ারেন্টি এবং প্রিমিয়াম পণ্যে ৬ মাস / ১ বছর / ২ বছর পর্যন্ত অফিসিয়াল ওয়ারেন্টি সুবিধা প্রদান করা হয়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Coverage starts from the date of placing the order.'
              : 'ওয়ারেন্টির মেয়াদ অর্ডার করার দিন থেকে কার্যকর হয়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Free Replacement: Genuine manufacturing defects, technical failure, or verified transit damages are replaced 100% free of charge at Vangcur’s expense.'
              : 'ফ্রি রিপ্লেসমেন্ট: ম্যানুফ্যাকচারিং ত্রুটি বা পরিবহনকালীন ক্ষতির ক্ষেত্রে সম্পূর্ণ নিজ খরচে নতুন প্রোডাক্ট রিপ্লেস করে দেওয়া হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Exclusions: Physical breakage, accidental drops, burn marks, water/liquid damage, high-voltage burning, or unauthorized modifications are strictly excluded from warranty.'
              : 'বহির্ভূত বিষয়: হাত থেকে পড়ে ভাঙা, পোড়া দাগ, ওয়াটার ড্যামেজ, উচ্চ ভোল্টেজের শর্টসার্কিট কিংবা অনুমতি ছাড়া সার্ভিসিং করা পণ্যে ওয়ারেন্টি প্রযোজ্য নয়।'}
          </PolicyBulletPoint>
        </ul>

        <PolicyNote type="info">
          {lang === 'en' ? (
            <>
              Claim requirements (original box, official invoice paper, continuous unboxing video), warranty types and the claim procedure are explained in full on our{' '}
              <Link href="/warranty" className="font-bold text-brand-light hover:underline">Warranty Policy</Link> page.
            </>
          ) : (
            <>
              ক্লেইমের শর্ত (অরিজিনাল বক্স, অফিসিয়াল ইনভয়েস পেপার, একটানা আনবক্সিং ভিডিও), ওয়ারেন্টির ধরন ও ক্লেইম করার নিয়ম বিস্তারিত দেখুন আমাদের{' '}
              <Link href="/warranty" className="font-bold text-brand-light hover:underline">ওয়ারেন্টি নীতিমালা</Link> পেজে।
            </>
          )}
        </PolicyNote>
      </PolicySection>

      <PolicySection
        icon={<RefreshExchangeIcon />}
        title={lang === 'en' ? '7. Return & Refund Boundaries' : '৭. রিটার্ন ও রিফান্ড সংক্রান্ত সীমাবদ্ধতা'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'No Returns for Personal Dislike / Change of Mind: Once delivered, products cannot be returned, exchanged, or refunded simply because of personal preference, subjective color dislike, or change of mind.'
            : 'পছন্দ না হওয়া বা মন পরিবর্তনের কারণে কোনো রিটার্ন নেই: Vangcur থেকে কেনাকাটার পর ব্যক্তিগত পছন্দ-অপছন্দ বা মন পরিবর্তনের (Change of Mind) কারণে পণ্য রিটার্ন বা রিফান্ডের কোনো সুযোগ নেই। অর্ডার করার আগেই ছবির বিবরণ ও স্পেক দেখে নেওয়ার অনুরোধ করা হচ্ছে।'}
        </p>
        <p className={policyPClass}>
          {lang === 'en'
            ? <>For complete step-by-step replacement procedures, please review our dedicated <Link href="/refund-policy" className="font-bold text-brand-light hover:underline">Return &amp; Refund Policy</Link>.</>
            : <>রিটার্ন ও রিপ্লেসমেন্টের পূর্ণাঙ্গ আইনি নীতিমালা জানতে আমাদের পৃথক <Link href="/refund-policy" className="font-bold text-brand-light hover:underline">রিটার্ন ও রিফান্ড পলিসি</Link> দেখুন।</>}
        </p>
      </PolicySection>

      <PolicySection
        icon={<UserSecurityIcon />}
        title={lang === 'en' ? '8. User Accounts & Fair Usage' : '৮. ব্যবহারকারীর অ্যাকাউন্ট ও আচরণবিধি'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Customers must provide truthful registration information and maintain the security of their login credentials.'
              : 'অ্যাকাউন্ট তৈরি ও কেনাকাটার সময় সত্য ও সঠিক তথ্য প্রদান করা বাধ্যতামূলক।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Automated bot traffic, spam checkout bookings, or abusive behavior will result in immediate IP and account bans.'
              : 'ফেক বুকিং, স্প্যামিং বা সাইট অপব্যবহারের ক্ষেত্রে সংশ্লিষ্ট অ্যাকাউন্ট ও ডিভাইস লিমিট স্থায়ীভাবে ব্লক করার অধিকার Vangcur সংরক্ষণ করে।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<CopyrightIcon />}
        title={lang === 'en' ? '9. Intellectual Property & Brand Assets' : '৯. বুদ্ধিবৃত্তিক সম্পত্তি ও কপিরাইট'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'All brand assets, photography, graphic artwork, UI code, product descriptions, and logos on vangcur.com are the exclusive property of Vangcur. Unauthorized reproduction or commercial scraping is strictly prohibited.'
            : 'এই ওয়েবসাইটের সকল লোগো, গ্রাফিক্স ডিজাইন, প্রোডাক্ট ফটোগ্রাফি, ইউআই কোড ও বিবরণী Vangcur-এর নিজস্ব বুদ্ধিবৃত্তিক সম্পত্তি। লিখিত অনুমতি ছাড়া যেকোনো প্রকার বাণিজ্যিক কপি বা পুনঃব্যবহার আইনত দণ্ডনীয়।'}
        </p>
      </PolicySection>

      <PolicySection
        icon={<ScaleJusticeIcon />}
        title={lang === 'en' ? '10. Governing Law & Jurisdiction' : '১০. প্রযোজ্য আইন ও বিরোধ নিষ্পত্তি'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'These Terms and Conditions are governed by and construed in accordance with the laws of the People’s Republic of Bangladesh. Any dispute arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the competent courts in Dhaka, Bangladesh.'
            : 'এই শর্তাবলী গণপ্রজাতন্ত্রী বাংলাদেশের প্রচলিত আইন অনুযায়ী পরিচালিত ও নিয়ন্ত্রিত হবে। এই চুক্তি বা পরিষেবা সংক্রান্ত যেকোনো আইনি বিরোধ কেবল ঢাকা, বাংলাদেশ আদালতের এখতিয়ারভুক্ত থাকবে।'}
        </p>
      </PolicySection>

      <div className="mb-6 rounded-[14px] border border-border-base bg-white/60 p-4 text-center font-body text-[12px] text-muted">
        {lang === 'en'
          ? 'Vangcur reserves the right to amend or update these operating policies at any time in compliance with national commerce guidelines.'
          : 'বাণিজ্য মন্ত্রণালয়ের নির্দেশিকা অনুযায়ী ভাঙচুর কর্তৃপক্ষ যেকোনো সময় এই নীতিমালা পরিমার্জন বা হালনাগাদ করার পূর্ণ অধিকার রাখে।'}
      </div>
    </>
  );
}

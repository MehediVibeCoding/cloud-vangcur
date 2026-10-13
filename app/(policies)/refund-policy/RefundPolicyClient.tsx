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

function ReturnBoxIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function CheckBadgeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
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

function ClipboardCheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function WorkflowStepsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

function ShieldWarrantyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function RefundPolicyClient() {
  const { lang } = useT();

  return (
    <>
      <PolicyHeader
        icon={<ReturnBoxIcon />}
        title="রিটার্ন ও রিফান্ড পলিসি (Return & Refund Policy)"
        subtitle="রিপ্লেসমেন্ট, রিটার্ন ও দাবি নিষ্পত্তির আইনি নীতিমালা"
        updated="আগস্ট ২০২৬"
      />

      <PolicySection
        icon={<ReturnBoxIcon />}
        title={lang === 'en' ? '1. No Returns for Change of Mind or Subjective Dislike' : '১. পছন্দ না হওয়া বা মন পরিবর্তনের কারণে কোনো রিটার্ন নেই'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'At Vangcur (ভাঙচুর), all products are sold strictly on a genuine defect-replacement basis. Once delivered, there is no option to return, exchange, or claim a refund due to personal preference, subjective color/size dissatisfaction, or change of mind (Change of Mind) where the product is free of manufacturing defects and matches the published specifications.'
            : 'Vangcur (ভাঙচুর) থেকে কেনাকাটার পর গ্রাহকের ব্যক্তিগত পছন্দ-অপছন্দ, মন পরিবর্তন (Change of Mind) কিংবা পণ্যে কোনো প্রকৃত সমস্যা বা ত্রুটি না থাকা সত্ত্বেও ফেরত দেওয়ার কোনো সুযোগ নেই। কাস্টমারদের অনুরোধ করা হচ্ছে অর্ডার নিশ্চিত করার পূর্বেই প্রোডাক্টের ছবি, কার্যকারিতা ও স্পেসিফিকেশন বিস্তারিতভাবে দেখে নেওয়ার জন্য।'}
        </p>
      </PolicySection>

      <PolicySection
        icon={<CheckBadgeIcon />}
        title={lang === 'en' ? '2. 100% Free Replacement Facility (For Genuine Issues)' : '২. ১০০% ফ্রি রিপ্লেসমেন্ট সুবিধা (শুধুমাত্র জেনুইন সমস্যার ক্ষেত্রে)'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'If, upon delivery, your product has any of the following verified genuine issues, Vangcur will replace it 100% free of charge and dispatch a brand-new unit to your address entirely at our own expense:'
            : 'ডেলিভারি বুঝে নেওয়ার পর প্রোডাক্টে যদি নিচের যেকোনো একটি প্রকৃত ত্রুটি প্রমাণিত হয়, তবে Vangcur সম্পূর্ণ নিজ খরচে এবং কোনো অতিরিক্ত ডেলিভারি চার্জ ছাড়াই নতুন প্রোডাক্ট দিয়ে তা পরিবর্তন (Replacement) করে দেবে:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Manufacturing Defect: Internal technical malfunction or factory defect preventing the device from functioning properly.'
              : 'ম্যানুফ্যাকচারিং ত্রুটি — কারখানাগত সমস্যা বা অভ্যন্তরীণ ত্রুটির কারণে প্রোডাক্ট স্বাভাবিকভাবে কাজ না করলে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Transit Damage: Product arrived broken, cracked, or physically damaged during courier transportation.'
              : 'ট্রানজিট ড্যামেজ — কুরিয়ারে পরিবহনজনিত কারণে ডেলিভারির সময় প্রোডাক্ট ভাঙা বা ক্ষতিগ্রস্ত অবস্থায় পৌঁছালে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Incorrect Product: Delivery of a completely different model or item than what was ordered on the invoice.'
              : 'ভুল প্রোডাক্ট — অর্ডারকৃত পণ্যের বদলে সম্পূর্ণ ভিন্ন কোনো মডেল বা প্রোডাক্ট ডেলিভারি দেওয়া হলে।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<VideoRecordIcon />}
        title={lang === 'en' ? '3. Mandatory Continuous Unboxing Video Requirement' : '৩. একটানা আনবক্সিং ভিডিও প্রমাণ (বাধ্যতামূলক)'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'To process any replacement claim securely and prevent false damage claims, recording a continuous unboxing video is an absolute mandatory prerequisite:'
            : 'রিপ্লেসমেন্ট ক্লেইম নির্বিঘ্নে অনুমোদন করতে এবং কুরিয়ার ক্ষতিপূরণ নিশ্চিত করতে পার্সেল খোলার সময় একটানা আনবক্সিং ভিডিও প্রমাণ থাকা বাধ্যতামূলক:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'The video recording must start from the sealed outer courier flyer/box, clearly showing all address labels, and continue in one single continuous take without cuts or pauses.'
              : 'ভিডিওটি কুরিয়ারের সিলযুক্ত প্যাকেটের বাইরে থেকে শুরু করতে হবে এবং কোনো প্রকার কাট, পজ বা এডিটিং ছাড়া সম্পূর্ণ পার্সেল খোলার দৃশ্য ধারণ করতে হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'For electronic gadgets, the camera must show the device being switched on or connected to power.'
              : 'ইলেকট্রনিক পণ্যের ক্ষেত্রে ভিডিও চলাকালীনই প্রোডাক্টটি পাওয়ার অন করে বা চার্জে লাগিয়ে টেস্ট করে দেখাতে হবে।'}
          </PolicyBulletPoint>
        </ul>

        <PolicyNote type="warning">
          {lang === 'en'
            ? 'Notice: In compliance with digital commerce operating standards, no replacement, transit damage, or missing accessory claim can be accepted without an uncut unboxing video.'
            : 'সতর্কতা: ডিজিটাল কমার্স পরিচালনা নির্দেশিকা অনুযায়ী একটানা আনবক্সিং ভিডিও প্রমাণ ছাড়া কোনো প্রকার ভাঙা বা ত্রুটিযুক্ত পণ্যের রিপ্লেসমেন্ট দাবি গ্রহণযোগ্য হবে না।'}
        </PolicyNote>
      </PolicySection>

      <PolicySection
        icon={<ClipboardCheckIcon />}
        title={lang === 'en' ? '4. Prerequisites for Claim Processing' : '৪. রিপ্লেসমেন্ট ক্লেইম করার প্রয়োজনীয় শর্তাবলী'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'The original product packaging box must be intact and preserved (torn, taped, or heavily creased boxes will void eligibility).'
              : 'প্রোডাক্টের অরিজিনাল বক্স অক্ষত অবস্থায় সংরক্ষণ করতে হবে (বক্সের গায়ে অতিরিক্ত টেপ বা ছেঁড়া থাকলে ক্লেইম বাতিল হবে)।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Original official invoice paper provided inside the parcel box (digital/downloaded copies are not accepted for physical verification).'
              : 'পার্সেলের ভেতরে থাকা অফিসিয়াল ইনভয়েস পেপার/মেমো (সংরক্ষিত আসল কপি প্রদর্শন করতে হবে; কোনো ডাউনলোডকৃত ডিজিটাল কপি গ্রহণযোগ্য নয়)।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'All in-box accessories, cables, user manuals, and attachments must be returned complete.'
              : 'বক্সের ভেতরের সকল ক্যাবল, এক্সেসরিজ ও নির্দেশিকা অক্ষত রাখতে হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en' ? 'The continuous uncut unboxing video.' : 'একটানা ধারণকৃত আনবক্সিং ভিডিও।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<WorkflowStepsIcon />}
        title={lang === 'en' ? '5. 3-Step Simple Claim Procedure' : '৫. রিপ্লেসমেন্ট ক্লেইম করার ৩টি সহজ ধাপ'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Step 1: As soon as you notice a problem, contact our official WhatsApp Support (01897-804055). Within 24 to 48 hours of receiving the parcel is best, and the sooner you report, the sooner we can resolve it.'
              : 'ধাপ ১: সমস্যা ধরা পড়ার সাথে সাথে আমাদের অফিসিয়াল WhatsApp সাপোর্টে (01897-804055) মেসেজ দিন। পার্সেল পাওয়ার ২৪ থেকে ৪৮ ঘণ্টার মধ্যে জানানো সবচেয়ে ভালো, আর যত দ্রুত জানাবেন সমাধানও তত দ্রুত হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Step 2: Share your Order Number (e.g. VC-1082), a brief description of the technical issue, and send the unboxing video file.'
              : 'ধাপ ২: আপনার অর্ডার নম্বর, সমস্যার বিবরণ এবং আনবক্সিং ভিডিওটি আমাদের সাপোর্ট ম্যানেজারের কাছে পাঠান।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Step 3: Our technical verification team will review the video within a few hours and dispatch a brand-new replacement unit to your address with zero additional cost.'
              : 'ধাপ ৩: আমাদের টিম ভিডিওটি যাচাই করে ২৪ ঘণ্টার মধ্যে সম্পূর্ণ ফ্রিতে আপনার ঠিকানায় নতুন রিপ্লেসমেন্ট প্রোডাক্ট বুকিং করে দেবে।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<ShieldWarrantyIcon />}
        title={lang === 'en' ? '6. Extended Warranty Terms Integration' : '৬. দীর্ঘমেয়াদী ওয়ারেন্টি কভারেজ'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? <>For technical issues arising after the initial 7-day period, coverage is handled under the respective product’s warranty timeline (up to 6 months, 1 year, or 2 years). Full warranty conditions are outlined on our <Link href="/warranty" className="font-bold text-brand-light hover:underline">Warranty Policy</Link> page.</>
            : <>প্রাথমিক ৭ দিনের পরও পণ্যের মেয়াদের মধ্যে (প্রোডাক্টভেদে ৬ মাস / ১ বছর / ২ বছর) কোনো অভ্যন্তরীণ টেকনিক্যাল সমস্যা দেখা দিলে একই নিয়মে ওয়ারেন্টি সাপোর্ট পাওয়া যাবে। বিস্তারিত জানতে আমাদের <Link href="/warranty" className="font-bold text-brand-light hover:underline">ওয়ারেন্টি নীতিমালা পেজ</Link> দেখুন।</>}
        </p>
      </PolicySection>

      <div className="mb-6 rounded-[14px] border border-border-base bg-white/60 p-4 text-center font-body text-[12px] text-muted">
        {lang === 'en'
          ? 'Vangcur is committed to a transparent, fast, and fair customer service experience across Bangladesh.'
          : 'গ্রাহকের প্রতিটি আদেশে স্বচ্ছতা ও সর্বোচ্চ বিক্রয়োত্তর সেবা নিশ্চিত করাই ভাঙচুর-এর মূল অঙ্গীকার।'}
      </div>
    </>
  );
}

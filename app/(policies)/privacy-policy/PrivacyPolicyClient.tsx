'use client';

import { useT } from '@/lib/i18n/useT';
import {
  PolicyHeader,
  PolicySection,
  PolicyNote,
  PolicyBulletPoint,
  policyPClass,
  policyUlClass,
} from '../PolicyContent';

function ShieldLockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect x="9" y="9" width="6" height="5" rx="1" />
      <path d="M10 9V7.5a2 2 0 0 1 4 0V9" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function CogSettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m11 17 2 2a1 1 0 0 0 1.42 0l6.59-6.59a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0L10 11.5" />
      <path d="M13 12.5 8 7.5a2 2 0 0 0-2.83 0L3.59 9.09a2 2 0 0 0 0 2.82L9 17.3" />
      <path d="m7 14.5 3 3" />
      <path d="m11 18.5 2 2" />
    </svg>
  );
}

function HardDriveCookieIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
    </svg>
  );
}

function KeyAccessIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 2-2 2m-1.5 1.5L14 9l-3-3-9 9 3 3 9-9 3.5 3.5 5.5-5.5" />
      <circle cx="15.5" cy="8.5" r="2.5" />
    </svg>
  );
}

function UserCheckmarkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

// ➕ নতুন আইকন — "Sign in with Google" সংক্রান্ত নতুন সেকশনের জন্য
function GoogleKeyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M9.5 8h5M12 5.5v5" />
      <path d="M12 13v7M9 17h6" />
    </svg>
  );
}

export default function PrivacyPolicyClient() {
  const { lang } = useT();

  return (
    <>
      <PolicyHeader
        icon={<ShieldLockIcon />}
        title="প্রাইভেসি পলিসি (Privacy Policy)"
        subtitle="ব্যক্তিগত তথ্যের নিরাপত্তা ও গোপনীয়তা প্রতিশ্রুতি"
        updated="আগস্ট ২০২৬"
      />

      <PolicySection
        icon={<ShieldLockIcon />}
        title={lang === 'en' ? '1. Privacy Commitment & Scope' : '১. গোপনীয়তা অঙ্গীকার ও মূলনীতি'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'At Vangcur (ভাঙচুর), we place paramount importance on safeguarding the privacy and personal data of our customers. This policy outlines transparently how we collect, process, store, and protect your information when you interact with our website (vangcur.com). By using our services, you consent to the data practices described herein.'
            : 'Vangcur (ভাঙচুর) আপনার ব্যক্তিগত তথ্যের গোপনীয়তা ও নিরাপত্তাকে সর্বোচ্চ অগ্রাধিকার প্রদান করে। আপনি যখন আমাদের ওয়েবসাইট (vangcur.com) ব্যবহার করেন, তখন আপনার কোন কোন তথ্য আমরা সংগ্রহ করি এবং কীভাবে তা সুরক্ষিত রাখি—তা এই নীতিমালায় সম্পূর্ণ স্বচ্ছতার সাথে ব্যাখ্যা করা হয়েছে।'}
        </p>
      </PolicySection>

      <PolicySection
        icon={<DatabaseIcon />}
        title={lang === 'en' ? '2. Information We Collect' : '২. আমরা যে তথ্য সংগ্রহ করি'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Order Fulfillment Details: Customer full name, mobile number, district, detailed home delivery address, optional email address, and bKash transaction references for payment verification.'
              : 'অর্ডার সংক্রান্ত তথ্য: গ্রাহকের পূর্ণ নাম, মোবাইল নম্বর, জেলা, বিস্তারিত ঠিকানা, ঐচ্ছিক ইমেইল এবং পেমেন্ট যাচাইয়ের জন্য বিকাশ ট্রানজেকশন রেফারেন্স বা শেষ ৪ ডিজিট।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'User Account Data: If you register or authenticate via Google OAuth, we store your profile name and verified email in encrypted form on our secure servers.'
              : 'অ্যাকাউন্ট তথ্য: আপনি রেজিস্ট্রেশন করলে বা Google দিয়ে লগইন করলে আপনার নাম ও ইমেইল সুরক্ষিত সার্ভারে এনক্রিপ্টেড আকারে সংরক্ষিত থাকে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Local Device Storage: Cart items, wishlist selections, language preference, and checkout drafts are stored directly on your browser via localStorage for offline resiliency and seamless page reloads.'
              : 'ডিভাইস লোকাল স্টোরেজ: কার্ট, উইশলিস্ট এবং ড্রাফট তথ্য আপনার নিজস্ব ব্রাউজারে সংরক্ষিত থাকে, যা অর্ডার কনফার্ম না করা পর্যন্ত কোনো সার্ভারে পাঠানো হয় না।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      {/* ➕ নতুন সেকশন (২.১) — "Sign in with Google" ব্যবহার করে ঠিক কী ডেটা নেওয়া
          হয় তা স্পষ্টভাবে বাংলা ও ইংরেজি দুই ভাষাতেই, ভাষা-টগলের ওপর নির্ভর না করে
          সবসময় একসাথে দেখানো হচ্ছে — যাতে Google-এর ভেরিফিকেশন রিভিউ (যেটা সবসময়
          ডিফল্ট বাংলা ভার্সন দেখে) স্পষ্ট ইংরেজি বর্ণনাও খুঁজে পায়। এছাড়া Google-এর
          নিজস্ব আবশ্যক "Limited Use" কমপ্লায়েন্স বাক্যটিও যোগ করা হলো। */}
      <PolicySection
        icon={<GoogleKeyIcon />}
        title="২.১ Google সাইন-ইন ডেটা ব্যবহার (About Google Sign-In)"
      >
        <p className={policyPClass}>
          যখন আপনি &quot;Google দিয়ে সাইন-ইন করুন&quot; অপশন ব্যবহার করেন, Vangcur
          শুধুমাত্র আপনার Google অ্যাকাউন্টের <strong>নাম ও যাচাইকৃত ইমেইল
          ঠিকানা</strong> গ্রহণ করে — এর বাইরে Gmail, Google Drive, Contacts,
          Calendar বা অন্য কোনো Google ডেটা বা পারমিশন (scope) Vangcur চায় না
          এবং অ্যাক্সেস করে না। এই তথ্য শুধুমাত্র আপনার অ্যাকাউন্ট তৈরি ও
          লগইন যাচাই করার জন্য ব্যবহৃত হয়, এবং এনক্রিপ্টেড আকারে আমাদের
          নিরাপদ সার্ভারে সংরক্ষিত থাকে। আপনি যেকোনো সময় সাপোর্টে যোগাযোগ করে
          এই তথ্য মুছে ফেলার অনুরোধ করতে পারেন।
        </p>
        <p className={policyPClass}>
          When you use &quot;Sign in with Google&quot;, Vangcur only requests
          your Google account&apos;s <strong>name and verified email
          address</strong> — we do not request or access Gmail, Google
          Drive, Contacts, Calendar, or any other Google data or permission
          scope. This information is used solely to create and authenticate
          your account on vangcur.com, and is stored in encrypted form on
          our secure servers. You may request deletion of this data at any
          time by contacting our customer support.
        </p>
        <PolicyNote type="info">
          Vangcur&apos;s use and transfer of information received from
          Google APIs to any other app will adhere to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </PolicyNote>
      </PolicySection>

      <PolicySection
        icon={<CogSettingsIcon />}
        title={lang === 'en' ? '3. Purpose & Use of Data' : '৩. তথ্যের ব্যবহার ও উদ্দেশ্য'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'We collect and utilize your personal information strictly for legitimate commercial and operational purposes:'
            : 'আমরা সংগৃহীত তথ্য শুধুমাত্র অর্ডার প্রক্রিয়া ও গ্রাহক সেবা নিশ্চিত করার উদ্দেশ্যে ব্যবহার করি:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Processing customer orders, verifying bKash advance payments, and generating official sales invoices.'
              : 'অর্ডার প্রসেস করা, বিকাশ অগ্রিম পেমেন্ট যাচাই করা এবং মেমো/ইনভয়েস তৈরি করার জন্য।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Handing over parcels to logistics partners and dispatching live tracking updates to the customer’s phone.'
              : 'কুরিয়ারে পার্সেল হ্যান্ডওভার ও গ্রাহককে লাইভ ট্র্যাকিং তথ্য পৌঁছে দেওয়ার জন্য।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Facilitating warranty verification, technical replacement claims, and customer support on WhatsApp.'
              : 'ওয়ারেন্টি যাচাই, রিপ্লেসমেন্ট ক্লেইম পরিচালনা এবং কাস্টমার সাপোর্ট প্রদান করার জন্য।'}
          </PolicyBulletPoint>
        </ul>

        <PolicyNote type="info">
          {lang === 'en'
            ? 'Zero Data Selling Guarantee: Vangcur does not sell, trade, rent, or lease customer personal data to third-party advertisers, data brokers, or marketing networks under any circumstances.'
            : 'জিরো ডেটা সেলিং নিশ্চয়তা: Vangcur গ্রাহকের কোনো ব্যক্তিগত তথ্য কোনো তৃতীয় পক্ষ, বিজ্ঞাপনদাতা বা এজেন্সির কাছে বিক্রি, ভাড়া বা অপব্যবহার করে না।'}
        </PolicyNote>
      </PolicySection>

      <PolicySection
        icon={<HandshakeIcon />}
        title={lang === 'en' ? '4. Trusted Third-Party Service Providers' : '৪. অনুমোদিত তৃতীয় পক্ষের পরিষেবা'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'To deliver a reliable e-commerce experience, we integrate with industry-leading infrastructure partners:'
            : 'ওয়েবসাইট পরিচালনা ও পার্সেল সরবরাহের জন্য আমরা নির্দিষ্ট কিছু বিশ্বস্ত পরিষেবা ব্যবহার করি:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Pathao Courier: Recipient name, destination address, and contact number are transmitted strictly for closed-box home delivery fulfillment.'
              : 'পাঠাও কুরিয়ার: পার্সেল পৌঁছে দেওয়ার জন্য প্রয়োজনীয় নাম, ঠিকানা ও ফোন নম্বর কেবল কুরিয়ার সিস্টেমে যুক্ত করা হয়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'bKash Payment Verification: Verified via transaction ID and reference digits. We never capture or access your personal bKash PIN.'
              : 'বিকাশ ভেরিফিকেশন: পেমেন্ট রেফারেন্স মিলিয়ে নিশ্চিত করা হয়; কোনো পিন বা ওটিপি সংগ্রহ করা হয় না।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<HardDriveCookieIcon />}
        title={lang === 'en' ? '5. Cookies & Local Storage' : '৫. কুকি ও লোকাল স্টোরেজ নীতিমালা'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'We utilize functional browser localStorage and cookies solely to maintain your active login session, cart persistence, and language toggle. We do not deploy invasive cross-site tracking cookies.'
            : 'আমরা ব্রাউজারের লোকাল স্টোরেজ ব্যবহার করি কেবল কার্ট, উইশলিস্ট ও ভাষা নির্বাচন মনে রাখার জন্য, যাতে সাইট ব্রাউজ করার সময় আপনার ডেটা হারিয়ে না যায়। আমরা কোনো আগ্রাসী বিজ্ঞাপন ট্র্যাকিং কুকি ব্যবহার করি না।'}
        </p>
      </PolicySection>

      <PolicySection
        icon={<KeyAccessIcon />}
        title={lang === 'en' ? '6. Data Protection & Security Architecture' : '৬. ডেটা সুরক্ষা ও নিরাপত্তা ব্যবস্থা'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'All web traffic is encrypted via 256-bit SSL/TLS HTTPS protocols.'
              : 'ওয়েবসাইটের সকল ডেটা আদান-প্রদান ২৫৬-বিট SSL/TLS HTTPS এনক্রিপশনের মাধ্যমে পরিচালিত হয়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'User passwords are irreversibly salted and hashed; plain-text passwords cannot be read by administrators or staff.'
              : 'গ্রাহকের পাসওয়ার্ড ডাটাবেজে অত্যন্ত সুরক্ষিত হ্যাশড ফরম্যাটে থাকে; কোনো অ্যাডমিন বা কর্মীর পাসওয়ার্ড দেখার সুযোগ নেই।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Strict access-control rules ensure each user can only access their own data.'
              : 'কঠোর অ্যাক্সেস-কন্ট্রোল নীতিমালা থাকায় ব্যবহারকারী কেবল নিজের ডেটা অ্যাক্সেস করতে পারেন।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<UserCheckmarkIcon />}
        title={lang === 'en' ? '7. Your Rights & Data Control' : '৭. গ্রাহকের অধিকার ও তথ্য নিয়ন্ত্রণ'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'Under consumer protection standards, you maintain full control over your personal data. You may edit your profile name from your account dashboard or request complete deletion of your account and historical records by contacting our customer support.'
            : 'ভোক্তা অধিকার সুরক্ষায় আপনার সংরক্ষিত তথ্যের ওপর আপনার পূর্ণ নিয়ন্ত্রণ রয়েছে। আপনি যেকোনো সময় অ্যাকাউন্ট ড্যাশবোর্ড থেকে নিজের তথ্য হালনাগাদ করতে পারেন কিংবা সাপোর্টে যোগাযোগ করে অ্যাকাউন্ট ও ডেটা সম্পূর্ণ অপসারণের অনুরোধ করতে পারেন।'}
        </p>
      </PolicySection>

      <div className="mb-6 rounded-[14px] border border-border-base bg-white/60 p-4 text-center font-body text-[12px] text-muted">
        {lang === 'en'
          ? 'This Privacy Policy is updated periodically in alignment with digital commerce regulations and security guidelines.'
          : 'ডিজিটাল কমার্স ও সাইবার নিরাপত্তা বিধিমালার আলোকে এই প্রাইভেসি পলিসি সময়ে সময়ে হালনাগাদ করা হয়।'}
      </div>
    </>
  );
}

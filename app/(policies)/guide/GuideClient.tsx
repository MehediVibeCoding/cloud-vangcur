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

function CompassNavIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function SearchMagnifyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CartBagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function CouponTagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function StepsCheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function MemoReceiptIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

function VideoProofIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <polygon points="22 7 16 12 22 17 22 7" />
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

function UserVipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

function StarReviewIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function SitemapTreeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <rect x="2" y="17" width="6" height="4" rx="1" />
      <rect x="9" y="17" width="6" height="4" rx="1" />
      <rect x="16" y="17" width="6" height="4" rx="1" />
      <path d="M12 7v4M5 11v6M12 11v6M19 11v6M5 11h14" />
    </svg>
  );
}

export default function GuideClient() {
  const { lang } = useT();

  return (
    <>
      <PolicyHeader
        icon={<CompassNavIcon />}
        title="ইউজার গাইড ও অর্ডার নির্দেশিকা (User Guide)"
        subtitle="Vangcur ওয়েবসাইট ব্যবহারের সহজ ও পূর্ণাঙ্গ সহায়িকা"
        updated="আগস্ট ২০২৬"
      />

      <PolicySection
        icon={<CompassNavIcon />}
        title={lang === 'en' ? '1. Website Overview & Smart Navigation' : '১. ওয়েবসাইট পরিচিতি ও স্মার্ট নেভিগেশন'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'Vangcur (vangcur.com) is an innovative tech gadget and lifestyle e-commerce platform in Bangladesh. Designed for effortless shopping across all smartphones and desktops, customers can easily browse products through multiple convenient features:'
            : 'Vangcur (ভাঙচুর) বাংলাদেশের অন্যতম আধুনিক গ্যাজেট ও লাইফস্টাইল ই-কমার্স প্ল্যাটফর্ম। কাস্টমারদের দ্রুত ও আনন্দদায়ক কেনাকাটার অভিজ্ঞতা দিতে ওয়েবসাইটটিকে অত্যন্ত সহজ ও ডায়নামিক আর্কিটেকচারে সাজানো হয়েছে:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Floating Top Bar: Access your live Wishlist, Cart counter, Profile Dashboard, and Track Order modal with a single tap from anywhere on the site.'
              : 'ফ্লোটিং ন্যাভবার: ন্যাভবারের মাধ্যমে রিয়েল-টাইম উইশলিস্ট, কার্ট কাউন্টার, প্রোফাইল একাউন্ট এবং লাইভ অর্ডার ট্র্যাকিং যেকোনো স্থান থেকে ১-ট্যাপে ব্যবহার করা যায়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Trending Story Cards: Explore highlighted gadget collections directly from the top horizontal story slider on the homepage.'
              : 'হিরো স্টোরি স্লাইডার: হোমপেজের শীর্ষে থাকা কার্ডে ক্লিক করে সরাসরি ট্রেন্ডিং ও বিশেষ গ্যাজেট কালেকশনে পৌঁছে যাওয়া যায়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Category Selector: Filter items instantly by category — RGB Lights, Smart Watches, TWS Earbuds, Power Banks, Acrylic Lamps, Rechargeable Fans, and Unique Tools.'
              : 'ক্যাটাগরি ক্যারোসেল: ক্যাটাগরি আইকনে ক্লিক করে নিমিষেই কাঙ্ক্ষিত নির্দিষ্ট গ্যাজেটগুলো ফিল্টার করে দেখা যায়।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<SearchMagnifyIcon />}
        title={lang === 'en' ? '2. Product Search & Keyword Suggestions' : '২. প্রোডাক্ট সার্চ ও কিউরেটেড কিওয়ার্ড ফিল্টারিং'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'Our fast search bar helps you find gadgets instantly in both English and Bengali:'
            : 'আমাদের সার্চ বারের মাধ্যমে ইংরেজি ও বাংলা উভয় ভাষায় দ্রুত প্রোডাক্ট খুঁজে পাওয়া যায়:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Type product names in English (min 3 letters) or everyday Bangla terms (e.g., "নিয়ন", "ঘড়ি", "স্পিকার", "ফ্যান").'
              : 'ইংরেজি অক্ষরের পাশাপাশি সরাসরি বাংলা নাম লিখেও যেকোনো গ্যাজেট নিমেষেই সার্চ করা যায়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Recent Searches: Your recent queries are remembered locally on your device for quick 1-tap re-searches.'
              : 'সাম্প্রতিক অনুসন্ধান: পূর্বে খোঁজা কিওয়ার্ডগুলো সহজে দেখার জন্য সেভ থাকে, যা ১-ট্যাপে পুনরায় সার্চ করা যায়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Full Search Page (/search): Press enter to view complete results, matched category suggestions, and item counts.'
              : 'সার্চ রেজাল্ট পেজ (/search): সার্চ বারে এন্টার চাপলে সম্পূর্ণ সার্চ রেজাল্ট ও ক্যাটাগরি চিপস গ্রিড আকারে দেখা যায়।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<CartBagIcon />}
        title={lang === 'en' ? '3. Wishlist, Shopping Cart & 1-Click Quick Order' : '৩. উইশলিস্ট, শপিং কার্ট ও ১-ক্লিক কুইক অর্ডার'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Wishlist Hearting: Tap the heart icon on any product to save it to your wishlist. Re-open your favorites anytime from the top bar.'
              : 'উইশলিস্ট (পছন্দের তালিকা): হার্ট আইকনে ট্যাপ করে যেকোনো পছন্দের প্রোডাক্ট সেভ করে রাখা যায়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Add to Cart: Add multiple items to your cart, adjust quantities (+/-), and view real-time subtotal calculations.'
              : 'কার্টে যোগ: কার্ট ড্রয়ারে একাধিক পণ্য যুক্ত করা, পরিমাণ পরিবর্তন এবং সর্বমোট বিল হিসাব করা যায়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? '1-Click Quick Order ("Order Now"): Click "Order Now" on any single product to skip the cart and proceed straight to checkout.'
              : '১-ক্লিক কুইক অর্ডার ("অর্ডার করুন"): কার্ট খালি থাকলে সরাসরি "অর্ডার করুন" বাটনে ক্লিক করে একক প্রোডাক্টের চেকআউটে যাওয়া যায়।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<CouponTagIcon />}
        title={lang === 'en' ? '4. Applying Coupon Codes & Promotional Discounts' : '৪. কুপন কোড ও বিশেষ ছাড় ব্যবহারের নিয়ম'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'Discount coupons can be easily redeemed inside the Cart Drawer or at Checkout Step 1:'
            : 'শপিং কার্ট কিংবা চেকআউটের ১ম ধাপে কুপন কোড ব্যবহার করে অতিরিক্ত ডিসকাউন্ট পাওয়া যায়:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Live Verification: Type your coupon code and tap Apply to see your total bill discounted instantly.'
              : 'লাইভ যাচাই: কুপন লিখে প্রয়োগ বাটনে চাপলে মুহূর্তের মধ্যে মোট বিল থেকে ছাড় সমন্বিত হয়ে যায়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Smart Auto-Apply: If you enter a coupon code and directly click "Checkout" without hitting Apply, the system automatically validates the coupon and applies the discount before taking you to the next step.'
              : 'স্মার্ট অটো-অ্যাপ্লাই: কুপন লিখে আলাদাভাবে প্রয়োগ বাটনে না চেপে সরাসরি চেকআউট বাটনে চাপলেও সিস্টেম স্বয়ংক্রিয়ভাবে কোডটি যাচাই করে ছাড় যোগ করে দেয়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'VIP Tier Rewards: Lucky coupon codes won from the VIP Spin Wheel are directly accepted during checkout.'
              : 'ভিআইপি কুপন: মেম্বারশিপ স্পিন হুইল থেকে জেতা ক্যাশব্যাক কুপন কোডগুলো চেকআউটে সরাসরি ব্যবহারযোগ্য।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<StepsCheckIcon />}
        title={lang === 'en' ? '5. 3-Step Simple Checkout & Tiered bKash Advance' : '৫. ৩-ধাপের সহজ চেকআউট ও ৩-টায়ার বিকাশ অগ্রিম পেমেন্ট'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'Our streamlined checkout flow takes less than a minute across 3 easy steps:'
            : 'আমাদের ৩-ধাপের চেকআউট প্রক্রিয়ায় এক মিনিটেরও কম সময়ে নিরাপদে অর্ডার সম্পন্ন করা যায়:'}
        </p>

        <div className={policySubheadingClass}>
          {lang === 'en' ? 'Step 1: Delivery Information & District Selection' : 'ধাপ ১: ডেলিভারি তথ্য ও জেলা নির্বাচন'}
        </div>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Provide your Full Name, 11-digit mobile number, District dropdown, and complete street/house address. Delivery charges update automatically (Inside Dhaka ৳70, Outside Dhaka / All Bangladesh ৳120).'
              : 'আপনার নাম, ১১ ডিজিটের ফোন নম্বর, জেলা ও সম্পূর্ণ ঠিকানা দিন। জেলা অনুযায়ী কুরিয়ার চার্জ স্বয়ংক্রিয়ভাবে হিসাব হবে (ঢাকা সিটি ৭০ টাকা, সারা বাংলাদেশ ১২০ টাকা)।'}
          </PolicyBulletPoint>
        </ul>

        <div className={policySubheadingClass}>
          {lang === 'en' ? 'Step 2: Tiered Advance Payment via bKash Send Money' : 'ধাপ ২: ৩-টায়ার বিকাশ অগ্রিম পেমেন্ট'}
        </div>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Orders below ৳4,000: Send Money a fixed ৳200 advance to our official bKash number (01816-365504) or scan the on-screen QR code.'
              : '৪,০০০ টাকার নিচে অর্ডার: ফিক্সড ২০০ টাকা বিকাশ সেন্ড মানি করুন (01816-365504) অথবা স্ক্রিনের কিউআর কোড স্ক্যান করুন।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Orders ৳4,000 – ৳20,000: Send Money a 5% advance on the total bill, including delivery charge (live breakdown viewable in the dropdown).'
              : '৪,০০০ থেকে ২০,০০০ টাকার অর্ডার: ডেলিভারি চার্জসহ মোট বিলের ৫% অগ্রিম পরিশোধ করুন (ড্রপডাউনে বিস্তারিত হিসাব দেখা যাবে)।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Orders above ৳20,000: Automatically opens the dedicated WhatsApp Bulk Order modal for special support.'
              : '২০,০০০ টাকার বেশি অর্ডার: বিশেষ WhatsApp বাল্ক অর্ডার মডালের মাধ্যমে অগ্রাধিকার ভিত্তিতে হ্যান্ডেল করা হবে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Enter either the 10-character bKash Transaction ID (TxnID) or the Last 4 Digits of your payment number.'
              : 'বিকাশ সেন্ড মানি করে ১০ ডিজিটের TxnID অথবা যে নম্বর থেকে টাকা পাঠিয়েছেন তার শেষ ৪ ডিজিট বক্সে লিখুন।'}
          </PolicyBulletPoint>
        </ul>

        <div className={policySubheadingClass}>
          {lang === 'en' ? 'Step 3: Review Invoice Memo & Confirm' : 'ধাপ ৩: অর্ডার মেমো রিভিউ ও কনফার্ম'}
        </div>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Review your total bill, advance deduction, and Cash on Delivery (COD) balance. Agree to the terms and tap "Confirm Order".'
              : 'মোট বিল, অগ্রিম কর্তন ও বাকি ক্যাশ অন ডেলিভারি (COD) টাকার হিসাব দেখে শর্তাবলীতে সম্মতি দিয়ে "অর্ডার কনফার্ম করুন" বাটনে চাপুন।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<MemoReceiptIcon />}
        title={lang === 'en' ? '6. Automated Verification & Invoice Memo Download' : '৬. স্বয়ংক্রিয় ভেরিফিকেশন ও মেমো ডাউনলোড'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Fast Verification: After submitting, our support team matches your payment details within 5 to 10 minutes (maximum 30 minutes).'
              : 'দ্রুত ভেরিফিকেশন: অর্ডার সাবমিটের পর আমাদের সাপোর্ট টিম ৫–১০ মিনিটের মধ্যে বিকাশ পেমেন্ট নিশ্চিত করে অর্ডার কনফার্ম করে।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'HD Invoice Memo: Once confirmed, an official digital invoice memo is generated and automatically downloaded to your device for your records.'
              : 'ডিজিটাল ইনভয়েস মেমো: অর্ডার কনফার্ম হওয়ামাত্র একটি ফুল এইচডি ডিজিটাল ইনভয়েস মেমো ডিভাইসে সেভ করার সুবিধা পাওয়া যায়।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<VideoProofIcon />}
        title={lang === 'en' ? '7. Parcel Delivery & Mandatory Unboxing Protocol' : '৭. পার্সেল ডেলিভারি গ্রহণ ও আনবক্সিং ভিডিও নির্দেশিকা'}
      >
        <p className={policyPClass}>
          {lang === 'en'
            ? 'When Pathao Courier delivers the parcel to your doorstep:'
            : 'পাঠাও কুরিয়ারের ডেলিভারিম্যান যখন আপনার ঠিকানায় পার্সেল নিয়ে আসবেন:'}
        </p>
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Pay the remaining Cash on Delivery (COD) balance to the delivery person and collect the sealed box.'
              : 'ডেলিভারিম্যানকে অবশিষ্ট ক্যাশ অন ডেলিভারির টাকা পরিশোধ করে সিলযুক্ত পার্সেল বুঝে নিন।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Preserve the Clean Physical Invoice Paper: Inside the parcel box, an official clean paper invoice is specifically provided for future warranty records.'
              : 'পার্সেলের ভেতরে থাকা মূল অফিসিয়াল ইনভয়েস পেপার: ভবিষ্যতে ওয়ারেন্টি কভারেজ পেতে পার্সেল বক্সের ভেতরে থাকা আলাদা ইনভয়েস পেপারটি সযত্নে সংরক্ষণ করুন।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Record an Uncut Unboxing Video: Start recording continuously from the sealed outer package up to turning on the product. This video is mandatory for any warranty or replacement claim.'
              : 'একটানা আনবক্সিং ভিডিও: পার্সেলের প্যাকেট কাটার শুরু থেকেই একটানা আন-কাট ভিডিও রেকর্ড করুন। কোনো ত্রুটির ক্ষেত্রে এই ভিডিও ওয়ারেন্টি ক্লেইমের একমাত্র প্রমাণ।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<RadarTrackIcon />}
        title={lang === 'en' ? '8. Live Parcel Tracking' : '৮. লাইভ পার্সেল ট্র্যাকিং পদ্ধতি'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? <>Track Order Page (/track-order): Monitor your recent browser orders automatically on our <Link href="/track-order" className="font-bold text-brand-light hover:underline">Track Order</Link> page, or search easily with your order number.</>
              : <>অর্ডার ট্র্যাক পেজ: ওয়েবসাইটের <Link href="/track-order" className="font-bold text-brand-light hover:underline">অর্ডার ট্র্যাক</Link> পেজে বর্তমান ডিভাইসের সাম্প্রতিক অর্ডার স্বয়ংক্রিয়ভাবে ফুটে ওঠে অথবা অর্ডার নম্বর দিয়ে লাইভ স্ট্যাটাস দেখা যায়।</>}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? <>Account Dashboard (/account/orders): Logged-in customers can view their complete order history, track deliveries, and access digital invoices live across any device.</>
              : <>অ্যাকাউন্ট ড্যাশবোর্ড: অ্যাকাউন্টে লগইন করা থাকলে যেকোনো ডিভাইস থেকে সম্পূর্ণ অর্ডার ইতিহাস, লাইভ ট্র্যাকিং ও ডিজিটাল মেমো দেখা যায়।</>}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Automated Courier SMS: Pathao Courier automatically dispatches an SMS with a live tracking link to your phone number as soon as your parcel is booked.'
              : 'কুরিয়ার এসএমএস ট্র্যাকিং: পার্সেল কুরিয়ারে বুকিং হওয়ামাত্র পাঠাও কুরিয়ারের পক্ষ থেকে স্বয়ংক্রিয়ভাবে আপনার ফোনে ট্র্যাকিং লিংক সহ এসএমএস পৌঁছে যায়।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<UserVipIcon />}
        title={lang === 'en' ? '9. User Profile, Draft Recovery & VIP Club' : '৯. ইউজার প্রোফাইল, ড্রাফট রিকভারি ও ভিআইপি ক্লাব'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? '1-Tap Google Login: Sign in with Google to link past orders, track deliveries, and manage account details seamlessly.'
              : '১-ট্যাপ গুগল লগইন: এক ক্লিকে গুগল দিয়ে লগইন করলে পূর্বের সকল গেস্ট অর্ডার স্বয়ংক্রিয়ভাবে প্রোফাইলে যুক্ত হয়ে যায়।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Smart Draft Recovery: If you leave the checkout page unfinished, returning later lets you resume your order with 1 click.'
              : 'ড্রাফট রিকভারি: চেকআউট ফর্ম পূরণ করে বের হয়ে গেলেও পরবর্তীতে ফিরে এলে তথ্য পুনরায় লেখার প্রয়োজন হয় না।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'VIP Membership Club: Complete orders to unlock Silver, Gold, Diamond, and Legendary tiers with Lucky Cash Spin Wheels and Zero-Advance COD privileges.'
              : 'ভিআইপি মেম্বারশিপ: সফল অর্ডারের ভিত্তিতে সিলভার, গোল্ড, ডায়মন্ড ও লিজেন্ডারি ব্যাজ আনলক হয় এবং লাকি স্পিন হুইল থেকে ক্যাশব্যাক কুপন জেতা যায়।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<StarReviewIcon />}
        title={lang === 'en' ? '10. Customer Reviews & Community Q&A' : '১০. কাস্টমার রিভিউ ও কমিউনিটি প্রশ্নোত্তর (Q&A)'}
      >
        <ul className={policyUlClass}>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Photo Reviews: Share your unboxing experience with real photos. Verified buyer badges are assigned automatically upon order matching.'
              : 'আনবক্সিং রিভিউ: প্রোডাক্ট হাতে পেয়ে কাস্টমাররা সরাসরি ছবি সহ বাস্তব অভিজ্ঞতা প্রকাশ করতে পারেন।'}
          </PolicyBulletPoint>
          <PolicyBulletPoint>
            {lang === 'en'
              ? 'Product Q&A: Ask questions about gadget features or specifications directly on product pages to receive official answers from our team.'
              : 'প্রশ্নোত্তর (Q&A): যেকোনো প্রোডাক্টের নিচে প্রশ্ন জিজ্ঞাসা করলে আমাদের টিম সরাসরি তার অফিসিয়াল উত্তর প্রদান করে।'}
          </PolicyBulletPoint>
        </ul>
      </PolicySection>

      <PolicySection
        icon={<SitemapTreeIcon />}
        title={lang === 'en' ? '11. Full Website Navigation Directory' : '১১. সম্পূর্ণ ওয়েবসাইট পেজ তালিকা ও লিঙ্ক গাইড'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 font-body text-xs">
          <div className="rounded-[12px] border border-border-base bg-white p-3 shadow-2xs">
            <Link href="/" className="font-extrabold text-brand-light hover:underline block mb-0.5">
              / (হোমপেজ)
            </Link>
            <span className="text-muted">হিরো স্লাইডার, ক্যাটাগরি, প্রোডাক্ট গ্রিড, রিভিউ গ্যালারি ও এফএকিউ।</span>
          </div>

          <div className="rounded-[12px] border border-brand-light/35 bg-brand-bg/20 p-3 shadow-2xs">
            <Link href="/offers" className="font-extrabold text-brand-light hover:underline block mb-0.5">
              /offers (চলতি অফারসমূহ)
            </Link>
            <span className="text-muted">বিশেষ ক্যাম্পেইন, প্রমোশনাল ব্যানার ও সপ্তাহের সেরা হট ডিল হাব।</span>
          </div>

          <div className="rounded-[12px] border border-border-base bg-white p-3 shadow-2xs">
            <Link href="/shipping" className="font-extrabold text-brand-light hover:underline block mb-0.5">
              /shipping (অর্ডার ও শিপিং তথ্য)
            </Link>
            <span className="text-muted">ডেলিভারি এলাকা, সময়সীমা, চার্জ ও কুরিয়ার ট্র্যাকিং নীতিমালা।</span>
          </div>

          <div className="rounded-[12px] border border-border-base bg-white p-3 shadow-2xs">
            <Link href="/refund-policy" className="font-extrabold text-brand-light hover:underline block mb-0.5">
              /refund-policy (রিটার্ন ও রিফান্ড)
            </Link>
            <span className="text-muted">রিটার্ন, ১০০% ফ্রি রিপ্লেসমেন্ট ও আনবক্সিং ভিডিওর আইনি শর্তাবলী।</span>
          </div>

          <div className="rounded-[12px] border border-border-base bg-white p-3 shadow-2xs">
            <Link href="/warranty" className="font-extrabold text-brand-light hover:underline block mb-0.5">
              /warranty (ওয়ারেন্টি নীতিমালা)
            </Link>
            <span className="text-muted">ওয়ারেন্টির ধরন, মেয়াদ, কভারেজ ও ক্লেইম করার নিয়ম।</span>
          </div>

          <div className="rounded-[12px] border border-border-base bg-white p-3 shadow-2xs">
            <Link href="/terms" className="font-extrabold text-brand-light hover:underline block mb-0.5">
              /terms (শর্তাবলী)
            </Link>
            <span className="text-muted">ডিজিটাল কমার্স পরিচালনা চুক্তি ও আইনি শর্তাবলী।</span>
          </div>

          <div className="rounded-[12px] border border-border-base bg-white p-3 shadow-2xs">
            <Link href="/privacy-policy" className="font-extrabold text-brand-light hover:underline block mb-0.5">
              /privacy-policy (প্রাইভেসি পলিসি)
            </Link>
            <span className="text-muted">ব্যক্তিগত তথ্যের সুরক্ষা, এনক্রিপশন ও গোপনীয়তা প্রতিশ্রুতি।</span>
          </div>

          <div className="rounded-[12px] border border-border-base bg-white p-3 shadow-2xs">
            <Link href="/track-order" className="font-extrabold text-brand-light hover:underline block mb-0.5">
              /track-order (অর্ডার ট্র্যাক)
            </Link>
            <span className="text-muted">অর্ডার নম্বর দিয়ে লাইভ পার্সেল ডেলিভারি স্ট্যাটাস ট্র্যাকিং।</span>
          </div>

          <div className="rounded-[12px] border border-border-base bg-white p-3 shadow-2xs">
            <Link href="/account" className="font-extrabold text-brand-light hover:underline block mb-0.5">
              /account (প্রোফাইল ড্যাশবোর্ড)
            </Link>
            <span className="text-muted">কাস্টমার প্রোফাইল, লাইভ ওয়েদার কার্ড, অর্ডার মেমো ও মেম্বারশিপ স্পিনার।</span>
          </div>

          <div className="rounded-[12px] border border-border-base bg-white p-3 shadow-2xs">
            <Link href="/search" className="font-extrabold text-brand-light hover:underline block mb-0.5">
              /search (সার্চ পেজ)
            </Link>
            <span className="text-muted">বাংলা ও ইংরেজি কিওয়ার্ড দিয়ে প্রোডাক্ট সার্চ রেজাল্ট পেজ।</span>
          </div>
        </div>
      </PolicySection>

      <PolicyNote type="info">
        {lang === 'en'
          ? 'Have more questions? Contact our official WhatsApp Support directly at 01897-804055 (9:00 AM – 10:00 PM).'
          : 'যেকোনো প্রয়োজনে সরাসরি সহায়তা পেতে আমাদের অফিসিয়াল WhatsApp নম্বরে (01897-804055) প্রতিদিন সকাল ৯:০০ টা থেকে রাত ১০:০০ টা পর্যন্ত মেসেজ দিতে পারেন।'}
      </PolicyNote>
    </>
  );
}

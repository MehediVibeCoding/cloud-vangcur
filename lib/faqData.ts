import type { SupabaseClient } from '@supabase/supabase-js';

export interface Faq {
  /** বাংলা প্রশ্ন */
  q: string;
  /** বাংলা উত্তর */
  a: string;
  /** English question (ঐচ্ছিক — না থাকলে বাংলাই দেখাবে / ডিকশনারি থেকে অনুবাদ হবে) */
  qEn?: string;
  /** English answer */
  aEn?: string;
}

// উত্তরের ভেতরে `[লেখা](/url)` ফরম্যাটে ইন্টার্নাল লিংক দেওয়া যায় (দেখুন lib/linkedText.tsx)।
// ডেলিভারি চার্জ, অগ্রিম ও সময়সীমা বদলালে শিপিং/রিফান্ড/টার্মস পেজের সাথে মিলিয়ে নিন।
export const DEFAULT_FAQS: Faq[] = [
  {
    q: 'আপনারা কি ক্যাশ অন ডেলিভারিতে প্রোডাক্ট দেন?',
    a: 'হ্যাঁ, ক্যাশ অন ডেলিভারিতে (COD) পণ্য দিই। তবে অর্ডার নিশ্চিত করতে আগে বিকাশ সেন্ড মানিতে সামান্য অগ্রিম দিতে হয়। ডেলিভারি চার্জসহ মোট বিল ৪,০০০ টাকার নিচে হলে অগ্রিম ফিক্সড ২০০ টাকা, আর ৪,০০০ থেকে ২০,০০০ টাকার মধ্যে হলে মোট বিলের ৫%। বাকি টাকা পার্সেল হাতে পেয়ে ডেলিভারিম্যানকে দেবেন। বিস্তারিত [শিপিং নীতিমালা](/shipping) পেজে আছে।',
    qEn: 'Do you offer Cash on Delivery?',
    aEn: 'Yes, we offer Cash on Delivery (COD). To confirm your order you first pay a small advance via bKash Send Money: a fixed ৳200 if your total bill (including delivery charge) is below ৳4,000, or 5% of the total bill if it is between ৳4,000 and ৳20,000. You pay the remaining amount to the delivery man when you receive the parcel. See our [Shipping Policy](/shipping) for details.',
  },
  {
    q: 'আপনারা কি ঢাকার বাইরে ডেলিভারি করেন? ডেলিভারি চার্জ কত?',
    a: 'হ্যাঁ, পাঠাও কুরিয়ারের মাধ্যমে সারা বাংলাদেশের ৬৪টি জেলাতেই হোম ডেলিভারি দিই। ঢাকা সিটিতে চার্জ ৭০ টাকা, সময় ১–২ কার্যদিবস। ঢাকার বাইরে চার্জ ১২০ টাকা, সময় ২–৪ কার্যদিবস। কুপন কোড বা মেম্বারশিপ রিওয়ার্ড থাকলে ডেলিভারি চার্জ ফ্রিও হতে পারে।',
    qEn: 'Do you deliver outside Dhaka? What is the delivery charge?',
    aEn: 'Yes, we deliver to all 64 districts of Bangladesh through Pathao Courier. Inside Dhaka City the delivery charge is ৳70 and takes 1–2 business days. Outside Dhaka it is ৳120 and takes 2–4 business days. A coupon code or a membership reward can make delivery free.',
  },
  {
    q: 'অর্ডার করার কতক্ষণ পর কনফার্ম হয় এবং কবে পার্সেল পাঠানো হয়?',
    a: 'অগ্রিম পাঠিয়ে ট্রানজেকশন আইডি (অথবা শেষ ৪ ডিজিট) দিন। পেমেন্ট যাচাইয়ের পর কনফার্মেশন পাবেন, সাধারণত ৫–১০ মিনিটে, সর্বোচ্চ ৩০ মিনিটে। এরপর ২৪ কার্যঘণ্টার মধ্যে পার্সেল কুরিয়ারে হস্তান্তর করা হয়।',
    qEn: 'How long does order confirmation take, and when is my parcel shipped?',
    aEn: 'Send the advance and enter the transaction ID (or the last 4 digits of the sending number). After payment verification you will receive confirmation, usually within 5–10 minutes and at most 30 minutes. The parcel is then handed over to the courier within 24 working hours.',
  },
  {
    q: 'অর্ডার কীভাবে ট্র্যাক করব?',
    a: 'কুরিয়ারে বুকিং হলে পাঠাও আপনার ফোনে ট্র্যাকিং SMS পাঠায়। এছাড়া ওয়েবসাইটের [অর্ডার ট্র্যাক](/track-order) পেজে ব্রাউজারের সাম্প্রতিক অর্ডারগুলোর লাইভ অবস্থা দেখা যায়। অ্যাকাউন্টে লগইন করলে যেকোনো ডিভাইস থেকে দেখতে পারবেন।',
    qEn: 'How do I track my order?',
    aEn: 'Once your parcel is booked, Pathao Courier sends a tracking SMS to your phone. You can also see the live status of recent orders from your browser on the [Track Order](/track-order) page, or log in to track from any device.',
  },
  {
    q: 'পণ্য ভাঙা, নষ্ট বা ভুল এলে কী করব?',
    a: 'কারখানাগত ত্রুটি, ভাঙা বা ভুল পণ্য এলে বাড়তি ডেলিভারি চার্জ ছাড়াই নতুন পণ্য পাঠিয়ে দিই। এর জন্য পার্সেল খোলার শুরু থেকে একটানা আন-কাট আনবক্সিং ভিডিও বাধ্যতামূলক। যত দ্রুত সম্ভব, পার্সেল পাওয়ার ২৪–৪৮ ঘণ্টার মধ্যে হলে সবচেয়ে ভালো, অর্ডার নম্বর ও ভিডিওসহ WhatsApp-এ (01897-804055) জানান। যাচাইয়ের পর ২৪ ঘণ্টার মধ্যে রিপ্লেসমেন্ট বুক হবে। পূর্ণ শর্ত [রিফান্ড ও রিপ্লেসমেন্ট নীতিমালা](/refund-policy) পেজে।',
    qEn: 'What should I do if my product arrives broken, defective or wrong?',
    aEn: 'If you receive a manufacturing defect, a damaged item or the wrong product, we send a replacement at no extra delivery charge. A continuous, uncut unboxing video from the moment you start opening the parcel is mandatory. Message us on WhatsApp (01897-804055) with your order number and the video as soon as possible, ideally within 24–48 hours of receiving the parcel. After verification the replacement is booked within 24 hours. Full conditions are in our [Refund & Replacement Policy](/refund-policy).',
  },
  {
    q: 'পছন্দ না হলে কি পণ্য ফেরত দেওয়া যায়?',
    a: 'না, পণ্যে কোনো ত্রুটি না থাকলে শুধু পছন্দ না হওয়া বা মন পরিবর্তনের কারণে ফেরত বা রিফান্ড হয় না। কুরিয়ার কর্মীরাও স্পটে রিটার্ন নেন না, তাই অর্ডারের আগে ছবি ও স্পেসিফিকেশন ভালো করে দেখে নিন। পণ্যে প্রকৃত ত্রুটি থাকলে ১০০% ফ্রি রিপ্লেসমেন্ট পাবেন, বিস্তারিত [শর্তাবলী](/terms)-তে।',
    qEn: 'Can I return a product if I do not like it?',
    aEn: 'No. If the product has no defect, returns and refunds are not available for personal preference or a change of mind, and courier staff do not accept returns on the spot, so please check the photos and specifications before ordering. If the product has a genuine defect you get a 100% free replacement. See our [Terms & Conditions](/terms) for details.',
  },
];

export async function fetchFAQs(supabase: SupabaseClient): Promise<Faq[]> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('setting_value')
      .eq('setting_key', 'vc_faqs')
      .maybeSingle();
    if (error || !data) return DEFAULT_FAQS;

    const raw = data.setting_value;
    const parsed = typeof raw === 'string'
      ? (() => { try { return JSON.parse(raw); } catch { return null; } })()
      : raw;

    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].q && parsed[0].a) {
      return parsed as Faq[];
    }
    return DEFAULT_FAQS;
  } catch {
    return DEFAULT_FAQS;
  }
}

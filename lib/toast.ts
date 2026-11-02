export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastDetail {
  message: string;
  type: ToastType;
  id: number;
}

export const TOAST_EVENT = 'vc:showToast';

let toastSeq = 0;

/**
 * টেক্সট থেকে কাঁচা ইমোজি ও অপ্রয়োজনীয় চিহ্ন সরিয়ে প্রমিত ও ঝরঝরে টেক্সট তৈরি করা
 */
export function cleanToastMessage(msg: string): string {
  if (!msg) return '';
  return msg
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // কাঁচা ইমোজি রিমুভ
    .replace(/^[✅❌❤️🔔🎉⚠️ℹ️✓✕\s•\-]+/, '') // প্রিফিক্স চিহ্ন ও ইমোজি রিমুভ
    .trim();
}

/**
 * 🎯 সুনির্দিষ্ট এক্সাক্ট ম্যাপিং ডিকশনারি (Exact Message Registry)
 * সিস্টেম কোনো অনুমান না করে সরাসরি এই নিশ্চিত তালিকা অনুযায়ী টাইপ নির্ধারণ করবে।
 */
const EXACT_TOAST_MAP: Record<string, ToastType> = {
  // ─────────────────────────────────────────────────────────────
  // ১. নিশ্চিত এরর তালিকা (Error Registry -> লাল)
  // ─────────────────────────────────────────────────────────────
  'কুপন কোডটি সঠিক নয়': 'error',
  'কুপন কোডটি সঠিক নয়': 'error',
  'invalid coupon code': 'error',
  'অবৈধ কুপন কোড': 'error',
  'স্টক শেষ!': 'error',
  'স্টক শেষ': 'error',
  'দুঃখিত, পণ্যটির স্টক শেষ হয়ে গেছে': 'error',
  'দুঃখিত, পণ্যটির স্টক শেষ হয়ে গেছে': 'error',
  'out of stock!': 'error',
  'out of stock': 'error',
  'কার্ট খালি!': 'error',
  'আপনার কার্ট খালি': 'error',
  'আপনার কার্টে কোনো পণ্য নেই': 'error',
  'আপনার কার্ট খালি। অনুগ্রহ করে প্রথমে একটি প্রোডাক্ট কার্টে যোগ করুন।': 'error',
  'your cart is empty': 'error',
  'উভয় পাসওয়ার্ড একই হতে হবে': 'error',
  'দুটো পাসওয়ার্ড মিলছে না': 'error',
  'both passwords must match': 'error',
  'ডাউনলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।': 'error',
  'ডাউনলোড ব্যর্থ হয়েছে': 'error',
  'download failed': 'error',
  'দুঃখিত, অর্ডার সেভ করা যায়নি। আবার চেষ্টা করুন।': 'error',
  'sorry, the order could not be saved. please try again.': 'error',
  'নেটওয়ার্ক সমস্যা হয়েছে। আবার চেষ্টা করুন।': 'error',
  'a network problem occurred. please try again.': 'error',
  'google লগইন ব্যর্থ হয়েছে': 'error',
  'google login failed': 'error',
  'একটি সমস্যা হয়েছে, আবার চেষ্টা করুন': 'error',
  'একটি সমস্যা হয়েছে, আবার চেষ্টা করুন': 'error',
  'তথ্য জমা দেওয়া সম্ভব হয়নি, আবার চেষ্টা করুন': 'error',
  'তথ্য জমা দেওয়া সম্ভব হয়নি, আবার চেষ্টা করুন': 'error',
  'শুধুমাত্র jpg, png বা webp ছবি গ্রহণযোগ্য': 'error',
  'only jpg, png or webp images are accepted': 'error',
  'ছবি আপলোড ব্যর্থ হয়েছে': 'error',
  'ছবি আপলোড ব্যর্থ হয়েছে': 'error',
  'ছবি কম্প্রেস করা যায়নি': 'error',
  'এরর: অনুমোদন করা যায়নি': 'error',
  'এরর: অনুমোদন করা যায়নি': 'error',
  'এরর: রিজেক্ট করা যায়নি': 'error',
  'এরর: রিজেক্ট করা যায়নি': 'error',
  'মুছে ফেলা সম্ভব হয়নি': 'error',
  'মুছে ফেলা সম্ভব হয়নি': 'error',
  'কোনো অর্ডার পাওয়া যায়নি': 'error',
  'কোনো অর্ডার পাওয়া যায়নি': 'error',
  'অর্ডার তথ্য পাওয়া যাচ্ছে না': 'error',
  'অর্ডার তথ্য পাওয়া যাচ্ছে না': 'error',
  'সমস্যা হয়েছে, হোমপেজে নিয়ে যাওয়া হচ্ছে': 'error',
  'সমস্যা হয়েছে, হোমপেজে নিয়ে যাওয়া হচ্ছে': 'error',
  'পাসওয়ার্ড পরিবর্তন করা যায়নি, লিংকের মেয়াদ শেষ হয়ে থাকতে পারে': 'error',

  // ─────────────────────────────────────────────────────────────
  // ২. নিশ্চিত ওয়ার্নিং ও সীমা তালিকা (Warning Registry -> অ্যাম্বার/হলুদ)
  // ─────────────────────────────────────────────────────────────
  'সর্বোচ্চ স্টক সীমায় পৌঁছে গেছে': 'warning',
  'সর্বোচ্চ স্টক সীমায় পৌঁছে গেছে': 'warning',
  'reached maximum stock limit': 'warning',
  'আপনি ইতিমধ্যে স্টক অ্যালার্ট চালু করেছেন': 'warning',
  'আপনি ইতিমধ্যে এই প্রোডাক্টের নোটিফিকেশন রিকোয়েস্ট জমা দিয়েছেন।': 'warning',
  'আপনি ইতিমধ্যে এই প্রোডাক্টের নোটিফিকেশন রিকোয়েস্ট জমা দিয়েছেন।': 'warning',
  'you have already requested notification for this product.': 'warning',
  'আপনি ইতিমধ্যে এই প্রোডাক্টটিতে একটি রিভিউ দিয়েছেন': 'warning',
  'আপনি ইতিমধ্যে এই প্রোডাক্টটিতে একটি রিভিউ দিয়েছেন': 'warning',
  'you have already submitted a review for this product': 'warning',
  'রিভিউ সীমা অতিক্রম করেছে': 'warning',
  'review limit exceeded': 'warning',
  'ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে': 'warning',
  'ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে': 'warning',
  'internet connection disconnected': 'warning',
  'কুপন কোড লিখুন': 'warning',
  'enter a coupon code': 'warning',

  // ─────────────────────────────────────────────────────────────
  // ৩. নিশ্চিত ইনফো ও গাইডলাইন তালিকা (Info Registry -> স্কাই-ব্লু)
  // ─────────────────────────────────────────────────────────────
  'রিভিউ দেওয়ার জন্য অনুগ্রহ করে আগে লগইন করুন': 'info',
  'রিভিউ দেওয়ার জন্য অনুগ্রহ করে আগে লগইন করুন': 'info',
  'রিভিউ দিতে অনুগ্রহ করে অ্যাকাউন্টে লগইন করুন': 'info',
  'please log in to your account to write a review': 'info',
  'স্টক নোটিফিকেশন পেতে অনুগ্রহ করে আগে লগইন করুন': 'info',
  'please login first to request stock notification': 'info',
  'লগইন সফল — অর্ডার সম্পন্ন হচ্ছে...': 'info',
  'login successful — placing your order...': 'info',
  'প্রথমে কার্টে পণ্য যোগ করুন': 'info',
  'add products to cart first': 'info',
  'পণ্যটি কার্ট থেকে সরানো হয়েছে': 'info',
  'পণ্যটি কার্ট থেকে সরানো হয়েছে': 'info',
  'কার্ট থেকে সরানো হয়েছে': 'info',
  'কার্ট থেকে সরানো হয়েছে': 'info',
  'removed from cart': 'info',
  'পণ্যটি পছন্দের তালিকা থেকে সরানো হয়েছে': 'info',
  'পণ্যটি পছন্দের তালিকা থেকে সরানো হয়েছে': 'info',
  'wishlist থেকে সরানো হয়েছে': 'info',
  'wishlist থেকে সরানো হয়েছে': 'info',
  'removed from wishlist': 'info',
  'কুপন কোডটি বাতিল করা হয়েছে': 'info',
  'কুপন কোডটি বাতিল করা হয়েছে': 'info',
  'কুপন সরানো হয়েছে': 'info',
  'কুপন সরানো হয়েছে': 'info',
  'coupon removed': 'info',
  'লগআউট হয়েছে': 'info',
  'লগআউট হয়েছে': 'info',
  'logged out': 'info',
  'সফলভাবে লগআউট সম্পন্ন হয়েছে': 'info',
  'সফলভাবে লগআউট সম্পন্ন হয়েছে': 'info',
  'logged out successfully': 'info',
  'ইমেইল ভেরিফাই করুন — একটি লিংক পাঠানো হয়েছে': 'info',
  'ইমেইল ভেরিফাই করুন — একটি লিংক পাঠানো হয়েছে': 'info',
  'রিভিউটি রিজেক্ট করা হয়েছে': 'info',
  'রিভিউটি রিজেক্ট করা হয়েছে': 'info',
  'রিভিউটি মুছে ফেলা হয়েছে': 'info',
  'রিভিউটি মুছে ফেলা হয়েছে': 'info',
  'প্রশ্নটি মুছে ফেলা হয়েছে': 'info',
  'প্রশ্নটি মুছে ফেলা হয়েছে': 'info',
  'উত্তরটি মুছে ফেলা হয়েছে': 'info',
  'উত্তরটি মুছে ফেলা হয়েছে': 'info',

  // ─────────────────────────────────────────────────────────────
  // ৪. নিশ্চিত সাকসেস তালিকা (Success Registry -> সবুজ)
  // ─────────────────────────────────────────────────────────────
  'কার্টে যোগ হয়েছে': 'success',
  'কার্টে যোগ হয়েছে': 'success',
  'added to cart': 'success',
  'পণ্যটি পছন্দের তালিকায় যোগ হয়েছে': 'success',
  'পণ্যটি পছন্দের তালিকায় যোগ হয়েছে': 'success',
  'wishlist এ যোগ হয়েছে!': 'success',
  'wishlist এ যোগ হয়েছে!': 'success',
  'added to wishlist!': 'success',
  'লগইন সফল হয়েছে': 'success',
  'লগইন সফল হয়েছে': 'success',
  'logged in successfully': 'success',
  'google দিয়ে লগইন সফল হয়েছে': 'success',
  'google দিয়ে লগইন সফল হয়েছে': 'success',
  'signed in with google successfully': 'success',
  'অ্যাকাউন্ট তৈরি হয়েছে': 'success',
  'অ্যাকাউন্ট তৈরি হয়েছে': 'success',
  'account created': 'success',
  'পাসওয়ার্ড পরিবর্তন হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন': 'success',
  'পাসওয়ার্ড পরিবর্তন হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন': 'success',
  'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে': 'success',
  'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে': 'success',
  'password changed successfully': 'success',
  'নাম পরিবর্তন হয়েছে': 'success',
  'নাম পরিবর্তন হয়েছে': 'success',
  'name updated': 'success',
  'প্রোফাইল নাম সফলভাবে আপডেট হয়েছে': 'success',
  'প্রোফাইল নাম সফলভাবে আপডেট হয়েছে': 'success',
  'profile name updated successfully': 'success',
  'নম্বরটি সফলভাবে কপি হয়েছে': 'success',
  'নম্বরটি সফলভাবে কপি হয়েছে': 'success',
  'number copied successfully': 'success',
  'রিকোয়েস্ট সফল! স্টকে এলে জানিয়ে দেওয়া হবে।': 'success',
  'রিকোয়েস্ট সফল! স্টকে এলে জানিয়ে দেওয়া হবে।': 'success',
  'we will notify you once back in stock!': 'success',
  'রিভিউটি লাইভ করা হয়েছে!': 'success',
  'রিভিউটি লাইভ করা হয়েছে!': 'success',
  'আপনার প্রশ্নটি সফলভাবে জমা হয়েছে!': 'success',
  'আপনার প্রশ্নটি সফলভাবে জমা হয়েছে!': 'success',
  'উত্তর সফলভাবে প্রকাশিত হয়েছে!': 'success',
  'উত্তর সফলভাবে প্রকাশিত হয়েছে!': 'success',
  'আপনার রিভিউটি জমা হয়েছে! অনুমোদনের পর লাইভ হবে।': 'success',
  'আপনার রিভিউটি জমা হয়েছে! অনুমোদনের পর লাইভ হবে।': 'success',
  'ইন্টারনেট সংযোগ পুনরায় চালু হয়েছে': 'success',
  'ইন্টারনেট সংযোগ পুনরায় চালু হয়েছে': 'success',
  'internet connection restored': 'success',
  'ইনভয়েস সফলভাবে ডাউনলোড হয়েছে': 'success',
  'ইনভয়েস সফলভাবে ডাউনলোড হয়েছে': 'success',
};

/**
 * মেসেজের টাইপ শনাক্তকরণ (১ম ধাপ: নিশ্চিত ডিরেক্ট ম্যাপিং, ২য় ধাপ: সেকেন্ডারি সেফটি গার্ড)
 */
export function detectToastType(msg: string): ToastType {
  const normalized = cleanToastMessage(msg).toLowerCase().normalize('NFC');

  // ১. ডিরেক্ট এক্সাক্ট ম্যাপিং চেক (০% ভুলের নিশ্চয়তা)
  if (EXACT_TOAST_MAP[normalized]) {
    return EXACT_TOAST_MAP[normalized];
  }

  // ২. ডায়নামিক ভেরিয়েবলযুক্ত মেসেজ প্রিফিক্স চেক (যেমন: কুপন কোড নাম বা পণ্যের নামযুক্ত মেসেজ)
  for (const [key, type] of Object.entries(EXACT_TOAST_MAP)) {
    if (normalized.startsWith(key) || normalized.includes(key)) {
      return type;
    }
  }

  // ৩. সেকেন্ডারি সেফটি গার্ড (ডাটাবেজ বা সার্ভার থেকে অপ্রত্যাশিত ডায়নামিক এরর আসলে)
  if (
    normalized.includes('সঠিক নয়') ||
    normalized.includes('সঠিক নয়') ||
    normalized.includes('নয়') ||
    normalized.includes('নয়') ||
    normalized.includes('ভুল') ||
    normalized.includes('ব্যর্থ') ||
    normalized.includes('অবৈধ') ||
    normalized.includes('ত্রুটি') ||
    normalized.includes('সমস্যা') ||
    normalized.includes('নেই') ||
    normalized.includes('error') ||
    normalized.includes('failed') ||
    normalized.includes('invalid')
  ) {
    return 'error';
  }

  if (
    normalized.includes('সীমা') ||
    normalized.includes('সীমায়') ||
    normalized.includes('বিচ্ছিন্ন') ||
    normalized.includes('warning')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('লগইন করুন') ||
    normalized.includes('লগআউট') ||
    normalized.includes('সরানো') ||
    normalized.includes('info')
  ) {
    return 'info';
  }

  return 'success';
}

/**
 * পুরো ওয়েবসাইটের কেন্দ্রীয় টোস্ট নোটিফিকেশন ডিসপ্যাচার
 */
export function showToast(message: string, customType?: ToastType): void {
  if (typeof window === 'undefined' || !message) return;

  const cleaned = cleanToastMessage(message);
  if (!cleaned) return;

  const finalType = customType || detectToastType(message);
  const id = ++toastSeq;

  window.dispatchEvent(
    new CustomEvent<ToastDetail>(TOAST_EVENT, {
      detail: {
        message: cleaned,
        type: finalType,
        id,
      },
    })
  );
}

// GitHub পাথ: app/checkout/status/loading.tsx
// এই ফাইলটা ইচ্ছাকৃতভাবে StatusClient.tsx-এর নিজস্ব `!checked || !order` fallback-এর
// সাথে হুবহু মিলিয়ে রাখা হয়েছে (একই স্পিনার, একই লেআউট) — যাতে রুট-লেভেল
// loading UI থেকে কম্পোনেন্টের নিজস্ব লোডিং স্টেটে গিয়ে কোনো "বাম্প"/ফ্ল্যাশ চোখে না পড়ে।
// পাশাপাশি checkout/page.tsx থেকে এই রুটটা আগে থেকেই prefetch করা হয়, তাই
// বেশিরভাগ ক্ষেত্রে এই ফাইলটা আদৌ চোখেই পড়বে না — সরাসরি আসল কনটেন্ট দেখাবে।
import { DesktopBackdrop } from '@/app/components/ui/DesktopBackdrop';

export default function CheckoutStatusLoading() {
  return (
    <div className="relative flex min-h-[50vh] items-center justify-center lg:min-h-dvh">
      <DesktopBackdrop />
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="animate-spin text-brand-light">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    </div>
  );
}

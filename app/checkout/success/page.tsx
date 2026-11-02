import { redirect } from 'next/navigation';

// এই ডুপ্লিকেট পেজটা বাস্তব চেকআউট ফ্লো ব্যবহার করে না (submitOrderNow() সরাসরি
// /checkout/status-এ router.push করে) — কেউ পুরনো লিংক/বুকমার্ক দিয়ে এখানে ঢুকলে
// আসল, ঠিক করা পেজে (navbar/footer ছাড়া, কাজ করা ইনভয়েস বাটনসহ) পাঠানো হচ্ছে,
// যাতে এই বাগযুক্ত কপিটা আর কখনো দেখা না যায়।
export default function CheckoutSuccessPage() {
  redirect('/checkout/status');
}

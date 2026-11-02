// ইনভয়েস রুটের নিজস্ব লোডিং — আগে এই রুটে app/checkout/loading.tsx (চেকআউট ফর্মের
// স্কেলেটন) দেখা যেত, তারপর খালি স্ক্রিন, তারপর ইনভয়েস স্কেলেটন — মানে পরপর তিনটা
// আলাদা স্ক্রিন, যেটাই "বাড়ি খাওয়া"র কারণ ছিল। এখন শুরু থেকে শেষ পর্যন্ত একই
// InvoiceLoadingSkeleton দেখা যায়।
import { InvoiceLoadingSkeleton } from '@/app/components/ui/Skeletons';

export default function InvoiceLoading() {
  return <InvoiceLoadingSkeleton />;
}

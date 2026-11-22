import type { Metadata } from 'next';
import { ProductsListing, productsMetadata } from '../../../productsListing';

// ⚡ অভ্যন্তরীণ রুট — সরাসরি এক্সেস middleware /products-এ রিডাইরেক্ট করে। /products?cat=X&page=N অনুরোধ
// middleware এখানে রিরাইট করে, তাই ব্রাউজারে URL ও canonical আগের মতোই থাকে।
export const revalidate = 86400;

// খালি: বিল্ডে প্রি-রেন্ডার নেই; প্রথম ভিজিটে বানিয়ে ক্যাশ হয় (on-demand ISR)
export async function generateStaticParams() {
  return [];
}

type Params = { cat: string; page: string };

// middleware শুধু [\p{L}\p{N}_ -] অক্ষর পাঠায় ('%' নয়), তাই ডিকোড নিরাপদ
function dec(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { cat, page } = await params;
  return productsMetadata(dec(cat), page);
}

export default async function ProductsViewPage({ params }: { params: Promise<Params> }) {
  const { cat, page } = await params;
  return <ProductsListing cat={dec(cat)} page={page} />;
}

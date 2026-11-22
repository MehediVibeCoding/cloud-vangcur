import type { Metadata } from 'next';
import { ProductsListing, productsMetadata } from './productsListing';

// ⚡ স্ট্যাটিক (ISR): searchParams পড়া হয় না। ?cat= / ?page= থাকলে middleware অনুরোধটি
// /products/view/[cat]/[page]-এ রিরাইট করে (URL বদলায় না) — সেটাও স্ট্যাটিক ও ক্যাশযোগ্য।
export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return productsMetadata(undefined, undefined);
}

export default async function ProductsPage() {
  return <ProductsListing />;
}

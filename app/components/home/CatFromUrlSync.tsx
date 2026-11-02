'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// ?cat=<id> থাকলে ProductGrid-কে জানায় (কোনো UI আঁকে না)।
// useSearchParams() কেবল এই ছোট কম্পোনেন্টে — ProductGrid-এ নিজের <Suspense fallback={null}> দিয়ে মোড়ানো,
// যাতে এর কারণে হোমের বাকি অংশ সার্ভার-রেন্ডার থেকে বাদ না পড়ে (CSR bailout এড়াতে)।
export default function CatFromUrlSync({ onCat }: { onCat: (cat: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const catFromUrl = searchParams.get('cat');
    if (!catFromUrl) return;
    onCat(catFromUrl);
  }, [searchParams, onCat]);
  return null;
}

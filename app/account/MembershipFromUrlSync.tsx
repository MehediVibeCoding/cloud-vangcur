'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// /account?open=membership থাকলে মেম্বারশিপ মডাল খোলে এবং URL থেকে প্যারামিটারটা মুছে দেয় (কোনো UI আঁকে না)।
// useSearchParams() কেবল এই ছোট কম্পোনেন্টে — AccountClient এটাকে নিজের <Suspense fallback={null}> দিয়ে মোড়ায়,
// যাতে এর কারণে পুরো অ্যাকাউন্ট পেজ সার্ভার-রেন্ডার থেকে বাদ না পড়ে (CSR bailout এড়াতে)।
// হোমের CatFromUrlSync-এর একই প্যাটার্ন। `onOpen` অবশ্যই স্থিতিশীল রেফারেন্স হতে হবে।
export default function MembershipFromUrlSync({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('open') === 'membership') {
      onOpen();
      router.replace('/account', { scroll: false });
    }
  }, [searchParams, router, onOpen]);

  return null;
}

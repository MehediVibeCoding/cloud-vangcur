'use client';

// কাস্টমার রিভিউ ছবি আপলোড — R2 ভার্সন। পুরনো lib/cloudinaryUpload.ts-এর
// compressImageToWebp ফাংশনটাই পুনরায় ব্যবহার করা হচ্ছে (কম্প্রেশন লজিক অপরিবর্তিত),
// শুধু আপলোড ডেস্টিনেশন Cloudinary থেকে বদলে নিজের /api/upload-review-image রুটে।

import { compressImageToWebp } from './cloudinaryUpload';

/**
 * ছবি কম্প্রেস করে নিজের সার্ভার রুটে পাঠায়, যেটা R2-তে আপলোড করে।
 * রিটার্ন করে R2-তে সেভ হওয়া ছবির পাবলিক URL (https://img.vangcur.com/reviews/...)।
 */
export async function uploadReviewImageToR2(file: File): Promise<string> {
  const compressedBlob = await compressImageToWebp(file);

  const formData = new FormData();
  formData.append('file', compressedBlob, 'review.webp');

  let res: Response;
  try {
    res = await fetch('/api/upload-review-image', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    });
  } catch (netErr) {
    console.error('[Review upload] R2 আপলোড রুটে পৌঁছানো যায়নি:', netErr);
    const timedOut = netErr instanceof DOMException && (netErr.name === 'TimeoutError' || netErr.name === 'AbortError');
    throw new Error(timedOut ? 'আপলোডে অনেক সময় লাগছে (১৫ সেকেন্ড পার)' : 'নেটওয়ার্ক সমস্যা, সংযোগ যাচাই করুন');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    console.error('[Review upload] আপলোড ব্যর্থ:', res.status, data);
    throw new Error(data?.message || `ছবি আপলোড ব্যর্থ হয়েছে (HTTP ${res.status})`);
  }

  return data.url as string;
}

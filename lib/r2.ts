// R2 (Cloudflare) আপলোড হেল্পার — মূল সাইটের জন্য।
//
// ⚠️ এই ফাইলটা শুধু সার্ভার-সাইডে (API route / server action) ব্যবহার হবে —
// কখনো 'use client' কম্পোনেন্টে import করা যাবে না।
//
// 🔧 ফিক্স: আগে এটা শুধু S3-compatible API (@aws-sdk/client-s3 + access key) দিয়ে
// লিখত, যেটা Cloudflare Workers রানটাইমে ভরসাযোগ্য না — আপলোড নিঃশব্দে ফেল করত।
// এখন প্রধান পথ R2 native binding (wrangler.jsonc-এর `REVIEWS_BUCKET`) — Worker-এর
// ভেতর থেকে সরাসরি bucket-এ লেখে, কোনো key/SDK লাগে না। binding না পাওয়া গেলে
// (যেমন লোকাল `next dev`) আগের S3 পথে নামে, তাই ডেভ পরিবেশ ভাঙে না।
//
// env (শুধু URL তৈরির জন্য): R2_PUBLIC_BASE_URL — না থাকলে https://img.vangcur.com।
// S3 ফলব্যাকের জন্য আগের R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY /
// R2_BUCKET_NAME লাগে (শুধু লোকাল ডেভে)।

import { getCloudflareContext } from '@opennextjs/cloudflare';

const DEFAULT_PUBLIC_BASE = 'https://img.vangcur.com';

export interface R2UploadResult {
  ok: boolean;
  url?: string;
  message?: string;
}

// ন্যূনতম টাইপ — শুধু যে মেথড লাগে সেটুকু
interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
  delete(keys: string | string[]): Promise<void>;
}

function getBucketBinding(): R2BucketLike | null {
  try {
    const env = getCloudflareContext().env as unknown as { REVIEWS_BUCKET?: R2BucketLike };
    return env?.REVIEWS_BUCKET ?? null;
  } catch {
    // Cloudflare কনটেক্সট নেই (লোকাল next dev) — S3 ফলব্যাকে যাবে
    return null;
  }
}

function publicUrlFor(path: string): string {
  const raw = process.env.R2_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE;
  const base = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return `${base}/${path}`;
}

async function putViaS3(buffer: Buffer, path: string, contentType: string): Promise<void> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('R2 binding পাওয়া যায়নি এবং S3 env vars-ও সেট নেই');
  }
  // শুধু ফলব্যাকে লাগে, তাই ডাইনামিক import — মূল পথে SDK লোডই হয় না
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

/**
 * ফাইল R2-তে আপলোড করে পাবলিক URL ফেরত দেয়।
 * prefix: path-এর ফোল্ডার অংশ (এই সাইটে এখন শুধু 'reviews' ব্যবহার হবে)।
 */
export async function uploadToR2(file: File, prefix: string, ext: string): Promise<R2UploadResult> {
  try {
    const path = `${prefix}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const bucket = getBucketBinding();
    if (bucket) {
      await bucket.put(path, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });
    } else {
      await putViaS3(Buffer.from(arrayBuffer), path, file.type);
    }

    return { ok: true, url: publicUrlFor(path) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'R2 আপলোড ব্যর্থ' };
  }
}

/**
 * পাবলিক URL (https://img.vangcur.com/reviews/xxx.webp) থেকে R2-এর key ('reviews/xxx.webp') বের করে।
 * শুধু আমাদের নিজের পাবলিক হোস্ট এবং `reviews/` prefix-এর নিরাপদ-নামের ফাইল গ্রহণযোগ্য — অন্য সবকিছুতে null,
 * যাতে এই ফাংশন দিয়ে bucket-এর অন্য কোনো অবজেক্ট মোছার সুযোগ না থাকে।
 */
export function r2ReviewKeyFromUrl(url: string): string | null {
  try {
    const base = new URL(process.env.R2_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE);
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.host !== base.host) return null;
    const key = decodeURIComponent(u.pathname.replace(/^\//, ''));
    return /^reviews\/[A-Za-z0-9_.-]{1,120}$/.test(key) ? key : null;
  } catch {
    return null;
  }
}

/** R2 থেকে একগুচ্ছ অবজেক্ট মোছে (key-গুলো r2ReviewKeyFromUrl দিয়ে যাচাই-করা হওয়া উচিত)। ব্যর্থ হলে false */
export async function deleteFromR2(keys: string[]): Promise<boolean> {
  if (!keys.length) return true;
  try {
    const bucket = getBucketBinding();
    if (bucket) {
      await bucket.delete(keys);
      return true;
    }
    // লোকাল ডেভ ফলব্যাক (S3 API)
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return false;
    const { S3Client, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    await client.send(
      new DeleteObjectsCommand({ Bucket: bucketName, Delete: { Objects: keys.map((Key) => ({ Key })) } }),
    );
    return true;
  } catch {
    return false;
  }
}


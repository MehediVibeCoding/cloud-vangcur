// সার্ভার-সাইড ফাইল ভ্যালিডেশন — অ্যাডমিন প্যানেলের lib/uploadValidation.ts-এর
// সাথে হুবহু একই লজিক। ক্লায়েন্ট থেকে file.type পাঠানো স্পুফ করা সম্ভব, তাই
// ফাইলের আসল বাইট (magic bytes) পড়ে নিশ্চিত হওয়া হয়।

export const ALLOWED_IMAGE_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — ক্লায়েন্টে আগেই WebP-তে কম্প্রেস হয়ে আসে, তাই এটাই যথেষ্ট

export interface UploadValidationResult {
  ok: boolean;
  message?: string;
  ext?: string;
}

/**
 * ফাইলের প্রথম ১২ বাইট পড়ে দেখে সেটা ঘোষিত mime-এর real file signature-এর
 * সাথে মেলে কিনা। শুধু JPEG/PNG/WebP সাপোর্ট করে — অন্য যেকোনো মিলে false।
 */
export async function verifyImageMagicBytes(file: File, mime: string): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (mime === 'image/jpeg') {
      // FF D8 FF
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    }
    if (mime === 'image/png') {
      // 89 50 4E 47 0D 0A 1A 0A
      return (
        head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 &&
        head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a
      );
    }
    if (mime === 'image/webp') {
      // 'RIFF'....'WEBP'
      const str = (i: number) => String.fromCharCode(head[i]);
      const riff = str(0) + str(1) + str(2) + str(3);
      const webp = str(8) + str(9) + str(10) + str(11);
      return riff === 'RIFF' && webp === 'WEBP';
    }
    return false;
  } catch {
    return false;
  }
}

export const MAGIC_BYTE_MISMATCH_MESSAGE =
  'ফাইলের ভেতরের ডাটা ঘোষিত ফরম্যাটের সাথে মেলেনি — আসল JPG/PNG/WebP ছবি আপলোড করুন';

export async function validateImageUpload(file: File): Promise<UploadValidationResult> {
  if (!file || file.size === 0) {
    return { ok: false, message: 'কোনো ফাইল পাওয়া যায়নি' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: 'ফাইল সাইজ সর্বোচ্চ 5MB হতে পারবে' };
  }
  const ext = ALLOWED_IMAGE_MIME[file.type];
  if (!ext) {
    return { ok: false, message: 'শুধুমাত্র JPG, PNG বা WebP ছবি আপলোড করা যাবে' };
  }
  const magicOk = await verifyImageMagicBytes(file, file.type);
  if (!magicOk) {
    return { ok: false, message: MAGIC_BYTE_MISMATCH_MESSAGE };
  }
  return { ok: true, ext };
}

'use client';

// প্রোডাক্ট ডিটেইল পেজের স্কেলেটন — loading.tsx, রুট-লেভেল fallback ও (ভবিষ্যতে) অন্য যেকোনো জায়গা
// থেকে একই কম্পোনেন্ট ব্যবহার হয়, যাতে সব জায়গায় পিক্সেল-পিক্সেল এক থাকে।
//
// 🎯 আসল পেজ (app/product/[slug]/ProductDetailClient.tsx) এর সাথে মাপ মেলানো আছে (মোবাইল, ১২px/১৬px বেস):
//   • ছবির বাক্সের ভেতরের রঙ আসল পেজের ছবি-প্লেসহোল্ডারের (GalleryImg) রঙের সাথে এক (bg-brand-bg/30, স্থির —
//     pulse নেই, যাতে স্কেলেটন → আসল পেজে বদলের সময় রঙের ধাপ/সাদা ঝলক না আসে)।
//   • ডট + থাম্বনেইল স্ট্রিপ শুধু একাধিক ছবি থাকলে (আসল পেজও তাই করে) — না মিললে পুরো ডান অংশ ~১০২px লাফ দিত।
//   • ডান কলামের প্রতিটা সারির উচ্চতা আসল সারির line-height/padding থেকে হিসাব করা (টাইটেল ২১px×leading-snug,
//     দাম ২৮px×১.৫, পরিমাণ-সারি ৪০px, বাটন py-3.5+২০px লাইন ইত্যাদি) — হেডলেস Chromium-এ মেপে দেখা: ০px ফারাক।
// ফাইলের মাপ বদলালে scripts-এর মতো করে আসল পেজের সাথে আবার মিলিয়ে নিতে হবে।
import SkeletonNavbar from '@/app/components/ui/SkeletonNavbar';
import { PRODUCT_PAGE_BG } from '@/lib/productPageBg';
import { useT } from '@/lib/i18n/useT';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { hasWarranty } from '@/lib/warrantyData';
import type { NavPreviewProduct } from '@/lib/productNavHint';
import { GalleryBadge, PriceRow, StockLine, WarrantyBanner } from './ProductInfoBlocks';

// আসল পেজের (ProductDetailClient) আইকনগুলোর হুবহু কপি — স্কেলেটনে আসল রূপে দেখাতে
function HeartIconTwin({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function BoltIconTwin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M13 2 3 14h7l-1 8 11-14h-7l0-6Z" />
    </svg>
  );
}
function CartIconTwin() {
  return (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

/** কার্ড থেকে ছবির সংখ্যা জানা না থাকলে (সরাসরি লিংক/ব্যাক-নেভিগেশন) যা ধরা হবে। */
export const DEFAULT_PRODUCT_SKELETON_IMG_COUNT = 1;
const MAX_STRIP_ITEMS = 8;

interface ProductDetailSkeletonProps {
  /** প্রোডাক্টে কয়টা ছবি — ১ হলে ডট/থাম্বনেইল স্ট্রিপ দেখানো হয় না (আসল পেজের মতো) */
  imgCount?: number | null;
  /**
   * কার্ড থেকে এলে কার্ডের তথ্য। থাকলে যা কার্ডেই আছে (ছবি, ব্যাজ, দাম, স্টক, ওয়ারেন্টি, টাইটেল) তা আসল পেজের একই
   * কম্পোনেন্টে সঙ্গে সঙ্গে দেখানো হয়; বাকিটা (স্পেক পিল, পরিমাণ, বাটন) স্কেলেটন থাকে।
   * টাইটেল: ব্যাচ ২ থেকে লিস্টিং কুয়েরিতে seo_h1 আসে, তাই হিন্টের `title` (= আসল পেজের `seoH1 || name`) হুবহু
   * সেটাই দেখানো হয়। title খালি (পুরনো ক্যাশ/অন্য উৎস) হলে আগের মতোই স্কেলেটন-বার।
   */
  product?: NavPreviewProduct | null;
}

export default function ProductDetailSkeleton({ imgCount, product }: ProductDetailSkeletonProps) {
  const { t } = useT();
  // wishlist store ব্রাউজারেই (localStorage) — কার্ডের id দিয়ে হার্ট লাল/সাদা আগেই জানা যায়, কোনো রিকোয়েস্ট নেই
  const wished = useWishlistStore((s) => (product?.id ? s.wishlist.some((x) => String(x.id) === String(product.id)) : false));
  const count = Math.min(
    Math.max(Math.round(product?.imgCount ?? imgCount ?? DEFAULT_PRODUCT_SKELETON_IMG_COUNT), 1),
    MAX_STRIP_ITEMS,
  );
  const showStrip = count > 1;
  const sold = product ? product.stock <= 0 : false;
  const cardImgIsUrl = !!product?.img && (product.img.startsWith('http://') || product.img.startsWith('https://'));

  return (
    <div className={`min-h-screen overflow-x-hidden ${PRODUCT_PAGE_BG}`} aria-busy="true">
      {/* ================= Navbar: আসল নেভবার (স্কেলেটন নয়) — ব্যাচ ২ ================= */}
      <SkeletonNavbar showHomeButton sticky={false} />

      {/* ================= মূল গ্রিড: গ্যালারি + ইনফো কলাম (আসল পেজের grid-এর হুবহু ক্লাস) ================= */}
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-4 pb-6 pt-3.5 md:grid-cols-2 md:px-8 md:pb-10">
        {/* ---------- বাম কলাম: ছবি গ্যালারি ---------- */}
        <div>
          {/* বাইরের বাক্স আসল পেজের সাথে এক (bg-white + border + shadow + radius); ভেতরের রঙ স্থির */}
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[14px] border border-border-base bg-white shadow-sh1">
            {product && <GalleryBadge sold={sold} badge={product.badge} />}
            <div className="relative h-full w-full bg-brand-bg/30">
              {cardImgIsUrl && (
                // কার্ড যে URL-এ ছবি এনেছে হুবহু সেটাই (width=380) — ব্রাউজার ক্যাশ থেকে সঙ্গে সঙ্গে আসে
                <img
                  src={optimizeCloudinaryUrl(product!.img as string, 380)}
                  alt=""
                  aria-hidden
                  draggable={false}
                  decoding="sync"
                  className="absolute inset-0 block h-full w-full select-none object-cover object-top"
                />
              )}
            </div>
          </div>

          {showStrip && (
            <>
              {/* ডট ইন্ডিকেটর — mt-4 + h-1.5 */}
              <div className="mt-4 flex justify-center gap-1.5">
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 animate-soft-pulse rounded-full ${i === 0 ? 'w-6 bg-brand-light/40' : 'w-1.5 bg-border-base'}`}
                  />
                ))}
              </div>
              {/* থাম্বনেইল স্ট্রিপ — mt-3 + h-16 + pb-1 */}
              <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 w-16 shrink-0 animate-soft-pulse rounded-[10px] border-[1.5px] border-border-base bg-brand-bg/25"
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ---------- ডান কলাম ---------- */}
        <div>
          {/* টাইটেল: কার্ডের হিন্টে আসল শিরোনাম থাকলে সেটাই (আসল পেজের h1-এর হুবহু ক্লাস); নইলে ২১px (sm: ২৪px) × leading-snug = ২৮.৮৭৫px (sm: ৩৩px) প্রতি লাইন, ২ লাইন ধরা, mb-3 */}
          {product?.title ? (
            <h1 className="mb-3 font-body text-[21px] font-bold leading-snug text-ink sm:text-2xl">{product.title}</h1>
          ) : (
            <div className="mb-3">
              {[100, 66].map((w) => (
                <div key={w} className="flex h-[28.875px] items-center sm:h-[33px]">
                  <div className="h-[18px] animate-soft-pulse rounded-lg bg-surface-muted sm:h-5" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
          )}

          {/* দাম-সারি: কার্ডের তথ্য থাকলে আসল PriceRow; নইলে স্কেলেটন (২৮px (sm: ৩২px) × line-height ১.৫ = ৪২px (sm: ৪৮px), mb-3) */}
          {product ? (
            <PriceRow price={product.price} old={product.old} />
          ) : (
            <div className="mb-3 flex h-[42px] items-center gap-x-2.5 sm:h-12">
              <div className="h-8 w-28 animate-soft-pulse rounded-lg bg-brand-light/30 sm:h-9" />
              <div className="h-4 w-16 animate-soft-pulse rounded bg-surface-muted" />
            </div>
          )}

          {/* কালার-ভ্যারিয়েন্ট সারি (কার্ডে colorGroupId থাকলে): লেবেল ১১px×১.৫=১৬.৫px + mb-2; পিল py-1.5 + ১২.৫px×১.৫ + বর্ডার ৪px = ৩৪.৭৫px; mb-4 */}
          {product?.hasColorGroup && (
            <div className="mb-4">
              <div className="mb-2 flex h-[16.5px] items-center">
                <div className="h-2.5 w-24 animate-soft-pulse rounded bg-surface-muted" />
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="h-[34.75px] w-28 animate-soft-pulse rounded-full bg-brand-bg/35" />
                <div className="h-[34.75px] w-24 animate-soft-pulse rounded-full bg-brand-bg/35" />
              </div>
            </div>
          )}

          {/* স্টক-লাইন: কার্ডের তথ্য থাকলে আসল StockLine (স্টক শেষ হলে আসল পেজেও নেই); নইলে স্কেলেটন ১২.৫px × ১.৫ = ১৮.৭৫px, mb-3 */}
          {product ? (
            !sold && <StockLine stock={product.stock} />
          ) : (
            <div className="mb-3 flex h-[18.75px] items-center">
              <div className="h-3.5 w-44 animate-soft-pulse rounded bg-surface-muted" />
            </div>
          )}

          {/* ওয়ারেন্টি ব্যানার: কার্ডের তথ্য থাকলে আসল ব্যানার (ওয়ারেন্টি না থাকলে আসল পেজেও নেই); নইলে স্কেলেটন: py-2.5 + ২০px (আইকন-বৃত্ত) + বর্ডার ২px = ৪২px, mb-5 */}
          {product ? (
            hasWarranty(product.warranty) && <WarrantyBanner warranty={product.warranty} />
          ) : (
            <div className="mb-5 h-[42px] w-full animate-soft-pulse rounded-[10px] border border-success/30 bg-success/10" />
          )}

          {/* কুইক স্পেক: লেবেল আসল লেখা (সব প্রোডাক্টেই quick-spec আছে); পিলগুলো স্কেলেটন (লেখা শুধু ডিটেইল ডেটায়) —
              লেবেল ১১px×১.৫=১৬.৫px + mb-2.5; পিল py-1.5 + ১৩px×১.৫ = ৩১.৫px; সারির গ্যাপ ৮px; mb-5 */}
          <div className="mb-5">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">{t('স্পেসিফিকেশন এক নজরে')}</div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="h-[31.5px] w-24 animate-soft-pulse rounded-full bg-brand-bg/35" />
                <div className="h-[31.5px] w-32 animate-soft-pulse rounded-full bg-brand-bg/35" />
                <div className="h-[31.5px] w-28 animate-soft-pulse rounded-full bg-brand-bg/35" />
              </div>
              <div className="flex gap-2">
                <div className="h-[31.5px] w-20 animate-soft-pulse rounded-full bg-brand-bg/35" />
                <div className="h-[31.5px] w-32 animate-soft-pulse rounded-full bg-brand-bg/35" />
              </div>
            </div>
          </div>

          {/* পরিমাণ + wishlist + share: আসল সারির হুবহু রূপ (স্থির) — স্কেলেটন অবস্থায় ট্যাপে কিছু হয় না (inert) */}
          <div className="mb-5 flex flex-wrap items-center gap-3" inert aria-hidden="true">
            <div className={`inline-flex items-center gap-2.5 rounded-full bg-brand-bg/35 py-1 pl-3.5 pr-1 ${sold ? 'opacity-50' : ''}`}>
              <span className="text-[13px] font-semibold text-ink">{t('পরিমাণ')}</span>
              <div className="flex items-center gap-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-ink opacity-30">−</span>
                <span className="min-w-[26px] text-center text-[14px] font-bold text-ink">{sold ? 0 : 1}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-ink">+</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-[10px] border ${
                  wished
                    ? 'border-[#FF5A6E]/40 bg-[#FF5A6E]/10 text-[#FF5A6E]'
                    : 'border-brand-light/30 bg-brand-bg/35 text-ink'
                }`}
              >
                <HeartIconTwin filled={wished} />
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-brand-light/30 bg-brand-bg/35 text-ink">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="5" r="2.6" />
                  <circle cx="6" cy="12" r="2.6" />
                  <circle cx="18" cy="19" r="2.6" />
                  <path d="M8.3 10.7l7.4-4.3M8.3 13.3l7.4 4.3" />
                </svg>
              </span>
            </div>
          </div>

          {/* কার্ট/অর্ডার বাটন: আসল বাটনের হুবহু ক্লাস ও লেখা (স্টক থাকলে); স্টক শেষ হলে (বেল-বাটন আসল পেজে) আগের মতো স্কেলেটন-বার।
              ট্যাপে কিছু হয় না (inert) — স্কেলেটন কয়েক শ' মিলিসেকেন্ড থাকে, তারপর আসল বাটন বসে */}
          <div className="flex flex-col gap-2.5" aria-hidden="true">
            {product && !sold ? (
              <div className="flex flex-col gap-2.5" inert>
                <span className="relative flex w-full select-none items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-brand-light/40 bg-brand-bg/35 py-3.5 font-body text-sm font-bold text-brand-light">
                  <span className="inline-flex items-center justify-center">
                    <CartIconTwin />
                  </span>
                  <span>{t('কার্টে যোগ করুন')}</span>
                </span>
                <span className="flex w-full items-center justify-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-info to-brand-light py-3.5 font-body text-sm font-bold text-white shadow-sh2">
                  <BoltIconTwin />
                  <span>{t('এখনই অর্ডার করুন')}</span>
                </span>
              </div>
            ) : (
              <>
                <div className="w-full animate-soft-pulse rounded-[14px] border-[1.5px] border-brand-light/30 bg-brand-bg/25 py-3.5">
                  <div className="h-5" />
                </div>
                <div className="w-full animate-soft-pulse rounded-[14px] bg-brand-light/50 py-3.5">
                  <div className="h-5" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

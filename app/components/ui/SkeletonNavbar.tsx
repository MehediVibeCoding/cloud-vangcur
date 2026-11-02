'use client';

// স্কেলেটনের ভেতরে নকল নেভবারের বদলে আসল <Navbar> — ব্যাচ ২।
// নেভবারের সব তথ্য (কার্ট/উইশলিস্ট কাউন্ট, ইউজার) ব্রাউজারের localStorage-ভিত্তিক store থেকে আসে, কোনো নেটওয়ার্ক/ডাটাবেজ
// কল লাগে না — তাই স্কেলেটন থেকে আসল পেজে বদলের সময় নেভবার একটুও নড়ে না। (নতুন কোনো রিকোয়েস্ট যোগ হয় না।)
import Navbar from '@/app/components/layout/Navbar';
import { useCartStore, cartCount } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useAuthStore } from '@/lib/store/authStore';
import { OPEN_CART_EVENT, OPEN_WISHLIST_EVENT, OPEN_TRACK_ORDER_EVENT } from '@/lib/uiEvents';

interface SkeletonNavbarProps {
  /** "ফিরে যান" বাটন ভ্যারিয়েন্ট (প্রোডাক্ট/অফার/প্রোডাক্টস পেজ); না দিলে লোগো ভ্যারিয়েন্ট (হোম/ক্যাটাগরি) */
  showHomeButton?: boolean;
  /** আসল পেজ যেমন: প্রোডাক্ট/অফার পেজে false, বাকিতে true */
  sticky?: boolean;
}

export default function SkeletonNavbar({ showHomeButton = false, sticky = true }: SkeletonNavbarProps) {
  const cartQty = useCartStore((s) => cartCount(s.cart));
  const wishQty = useWishlistStore((s) => s.wishlist.length);
  const currentUser = useAuthStore((s) => s.currentUser);

  return (
    <Navbar
      showHomeButton={showHomeButton}
      sticky={sticky}
      cartCount={cartQty}
      wishCount={wishQty}
      currentUser={currentUser}
      onCartClick={() => window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT))}
      onWishClick={() => window.dispatchEvent(new CustomEvent(OPEN_WISHLIST_EVENT))}
      onTrackClick={() => window.dispatchEvent(new CustomEvent(OPEN_TRACK_ORDER_EVENT))}
      onLoginClick={() => {}}
    />
  );
}

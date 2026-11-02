'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/app/components/layout/Navbar';
import { useCartStore, cartCount } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useAuthStore } from '@/lib/store/authStore';
import { OPEN_CART_EVENT, OPEN_WISHLIST_EVENT, OPEN_TRACK_ORDER_EVENT } from '@/lib/uiEvents';
import { useT } from '@/lib/i18n/useT';
import type { GuidePage } from '@/types/guides';
import { GuideBlockRenderer, type ProductSnapshot } from '@/app/components/guides/GuideBlocks';

const LoginModal = dynamic(() => import('@/app/components/auth/LoginModal'));

export default function GuidePageClient({
  page,
  productSnapshots,
  relatedLinkHrefs,
}: {
  page: GuidePage;
  templateName: { bn: string; en: string };
  productSnapshots: Record<number, ProductSnapshot>;
  relatedLinkHrefs: Record<string, string>;
}) {
  const { lang } = useT();
  const cartQty = useCartStore((s) => cartCount(s.cart));
  const wishQty = useWishlistStore((s) => s.wishlist.length);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg/25 via-white to-white">
      <Navbar
        showHomeButton
        sticky={false}
        cartCount={cartQty}
        wishCount={wishQty}
        currentUser={currentUser}
        onCartClick={() => window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT))}
        onWishClick={() => window.dispatchEvent(new CustomEvent(OPEN_WISHLIST_EVENT))}
        onTrackClick={() => window.dispatchEvent(new CustomEvent(OPEN_TRACK_ORDER_EVENT))}
        onLoginClick={() => setLoginOpen(true)}
      />

      <article className="pt-2 sm:pt-3">
        {page.blocks.map((block, i) => (
          <GuideBlockRenderer
            key={block.id}
            block={block}
            lang={lang}
            productSnapshots={productSnapshots}
            relatedLinkHrefs={relatedLinkHrefs}
            nextBlock={page.blocks[i + 1]}
          />
        ))}
      </article>

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

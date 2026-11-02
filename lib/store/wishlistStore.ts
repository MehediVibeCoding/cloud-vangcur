import { create } from 'zustand';
import type { Product, WishlistItem } from '@/types';
import { showToast } from '@/lib/toast';
import { translate } from '@/lib/i18n/translate';
import { subscribeTabSync, notifyTabSync } from '@/lib/crossTabSync';

// ❤️ উইশলিস্টে সর্বোচ্চ কতটি পণ্য রাখা যাবে
export const WISHLIST_MAX = 40;

const WISH_KEY = 'vc_wish';
const WISH_CHANNEL = 'vc-wish-sync';

function loadWishlist(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(WISH_KEY) || '[]');
  } catch {
    return [];
  }
}

function persist(w: WishlistItem[]): void {
  try {
    localStorage.setItem(WISH_KEY, JSON.stringify(w));
  } catch {
    // storage unavailable, ignore
  }
  // 🔄 অন্য খোলা ট্যাবকে জানানো
  notifyTabSync(WISH_CHANNEL);
}

interface WishlistState {
  wishlist: WishlistItem[];
  addedTick: number;
  hydrated: boolean;
  hydrate: () => void;
  setWishlist: (w: WishlistItem[]) => void;
  isWishlisted: (id: number | string) => boolean;
  toggleWish: (prod: Product) => boolean;
  removeItem: (id: number | string) => void;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlist: [],
  addedTick: 0,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ wishlist: loadWishlist(), hydrated: true });
    // 🔄 অন্য ট্যাবে উইশলিস্টে যোগ/বাদ দিলে এই ট্যাবও সাথে সাথে মিলে যাবে
    subscribeTabSync(WISH_CHANNEL, WISH_KEY, () => {
      set({ wishlist: loadWishlist() });
    });
  },

  setWishlist: (wishlist) => {
    persist(wishlist);
    set({ wishlist });
  },

  isWishlisted: (id) => get().wishlist.some((x) => String(x.id) === String(id)),

  toggleWish: (prod) => {
    let w = get().wishlist;
    const already = w.some((x) => String(x.id) === String(prod.id));
    if (already) {
      w = w.filter((x) => String(x.id) !== String(prod.id));
      showToast(translate('Wishlist থেকে সরানো হয়েছে'));
      persist(w);
      set({ wishlist: w });
    } else {
      if (w.length >= WISHLIST_MAX) {
        showToast(translate('Wishlist-এ সর্বোচ্চ ৪০টি পণ্য রাখা যায়। নতুন যোগ করতে আগে কিছু সরান।'), 'warning');
        return false;
      }
      w = [...w, { id: prod.id, name: prod.name, emoji: prod.imgs[0], price: prod.price, cat: prod.cat }];
      showToast(translate('❤️ Wishlist এ যোগ হয়েছে!'));
      persist(w);
      set((s) => ({ wishlist: w, addedTick: s.addedTick + 1 }));
    }
    return !already;
  },

  removeItem: (id) => {
    const wishlist = get().wishlist.filter((x) => String(x.id) !== String(id));
    persist(wishlist);
    set({ wishlist });
  },

  clearWishlist: () => {
    persist([]);
    set({ wishlist: [] });
  },
}));

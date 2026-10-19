import { create } from 'zustand';
import type { CurrentUser } from '@/types';
import { subscribeTabSync, notifyTabSync } from '@/lib/crossTabSync';

const USER_KEY = 'vc_user';
const AUTH_CHANNEL = 'vc-auth-sync';

function loadUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function persist(user: CurrentUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // storage unavailable, ignore
  }
  // 🔄 অন্য খোলা ট্যাবকে জানানো — যেমন এক ট্যাবে লগআউট করলে আরেক ট্যাবও লগইন-স্টেট হারায়
  notifyTabSync(AUTH_CHANNEL);
}

interface AuthState {
  currentUser: CurrentUser | null;
  hydrated: boolean;
  hydrate: () => void;
  setCurrentUser: (user: CurrentUser | null) => void;
}

// 🔒 ফিক্স (audit P1-17, hydration #418 সন্দেহ): আগে `currentUser: loadUser()`
// দিয়ে initial state-এ সরাসরি localStorage পড়া হতো — সার্ভার সবসময় `null`
// রেন্ডার করে (window নেই), কিন্তু ক্লায়েন্টের প্রথম (হাইড্রেশন) পাসেই আসল ইউজার
// পাওয়া যেত, mismatch হতো। এখন cartStore/wishlistStore/themeStore-এর মতোই
// lazy-hydrate প্যাটার্ন — initial state সবসময় null (সার্ভারের সাথে মেলে),
// mount হওয়ার পরে hydrate() কল হয়ে আসল ইউজার বসে (GlobalOverlays.tsx)।
export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ currentUser: loadUser(), hydrated: true });
    // 🔄 অন্য ট্যাবে লগইন/লগআউট হলে এই ট্যাবও সাথে সাথে একই অবস্থায় চলে আসবে
    subscribeTabSync(AUTH_CHANNEL, USER_KEY, () => {
      set({ currentUser: loadUser() });
    });
  },

  setCurrentUser: (user) => {
    persist(user);
    set({ currentUser: user, hydrated: true });
  },
}));

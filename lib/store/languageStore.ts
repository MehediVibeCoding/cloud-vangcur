import { create } from 'zustand';

export type Language = 'bn' | 'en';

const LANG_KEY = 'vc_lang';

// 🔒 হাইড্রেশন-নিরাপদ নকশা: সার্ভারের HTML এখন সবসময় বাংলা (lib/i18n/getServerLang.ts)
// এবং ক্যাশ হয়ে সবার কাছে যায়। তাই ক্লায়েন্টের প্রথম রেন্ডারও অবশ্যই 'bn' হতে হবে,
// নইলে হাইড্রেশন mismatch (React #418) হবে। সংরক্ষিত ভাষা (`vc_lang` কুকি) হাইড্রেশনের
// পরে `hydrateLanguage()` দিয়ে প্রয়োগ হয় — GlobalOverlays মাউন্ট হলে একবার কল হয়।
function readSavedLanguage(): Language {
  if (typeof document === 'undefined') return 'bn';
  try {
    const match = document.cookie.match(/(?:^|;\s*)vc_lang=([^;]*)/);
    if (match) return decodeURIComponent(match[1]) === 'en' ? 'en' : 'bn';
  } catch {
    // ignore
  }
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'bn';
  } catch {
    return 'bn';
  }
}

function persist(lang: Language): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // storage unavailable, ignore
  }
  try {
    document.cookie = `${LANG_KEY}=${lang}; path=/; max-age=31536000; samesite=lax; secure`;
  } catch {
    // cookies unavailable, ignore — client-side language switching still works
  }
}

interface LanguageState {
  lang: Language;
  setLanguage: (lang: Language) => void;
  /** হাইড্রেশনের পর একবার কল করুন — সংরক্ষিত ভাষা (কুকি/localStorage) প্রয়োগ করে। */
  hydrateLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  lang: 'bn',
  setLanguage: (lang) => {
    persist(lang);
    set({ lang });
  },
  hydrateLanguage: () => {
    const saved = readSavedLanguage();
    if (saved !== get().lang) set({ lang: saved });
  },
}));

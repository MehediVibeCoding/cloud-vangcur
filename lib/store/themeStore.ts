import { create } from 'zustand';
import { useAuthStore } from './authStore';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'vc_theme';

function isLoggedIn(): boolean {
  return !!useAuthStore.getState().currentUser;
}

function applyThemeClass(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

// INTENTIONAL (বাগ না): এখানে ইচ্ছাকৃতভাবে সিস্টেম/OS ডার্ক-মোড প্রেফারেন্স (prefers-color-scheme)
// চেক করা হয় না — ডার্ক মোড শুধু তখনই দেখা যাবে যখন একজন লগইন করা ইউজার
// নিজের ইচ্ছায় টগল করেছেন। গেস্ট/লগআউট অবস্থায় সবসময় লাইট মোড থাকবে।
function loadSavedTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // storage unavailable
  }
  return 'light';
}

function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage blocked/unavailable
  }
  try {
    document.cookie = `${THEME_KEY}=${theme}; path=/; max-age=31536000; samesite=lax; secure`;
  } catch {
    // cookies unavailable
  }
  applyThemeClass(theme);
}

interface ThemeState {
  theme: Theme;
  hydrated: boolean;
  hydrate: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;

    // লগইন করা না থাকলে সেভ করা প্রেফারেন্স থাকলেও উপেক্ষা করে সবসময় লাইট
    const initial = isLoggedIn() ? loadSavedTheme() : 'light';
    applyThemeClass(initial);
    set({ theme: initial, hydrated: true });

    // লগইন/লগআউট হলে থিম রি-সিঙ্ক — লগআউট করলেই সাথে সাথে লাইট মোডে ফিরে
    // যাবে, আবার লগইন করলে তার আগের সেভ করা প্রেফারেন্স ফিরে আসবে
    useAuthStore.subscribe((state, prevState) => {
      const wasLoggedIn = !!prevState.currentUser;
      const nowLoggedIn = !!state.currentUser;
      if (wasLoggedIn === nowLoggedIn) return;

      const nextTheme: Theme = nowLoggedIn ? loadSavedTheme() : 'light';
      applyThemeClass(nextTheme);
      set({ theme: nextTheme });
    });
  },

  setTheme: (theme) => {
    if (theme === 'dark' && !isLoggedIn()) return; // গেস্ট কখনো ডার্ক মোড সেট করতে পারবে না
    persistTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    if (!isLoggedIn()) return; // গেস্ট টগল করতে পারবে না
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    persistTheme(nextTheme);
    set({ theme: nextTheme });
  },
}));

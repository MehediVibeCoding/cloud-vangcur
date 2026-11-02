import { useLanguageStore } from '@/lib/store/languageStore';
import { staticDictionary } from './dictionary';

/**
 * Non-hook translation helper for use OUTSIDE React render — e.g. Zustand
 * store actions, plain utility functions — where the `useT()` hook can't be
 * called. Reads the current language via `getState()` (a plain function
 * call, not a hook), so it's safe to import anywhere.
 *
 * Inside a React component, always prefer `useT()` from '@/lib/i18n/useT'
 * instead, since it re-renders reactively when the language changes.
 */
export function translate(text: string): string {
  const lang = useLanguageStore.getState().lang;
  if (lang !== 'en') return text;
  return staticDictionary[text] ?? text;
}

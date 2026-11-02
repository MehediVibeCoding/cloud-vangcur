// সার্চ বক্সে ক্লিক করলেই (কিছু না লিখেও) আগের করা সার্চগুলো দেখানোর জন্য এই
// helper — localStorage-এ সংরক্ষণ করা হয়, তাই ইউজার পেজ রিলোড করলেও/আবার আসলেও
// তার সাম্প্রতিক অনুসন্ধানগুলো থেকে যায়।

const STORAGE_KEY = 'vc_recent_searches';
const MAX_ITEMS = 6;

function safeParse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  } catch {
    // corrupted value — ignore, treat as empty
  }
  return [];
}

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return safeParse(window.localStorage.getItem(STORAGE_KEY)).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string): string[] {
  const q = (term || '').trim();
  if (typeof window === 'undefined' || !q) return getRecentSearches();
  try {
    const withoutDup = getRecentSearches().filter((t) => t.toLowerCase() !== q.toLowerCase());
    const next = [q, ...withoutDup].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return getRecentSearches();
  }
}

export function removeRecentSearch(term: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const next = getRecentSearches().filter((t) => t !== term);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return getRecentSearches();
  }
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

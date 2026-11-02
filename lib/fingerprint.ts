'use client';

const STORAGE_KEY = 'vc_fp_id';

let cached: Promise<string> | null = null;

async function loadVisitorId(): Promise<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // localStorage may be blocked — fall through to a fresh load
  }
  try {
    const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    try {
      localStorage.setItem(STORAGE_KEY, result.visitorId);
    } catch {
      // non-critical — id just won't be cached for next visit
    }
    return result.visitorId;
  } catch {
    return '';
  }
}

export function getFingerprintId(): Promise<string> {
  if (!cached) cached = loadVisitorId();
  return cached;
}

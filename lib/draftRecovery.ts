import type { CartItem } from '@/types';

const DRAFT_KEY = 'vc_abandoned_draft';
export const MAX_DRAFT_AGE_MS = 24 * 60 * 60 * 1000;
const DISMISSED_PREFIX = 'vc_draft_dismissed_';
const IMPRESSION_PREFIX = 'vc_draft_impression_';
const SESSION_CREATION_KEY = 'vc_session_draft_created';

export interface CheckoutDraft {
  id: string;
  name: string;
  phone: string;
  dist: string;
  addr: string;
  email: string;
  items: CartItem[];
  ship?: string;
  createdAt: number;
}

export function isDraftDismissed(draftId: string): boolean {
  if (typeof window === 'undefined' || !draftId) return false;
  try {
    return localStorage.getItem(`${DISMISSED_PREFIX}${draftId}`) === '1';
  } catch {
    return false;
  }
}

export function markDraftDismissed(draftId: string): void {
  if (typeof window === 'undefined' || !draftId) return;
  try {
    localStorage.setItem(`${DISMISSED_PREFIX}${draftId}`, '1');
  } catch {
    // ignore
  }
}

export function isDraftImpressionRecorded(draftId: string): boolean {
  if (typeof window === 'undefined' || !draftId) return false;
  try {
    return localStorage.getItem(`${IMPRESSION_PREFIX}${draftId}`) === '1';
  } catch {
    return false;
  }
}

export function recordDraftImpression(draftId: string): void {
  if (typeof window === 'undefined' || !draftId) return;
  try {
    localStorage.setItem(`${IMPRESSION_PREFIX}${draftId}`, '1');
  } catch {
    // ignore
  }
}

export function isCurrentSessionDraft(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SESSION_CREATION_KEY) === '1';
  } catch {
    return false;
  }
}

export function getDraft(): CheckoutDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft: CheckoutDraft = JSON.parse(raw);

    if (Date.now() - draft.createdAt > MAX_DRAFT_AGE_MS) {
      clearDraft();
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

interface SaveDraftInput {
  name: string;
  phone: string;
  dist: string;
  addr: string;
  email: string;
  items: CartItem[];
  ship?: string;
}

export function saveDraft({ name, phone, dist, addr, email, items, ship }: SaveDraftInput): void {
  if (typeof window === 'undefined') return;
  if (!phone || !Array.isArray(items) || items.length === 0) return;
  try {
    const existing = getDraft();
    const id = existing?.id || `dr_${Date.now()}`;
    const createdAt = existing?.createdAt || Date.now();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ id, name, phone, dist, addr, email, items, ship, createdAt }),
    );
    sessionStorage.setItem(SESSION_CREATION_KEY, '1');
  } catch {
    // best effort
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function eligibleDraft(): CheckoutDraft | null {
  const draft = getDraft();
  if (!draft) return null;

  if (Date.now() - draft.createdAt > MAX_DRAFT_AGE_MS) {
    clearDraft();
    return null;
  }

  if (isDraftDismissed(draft.id)) {
    return null;
  }

  if (isDraftImpressionRecorded(draft.id)) {
    return null;
  }

  if (isCurrentSessionDraft()) {
    return null;
  }

  return draft;
}

export function dismissDraft(draftId: string, isUserDismiss = true): void {
  if (typeof window === 'undefined') return;
  if (draftId && isUserDismiss) {
    markDraftDismissed(draftId);
  }
  clearDraft();
}

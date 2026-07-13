const DRAFT_KEY = 'clearline:payment-draft';

export interface PaymentDraft {
  recipientId?: string;
  amountInput: string;
  memo: string;
  method: 'ach' | 'wire';
  manualMode: boolean;
  routingNumber: string;
  accountNumber: string;
  idempotencyKey: string;
}

/**
 * Reads the in-progress payment draft. AC-06 preserves the amount, recipient, memo AND the idempotency
 * key across a session-expiry redirect, so re-authentication resumes the exact same PaymentIntent
 * rather than starting a new one — the persisted key is what makes that a resume, not a duplicate.
 */
export function readDraft(): Partial<PaymentDraft> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<PaymentDraft>) : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: PaymentDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // A full sessionStorage (or a privacy mode that throws) shouldn't break the form.
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

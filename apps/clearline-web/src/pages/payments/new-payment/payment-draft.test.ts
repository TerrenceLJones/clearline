import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, readDraft, writeDraft, type PaymentDraft } from './payment-draft';

const DRAFT_KEY = 'clearline:payment-draft';

const sampleDraft: PaymentDraft = {
  recipientId: 'rec_acme',
  amountInput: '1234',
  memo: 'Q2 platform license',
  method: 'ach',
  manualMode: false,
  routingNumber: '',
  accountNumber: '',
  idempotencyKey: '8f2a04b1-1c2d-4e3f-8a9b-1234567890c4',
};

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('writeDraft / readDraft', () => {
  it('round-trips a draft through sessionStorage', () => {
    writeDraft(sampleDraft);
    expect(readDraft()).toEqual(sampleDraft);
  });

  it('persists the idempotency key so re-auth resumes the same intent (AC-06)', () => {
    writeDraft(sampleDraft);
    expect(readDraft()?.idempotencyKey).toBe(sampleDraft.idempotencyKey);
  });
});

describe('readDraft', () => {
  it('returns null when no draft has been written', () => {
    expect(readDraft()).toBeNull();
  });

  it('returns null (rather than throwing) on malformed JSON', () => {
    sessionStorage.setItem(DRAFT_KEY, '{not valid json');
    expect(readDraft()).toBeNull();
  });
});

describe('clearDraft', () => {
  it('removes the persisted draft', () => {
    writeDraft(sampleDraft);
    clearDraft();
    expect(readDraft()).toBeNull();
  });
});

describe('resilience to a throwing sessionStorage', () => {
  it('writeDraft swallows a quota/privacy-mode throw without propagating', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => writeDraft(sampleDraft)).not.toThrow();
  });

  it('clearDraft swallows a throw without propagating', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => clearDraft()).not.toThrow();
  });
});

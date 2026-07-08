import { describe, expect, it } from 'vitest';
import { isKybComplete } from './kyb-completion-policy';

describe('isKybComplete', () => {
  it('is complete when business info, at least one owner, and at least one verified document are present', () => {
    expect(isKybComplete({ hasBusiness: true, ownerCount: 1, documentCount: 1 })).toBe(true);
  });

  it('is incomplete without business info', () => {
    expect(isKybComplete({ hasBusiness: false, ownerCount: 2, documentCount: 2 })).toBe(false);
  });

  it('is incomplete with no beneficial owners', () => {
    expect(isKybComplete({ hasBusiness: true, ownerCount: 0, documentCount: 1 })).toBe(false);
  });

  it('is incomplete with no verified documents', () => {
    expect(isKybComplete({ hasBusiness: true, ownerCount: 1, documentCount: 0 })).toBe(false);
  });
});

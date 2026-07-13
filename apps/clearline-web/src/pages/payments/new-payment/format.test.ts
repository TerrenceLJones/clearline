import { describe, expect, it } from 'vitest';
import { arrivalEstimate, initialsFor } from './format';

describe('arrivalEstimate', () => {
  it('quotes a couple of business days for ACH and same day for a wire', () => {
    expect(arrivalEstimate('ach')).toBe('1–2 business days');
    expect(arrivalEstimate('wire')).toBe('Same day');
  });
});

describe('initialsFor', () => {
  it('takes the first letter of each word, uppercased', () => {
    expect(initialsFor('Acme Corp')).toBe('AC');
    expect(initialsFor('Globex GmbH')).toBe('GG');
  });

  it('handles a single-word name', () => {
    expect(initialsFor('Operating')).toBe('O');
  });

  it('ignores leading, trailing and repeated whitespace', () => {
    expect(initialsFor('  Vertex   Logistics  ')).toBe('VL');
  });

  it('uppercases lowercase input', () => {
    expect(initialsFor('acme corp')).toBe('AC');
  });

  it('returns an empty string for an empty name', () => {
    expect(initialsFor('')).toBe('');
    expect(initialsFor('   ')).toBe('');
  });
});

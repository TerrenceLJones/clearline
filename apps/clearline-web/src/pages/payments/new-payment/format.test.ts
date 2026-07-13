import { describe, expect, it } from 'vitest';
import { arrivalEstimate, formatUsd, initialsFor } from './format';

describe('formatUsd', () => {
  it('formats minor units (cents) as a USD string', () => {
    expect(formatUsd(500_000)).toBe('$5,000.00');
    expect(formatUsd(300_050)).toBe('$3,000.50');
  });

  it('formats zero', () => {
    expect(formatUsd(0)).toBe('$0.00');
  });
});

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

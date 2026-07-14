import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyValue } from './formatMoney';

// Intl separates a currency code from the amount with a non-breaking space whose exact codepoint
// varies by ICU version (U+00A0 vs U+202F); normalize whitespace so the assertion is stable.
const normalize = (value: string) => value.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it('formats a USD amount by default', () => {
    expect(formatMoney(48210)).toBe('$48,210.00');
  });

  it('drops the sign — callers indicate credit/debit separately', () => {
    expect(formatMoney(-5000)).toBe('$5,000.00');
  });

  it('formats a 0-decimal currency without cents', () => {
    expect(formatMoney(182050, 'JPY')).toBe('¥182,050');
  });

  it('formats a 3-decimal currency with 3 decimal places', () => {
    expect(normalize(formatMoney(182.05, 'BHD'))).toBe('BHD 182.050');
  });
});

describe('formatMoneyValue', () => {
  it('converts minor units to a localized string, per currency', () => {
    expect(formatMoneyValue({ amountMinorUnits: 500050, currency: 'USD' })).toBe('$5,000.50');
    expect(formatMoneyValue({ amountMinorUnits: 182050, currency: 'JPY' })).toBe('¥182,050');
    expect(normalize(formatMoneyValue({ amountMinorUnits: 182050, currency: 'BHD' }))).toBe(
      'BHD 182.050',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { currencySymbol } from './currency-symbol';

describe('currencySymbol', () => {
  it('resolves the narrow symbol for known currencies', () => {
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('EUR')).toBe('€');
  });

  it('falls back to the raw code for an unresolvable currency instead of throwing', () => {
    expect(() => currencySymbol('BADCODE')).not.toThrow();
    expect(currencySymbol('BADCODE')).toBe('BADCODE');
  });
});

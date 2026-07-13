import { describe, expect, it } from 'vitest';
import { minorUnitExponent } from './minor-unit-exponent';

describe('minorUnitExponent', () => {
  it('resolves the ISO 4217 exponent for known currencies', () => {
    expect(minorUnitExponent('USD')).toBe(2);
    expect(minorUnitExponent('JPY')).toBe(0);
    expect(minorUnitExponent('BHD')).toBe(3);
  });

  it('falls back to 2 for an unresolvable currency code instead of throwing', () => {
    expect(() => minorUnitExponent('BADCODE')).not.toThrow();
    expect(minorUnitExponent('BADCODE')).toBe(2);
    expect(minorUnitExponent('US')).toBe(2);
  });
});

import { describe, expect, it } from 'vitest';
import { toMajorUnits } from './to-major-units';
import { toMinorUnits } from './to-minor-units';

describe('toMinorUnits', () => {
  it('multiplies by 100 for a 2-decimal currency (USD)', () => {
    expect(toMinorUnits(1820.5, 'USD')).toBe(182050);
  });

  it('does not multiply for a 0-decimal currency (JPY)', () => {
    expect(toMinorUnits(182050, 'JPY')).toBe(182050);
  });

  it('multiplies by 1000 for a 3-decimal currency (BHD)', () => {
    expect(toMinorUnits(182.05, 'BHD')).toBe(182050);
  });

  it('rounds away floating-point drift', () => {
    expect(toMinorUnits(19.99, 'USD')).toBe(1999);
  });

  it('round-trips with toMajorUnits', () => {
    const currency = 'USD';
    expect(toMajorUnits({ amountMinorUnits: toMinorUnits(5000, currency), currency })).toBe(5000);
  });
});

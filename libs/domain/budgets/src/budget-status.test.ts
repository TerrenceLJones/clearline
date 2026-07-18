import { describe, expect, it } from 'vitest';
import {
  budgetStatus,
  crossedWarningThreshold,
  overageMinorUnits,
  utilizationRatio,
} from './budget-status';

describe('utilizationRatio', () => {
  it('is spent ÷ budget in exact minor units', () => {
    // $23,000 of a $50,000 budget → 46%.
    expect(utilizationRatio(2_300_000, 5_000_000)).toBeCloseTo(0.46, 10);
    // $52,000 of a $50,000 budget → 104%.
    expect(utilizationRatio(5_200_000, 5_000_000)).toBeCloseTo(1.04, 10);
  });

  it('stays currency-agnostic — a 0-decimal JPY department computes the same fraction', () => {
    // ¥400,000 of a ¥500,000 budget (whole-yen minor units) → 80%, no 2-decimal assumption.
    expect(utilizationRatio(400_000, 500_000)).toBeCloseTo(0.8, 10);
  });

  it('returns 0 for an unset ($0 / undefined) budget rather than dividing by zero', () => {
    expect(utilizationRatio(1_000, 0)).toBe(0);
    expect(utilizationRatio(0, 0)).toBe(0);
  });
});

describe('budgetStatus', () => {
  it('is on-track below 80%', () => {
    expect(budgetStatus(0)).toBe('on-track');
    expect(budgetStatus(0.46)).toBe('on-track');
    expect(budgetStatus(0.799)).toBe('on-track');
  });

  it('is warning at exactly 80% up to (but not including) 100% (AC-02)', () => {
    expect(budgetStatus(0.8)).toBe('warning');
    expect(budgetStatus(0.93)).toBe('warning');
    expect(budgetStatus(0.999)).toBe('warning');
  });

  it('is over at 100% and beyond (AC-03)', () => {
    expect(budgetStatus(1)).toBe('over');
    expect(budgetStatus(1.04)).toBe('over');
  });
});

describe('overageMinorUnits', () => {
  it('is the exact amount over budget in minor units', () => {
    // $52,000 spent against a $50,000 budget → $2,000.00 over (200,000 cents).
    expect(overageMinorUnits(5_200_000, 5_000_000)).toBe(200_000);
  });

  it('is 0 at or under budget', () => {
    expect(overageMinorUnits(5_000_000, 5_000_000)).toBe(0);
    expect(overageMinorUnits(2_300_000, 5_000_000)).toBe(0);
  });
});

describe('crossedWarningThreshold', () => {
  it('is true only when moving up across 80% (AC-02)', () => {
    expect(crossedWarningThreshold(0.46, 0.8)).toBe(true);
    expect(crossedWarningThreshold(0.46, 0.95)).toBe(true);
  });

  it('is false once already at or above the threshold — so it notifies once, not per transaction', () => {
    expect(crossedWarningThreshold(0.8, 0.9)).toBe(false);
    expect(crossedWarningThreshold(0.95, 1.04)).toBe(false);
  });

  it('is false when still below the threshold', () => {
    expect(crossedWarningThreshold(0.4, 0.7)).toBe(false);
  });
});

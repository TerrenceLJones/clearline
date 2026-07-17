import { WARNING_THRESHOLD } from './constants';

/**
 * A budget's utilization band, derived from spend ÷ budget. Surfaced with an icon + text label in every
 * state — never color alone (US-CW-019 AC-03) — so the band carries meaning without relying on color.
 */
export type BudgetStatus = 'on-track' | 'warning' | 'over';

/**
 * Spend as a fraction of budget, computed in exact integer minor units so the percentage is
 * currency-agnostic — it holds for a 0-decimal JPY or a 3-decimal BHD department alike, without any
 * "two decimal places" assumption (US-CW-019 technical notes). A budget of 0 (or unset) yields 0
 * rather than dividing by zero, so an un-budgeted department reads as 0%, not NaN/Infinity.
 */
export function utilizationRatio(spentMinorUnits: number, budgetMinorUnits: number): number {
  if (budgetMinorUnits <= 0) return 0;
  return spentMinorUnits / budgetMinorUnits;
}

/** The band for a utilization ratio: warning at 80% (AC-02), over at 100%+ (AC-03), on-track below. */
export function budgetStatus(ratio: number): BudgetStatus {
  if (ratio >= 1) return 'over';
  if (ratio >= WARNING_THRESHOLD) return 'warning';
  return 'on-track';
}

/**
 * Amount spent beyond budget, in minor units — 0 when at or under budget. Kept exact (integer minor
 * units) so an overage renders as the precise "$2,000.00 over" the design shows, in the department's
 * own currency, not an assumed 2-decimal USD amount.
 */
export function overageMinorUnits(spentMinorUnits: number, budgetMinorUnits: number): number {
  return Math.max(0, spentMinorUnits - budgetMinorUnits);
}

/**
 * Whether a spend change crossed the warning threshold on the way up — true only when the previous
 * ratio was below 80% and the next is at or above it. The one-directional check is what makes the
 * threshold-crossing notification fire exactly once per period, rather than on every later transaction
 * that merely stays above the line (US-CW-019 AC-02, edge case: no duplicate notification).
 */
export function crossedWarningThreshold(previousRatio: number, nextRatio: number): boolean {
  return previousRatio < WARNING_THRESHOLD && nextRatio >= WARNING_THRESHOLD;
}

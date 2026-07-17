import type { Money } from './money';

/**
 * A department's budget for a single monthly period. Amounts are stored as integer minor units
 * (`Money`) so exact percentage and overage math holds for any currency — a 0-decimal JPY or a
 * 3-decimal BHD department alike — rather than an assumed 2-decimal USD amount (US-CW-019 technical
 * notes). The utilization band (on-track / warning / over) is *derived* from spent ÷ budget by
 * `@clearline/domain-budgets` and never stored, so it can't drift from the numbers.
 */
export interface BudgetPeriod {
  /** Stable id, e.g. 'engineering-2026-07'. */
  id: string;
  /** The department this budget belongs to, e.g. 'Engineering'. */
  department: string;
  /** Human month label, e.g. 'July 2026'. */
  periodLabel: string;
  /** Machine month key (YYYY-MM) — lexicographically comparable, so ordering periods is a string sort. */
  periodKey: string;
  /** The approved monthly budget. */
  budget: Money;
  /** Spend accrued against the budget so far this period. */
  spent: Money;
  /**
   * ISO-8601 timestamp department stakeholders were notified the 80% threshold was crossed; null if it
   * never has this period. Set once per period on the crossing, so re-crossing transactions don't
   * re-notify (US-CW-019 AC-02, edge case: no duplicate notification).
   */
  notifiedAt: string | null;
}

/** A department's *current* (active) budget period — what the overview gauges show. */
export interface DepartmentBudget extends BudgetPeriod {
  /** Always the active period on the overview. */
  isCurrent: true;
}

/** GET /api/budgets — the current period's gauge for every department (US-CW-019 AC-01/AC-02/AC-03). */
export interface BudgetOverviewResponse {
  budgets: DepartmentBudget[];
  /** The active period the overview is scoped to, e.g. 'July 2026'. */
  periodLabel: string;
}

/**
 * GET /api/budgets/:department/history — the current period plus every archived prior period, newest
 * first, so a rolled-over budget's history stays accessible (US-CW-019 AC-04).
 */
export interface BudgetHistoryResponse {
  department: string;
  /** Newest first — index 0 is the current period. */
  periods: BudgetPeriod[];
}

/** POST /api/budgets — set (or replace) a department's monthly budget; saving resets spend to $0 (AC-01). */
export interface SetBudgetRequest {
  department: string;
  /** The monthly budget in `currency`'s minor units. */
  amountMinorUnits: number;
  currency: string;
}

export interface SetBudgetResponse {
  budget: DepartmentBudget;
}

/**
 * Body of the 4xx responses budget endpoints can return. `forbidden_role` is the redundant server-side
 * `budget:view` check behind the route guard; `department_not_found` is an unknown department slug;
 * `invalid_amount` is the server re-validating that a monthly budget is a positive integer minor-unit
 * amount, never trusting the client.
 */
export type BudgetErrorResponse =
  { error: 'forbidden_role' } | { error: 'department_not_found' } | { error: 'invalid_amount' };

import type {
  BudgetHistoryResponse,
  BudgetOverviewResponse,
  BudgetPeriod,
  DepartmentBudget,
} from '@clearline/contracts';
import {
  crossedWarningThreshold,
  utilizationRatio,
  WARNING_THRESHOLD,
} from '@clearline/domain-budgets';
import {
  BUDGET_THRESHOLD_DEMO_DEPARTMENT,
  SEED_BUDGETS,
  type BudgetSeed,
} from '../fixtures/budgets.fixture';

/** Result of a set-budget attempt — the saved budget, or a typed reason the handler maps to a 4xx. */
export type SetBudgetOutcome =
  | { ok: true; budget: DepartmentBudget }
  | { ok: false; error: 'department_not_found' | 'invalid_amount' };

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** A department's URL slug — lowercased name (every seeded department is a single word). */
function slugOf(department: string): string {
  return department.toLowerCase();
}

/** The month after a 'YYYY-MM' key, as { key, label } — the target of a period rollover (AC-04). */
function nextPeriodOf(periodKey: string): { key: string; label: string } {
  const [yearPart, monthPart] = periodKey.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const rolls = month >= 12;
  const nextMonth = rolls ? 1 : month + 1;
  const nextYear = rolls ? year + 1 : year;
  return {
    key: `${nextYear}-${String(nextMonth).padStart(2, '0')}`,
    label: `${MONTHS[nextMonth - 1]} ${nextYear}`,
  };
}

interface DepartmentState {
  department: string;
  /** Newest first — index 0 is the current period. */
  periods: BudgetPeriod[];
}

/**
 * In-memory department budget tracking for US-CW-019. Holds each department's current period plus its
 * archived prior periods, and derives the overview gauges and history from them. Setting a budget saves
 * it and resets the current period's spend to $0 (AC-01). Crossing the 80% threshold records a
 * one-time stakeholder notification for the period (AC-02) — the crossing is a one-directional check,
 * so it never re-notifies. A month-end rollover archives every current period and starts fresh $0
 * periods, with prior periods still readable in history (AC-04); a real system runs this on a scheduled
 * job at midnight, which a frontend demo stands in for with an explicit control. State is per-instance:
 * the app binds the shared singleton, tests inject a fixed-clock instance.
 */
export class BudgetsService {
  private readonly now: () => number;
  private currentPeriodKey: string;
  private currentPeriodLabel: string;
  private departments: DepartmentState[];

  constructor(seed: BudgetSeed = SEED_BUDGETS, now: () => number = () => Date.now()) {
    this.now = now;
    this.currentPeriodKey = seed.currentPeriodKey;
    this.currentPeriodLabel = seed.currentPeriodLabel;
    this.departments = seed.departments.map((dept) => ({
      department: dept.department,
      periods: dept.periods.map((period) => ({
        id: `${slugOf(dept.department)}-${period.periodKey}`,
        department: dept.department,
        periodLabel: period.periodLabel,
        periodKey: period.periodKey,
        budget: { ...period.budget },
        spent: { ...period.spent },
        notifiedAt: period.notifiedAt,
      })),
    }));
  }

  /** The current-period gauge for every department (AC-01/AC-02/AC-03). */
  getOverview(): BudgetOverviewResponse {
    return {
      periodLabel: this.currentPeriodLabel,
      budgets: this.departments.map((dept) => this.toDepartmentBudget(dept.periods[0]!)),
    };
  }

  /** A department's full period history (current + archived), newest first; null for an unknown slug. */
  getHistory(departmentSlug: string): BudgetHistoryResponse | null {
    const dept = this.departments.find(
      (d) => slugOf(d.department) === departmentSlug.toLowerCase(),
    );
    if (!dept) return null;
    return { department: dept.department, periods: clone(dept.periods) };
  }

  /**
   * Save a department's monthly budget, resetting the current period to $0 spent so the gauge starts
   * fresh (AC-01). Re-validates server-side that the amount is a positive integer minor-unit value.
   */
  setBudget(department: string, amountMinorUnits: number, currency: string): SetBudgetOutcome {
    if (!Number.isInteger(amountMinorUnits) || amountMinorUnits <= 0) {
      return { ok: false, error: 'invalid_amount' };
    }
    const dept = this.departments.find((d) => slugOf(d.department) === slugOf(department));
    if (!dept) return { ok: false, error: 'department_not_found' };

    const current = dept.periods[0]!;
    const reset: BudgetPeriod = {
      id: current.id,
      department: dept.department,
      periodLabel: current.periodLabel,
      periodKey: current.periodKey,
      budget: { amountMinorUnits, currency },
      spent: { amountMinorUnits: 0, currency },
      notifiedAt: null,
    };
    dept.periods[0] = reset;
    return { ok: true, budget: this.toDepartmentBudget(reset) };
  }

  /**
   * Demo/e2e: push the target department to exactly its 80% warning threshold, recording the one-time
   * stakeholder notification if this is the crossing (AC-02). No-op if the department is unknown.
   */
  simulateThresholdCrossing(department: string = BUDGET_THRESHOLD_DEMO_DEPARTMENT): void {
    const dept = this.departments.find((d) => slugOf(d.department) === slugOf(department));
    if (!dept) return;
    const current = dept.periods[0]!;
    const budgetMinor = current.budget.amountMinorUnits;
    const previousRatio = utilizationRatio(current.spent.amountMinorUnits, budgetMinor);
    const nextSpent = Math.round(WARNING_THRESHOLD * budgetMinor);
    current.spent = { amountMinorUnits: nextSpent, currency: current.budget.currency };
    const nextRatio = utilizationRatio(nextSpent, budgetMinor);
    if (crossedWarningThreshold(previousRatio, nextRatio) && current.notifiedAt === null) {
      current.notifiedAt = new Date(this.now()).toISOString();
    }
  }

  /**
   * Demo/e2e: end the current period and begin the next. Every department's current period is archived
   * in place and a fresh $0-spent period for the next month is prepended — carrying the same budget
   * forward — so the new period starts clean while prior periods stay in history (AC-04).
   */
  rolloverPeriod(): void {
    const { key: nextKey, label: nextLabel } = nextPeriodOf(this.currentPeriodKey);
    for (const dept of this.departments) {
      const current = dept.periods[0]!;
      const fresh: BudgetPeriod = {
        id: `${slugOf(dept.department)}-${nextKey}`,
        department: dept.department,
        periodLabel: nextLabel,
        periodKey: nextKey,
        budget: { ...current.budget },
        spent: { amountMinorUnits: 0, currency: current.budget.currency },
        notifiedAt: null,
      };
      dept.periods.unshift(fresh);
    }
    this.currentPeriodKey = nextKey;
    this.currentPeriodLabel = nextLabel;
  }

  private toDepartmentBudget(period: BudgetPeriod): DepartmentBudget {
    return { ...clone(period), isCurrent: true };
  }
}

import { describe, expect, it } from 'vitest';
import type { BudgetSeed } from '../fixtures/budgets.fixture';
import { BudgetsService } from './budgets.service';

const usd = (amountMinorUnits: number) => ({ amountMinorUnits, currency: 'USD' });

/** A tiny two-department seed with a fixed clock, so assertions don't depend on the full demo fixture. */
function makeSeed(): BudgetSeed {
  return {
    currentPeriodKey: '2026-07',
    currentPeriodLabel: 'July 2026',
    departments: [
      {
        department: 'Engineering',
        periods: [
          {
            periodKey: '2026-07',
            periodLabel: 'July 2026',
            budget: usd(5_000_000),
            spent: usd(2_300_000),
            notifiedAt: null,
          },
          {
            periodKey: '2026-06',
            periodLabel: 'June 2026',
            budget: usd(5_000_000),
            spent: usd(5_200_000),
            notifiedAt: '2026-06-24T09:00:00.000Z',
          },
        ],
      },
      {
        department: 'Sales',
        periods: [
          {
            periodKey: '2026-07',
            periodLabel: 'July 2026',
            budget: usd(5_000_000),
            spent: usd(5_200_000),
            notifiedAt: '2026-07-10T09:00:00.000Z',
          },
        ],
      },
    ],
  };
}

const FIXED_NOW = Date.parse('2026-07-17T12:00:00.000Z');
const makeService = () => new BudgetsService(makeSeed(), () => FIXED_NOW);

describe('BudgetsService.getOverview', () => {
  it('returns the current period for every department with the active label', () => {
    const overview = makeService().getOverview();
    expect(overview.periodLabel).toBe('July 2026');
    expect(overview.budgets.map((b) => b.department)).toEqual(['Engineering', 'Sales']);
    const engineering = overview.budgets[0]!;
    expect(engineering.spent).toEqual(usd(2_300_000));
    expect(engineering.budget).toEqual(usd(5_000_000));
    expect(engineering.isCurrent).toBe(true);
  });
});

describe('BudgetsService.setBudget (AC-01)', () => {
  it('saves the budget and starts the current period at $0 spent', () => {
    const service = makeService();
    const outcome = service.setBudget('Engineering', 5_000_000, 'USD');
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.budget.budget).toEqual(usd(5_000_000));
      expect(outcome.budget.spent).toEqual(usd(0));
      expect(outcome.budget.notifiedAt).toBeNull();
    }
    // The overview reflects the reset.
    expect(service.getOverview().budgets[0]!.spent).toEqual(usd(0));
  });

  it('rejects a non-positive or non-integer amount', () => {
    const service = makeService();
    expect(service.setBudget('Engineering', 0, 'USD')).toEqual({
      ok: false,
      error: 'invalid_amount',
    });
    expect(service.setBudget('Engineering', -100, 'USD').ok).toBe(false);
    expect(service.setBudget('Engineering', 10.5, 'USD').ok).toBe(false);
  });

  it('rejects an unknown department', () => {
    expect(makeService().setBudget('Legal', 5_000_000, 'USD')).toEqual({
      ok: false,
      error: 'department_not_found',
    });
  });
});

describe('BudgetsService.simulateThresholdCrossing (AC-02)', () => {
  it('pushes the department to 80% and records a one-time stakeholder notification', () => {
    const service = makeService();
    service.simulateThresholdCrossing('Engineering');
    const engineering = service.getOverview().budgets[0]!;
    expect(engineering.spent).toEqual(usd(4_000_000)); // exactly 80% of $50,000
    expect(engineering.notifiedAt).toBe(new Date(FIXED_NOW).toISOString());
  });

  it('does not overwrite an existing notification when already above the threshold', () => {
    const service = makeService();
    // Sales starts over budget with an existing notifiedAt — a crossing simulation must not re-notify.
    service.simulateThresholdCrossing('Sales');
    expect(service.getOverview().budgets[1]!.notifiedAt).toBe('2026-07-10T09:00:00.000Z');
  });
});

describe('BudgetsService.rolloverPeriod (AC-04)', () => {
  it('starts a fresh $0 period for August while keeping prior periods in history', () => {
    const service = makeService();
    service.rolloverPeriod();

    const overview = service.getOverview();
    expect(overview.periodLabel).toBe('August 2026');
    const engineering = overview.budgets[0]!;
    expect(engineering.spent).toEqual(usd(0));
    expect(engineering.budget).toEqual(usd(5_000_000)); // budget carried forward

    const history = service.getHistory('engineering');
    expect(history?.periods.map((p) => p.periodLabel)).toEqual([
      'August 2026',
      'July 2026',
      'June 2026',
    ]);
  });
});

describe('BudgetsService.getHistory', () => {
  it('returns the periods newest-first for a known department slug', () => {
    const history = makeService().getHistory('engineering');
    expect(history?.department).toBe('Engineering');
    expect(history?.periods).toHaveLength(2);
  });

  it('returns null for an unknown slug', () => {
    expect(makeService().getHistory('legal')).toBeNull();
  });
});

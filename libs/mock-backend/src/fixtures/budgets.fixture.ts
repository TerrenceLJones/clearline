import type { Money } from '@clearline/contracts';

/** USD helper for the seed — every budget amount is USD minor units (cents). */
function usd(amountMinorUnits: number): Money {
  return { amountMinorUnits, currency: 'USD' };
}

/**
 * One department's budget for a single month, as seeded. Amounts are minor units so the service can do
 * exact percentage/overage math; `notifiedAt` is a fixed demo ISO timestamp on the periods that already
 * crossed 80%, null otherwise — the service sets it live when a crossing is simulated.
 */
export interface BudgetSeedPeriod {
  periodKey: string;
  periodLabel: string;
  budget: Money;
  spent: Money;
  notifiedAt: string | null;
}

/** A department and its periods, newest first — index 0 is the current (active) period. */
export interface BudgetSeedDepartment {
  department: string;
  periods: BudgetSeedPeriod[];
}

/** The whole budgets seed: the active period label plus every department's period history. */
export interface BudgetSeed {
  currentPeriodKey: string;
  currentPeriodLabel: string;
  departments: BudgetSeedDepartment[];
}

/** When the notified departments crossed 80% this period — a fixed demo timestamp (mid-July 2026). */
const NOTIFIED_AT = '2026-07-14T09:00:00.000Z';

/**
 * The seeded department budgets for July 2026 — the demo's current period. Amounts are chosen so the
 * overview reproduces the design's §13.1 gauge states and the Controller shell's "3 departments over
 * 80% · 1 over budget" summary: Engineering and Design on-track (46%), Marketing at exactly the 80%
 * warning boundary, Operations deep in the warning band (93%), and Sales over budget (104% — $2,000
 * over). Engineering's prior periods reproduce the §13.2 history table (June 104% over, May/April
 * under). Departments mirror the analytics seed (`SEED_SPEND_TRANSACTIONS`) so the app reads coherently.
 */
export const SEED_BUDGETS: BudgetSeed = {
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
        {
          periodKey: '2026-05',
          periodLabel: 'May 2026',
          budget: usd(5_000_000),
          spent: usd(4_680_000),
          notifiedAt: null,
        },
        {
          periodKey: '2026-04',
          periodLabel: 'April 2026',
          budget: usd(4_500_000),
          spent: usd(4_120_000),
          notifiedAt: null,
        },
      ],
    },
    {
      department: 'Design',
      periods: [
        {
          periodKey: '2026-07',
          periodLabel: 'July 2026',
          budget: usd(3_000_000),
          spent: usd(1_380_000),
          notifiedAt: null,
        },
        {
          periodKey: '2026-06',
          periodLabel: 'June 2026',
          budget: usd(3_000_000),
          spent: usd(2_640_000),
          notifiedAt: null,
        },
      ],
    },
    {
      department: 'Marketing',
      periods: [
        {
          periodKey: '2026-07',
          periodLabel: 'July 2026',
          budget: usd(5_000_000),
          spent: usd(4_000_000),
          notifiedAt: NOTIFIED_AT,
        },
        {
          periodKey: '2026-06',
          periodLabel: 'June 2026',
          budget: usd(5_000_000),
          spent: usd(3_960_000),
          notifiedAt: null,
        },
      ],
    },
    {
      department: 'Operations',
      periods: [
        {
          periodKey: '2026-07',
          periodLabel: 'July 2026',
          budget: usd(28_000_000),
          spent: usd(26_040_000),
          notifiedAt: NOTIFIED_AT,
        },
        {
          periodKey: '2026-06',
          periodLabel: 'June 2026',
          budget: usd(28_000_000),
          spent: usd(25_000_000),
          notifiedAt: NOTIFIED_AT,
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
          notifiedAt: NOTIFIED_AT,
        },
        {
          periodKey: '2026-06',
          periodLabel: 'June 2026',
          budget: usd(5_000_000),
          spent: usd(4_300_000),
          notifiedAt: null,
        },
      ],
    },
  ],
};

/** The department the demo's "push past 80%" scenario targets — starts on-track, so the crossing is visible. */
export const BUDGET_THRESHOLD_DEMO_DEPARTMENT = 'Engineering';

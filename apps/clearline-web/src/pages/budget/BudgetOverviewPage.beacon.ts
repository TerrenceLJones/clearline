import type { DemoBeaconPageConfig, EntityRow } from '@clearline/demo-beacon';
import { SEED_BUDGETS } from '@clearline/mock-backend/fixtures';
import { budgetStatus, utilizationRatio } from '@clearline/domain-budgets';
import { money, loadControls } from '../../dev/beacon/shared';
import { resetSection } from '../../dev/beacon/global.beacon';

const STATUS_LABEL = {
  'on-track': 'On track',
  warning: '80%+ used · notified',
  over: 'Over budget',
} as const;

/** Each department's current-period gauge state, as the overview shows it — what the guide lists. */
const rows: EntityRow[] = SEED_BUDGETS.departments.map((dept) => {
  const current = dept.periods[0]!;
  const status = budgetStatus(
    utilizationRatio(current.spent.amountMinorUnits, current.budget.amountMinorUnits),
  );
  return {
    department: dept.department,
    budget: money(current.budget),
    spent: money(current.spent),
    state: STATUS_LABEL[status],
  };
});

/**
 * Budget management guide (US-CW-019). Orients a viewer to the department gauges — on-track, the 80%
 * warning with the stakeholder notification, and over budget with the exact overage — and hands them
 * the levers to trip the threshold crossing and the month-end rollover. Shared across the overview,
 * new-budget, and history pages so the guide stays consistent through the flow.
 */
export const budgetBeacon: DemoBeaconPageConfig = {
  pageId: 'budgets',
  title: 'Budget Management',
  summary:
    'Monthly **department budgets** for July 2026. Each gauge spells out its **percentage and overage in text** — never color alone — and flips to amber at the **80% threshold**, where **department stakeholders are notified**. Periods **roll over to $0** while prior periods stay in **Budget history**. Controller-only.',
  sections: [
    {
      kind: 'entities',
      title: 'Seeded department budgets',
      columns: [
        { key: 'department', label: 'Department' },
        { key: 'budget', label: 'Budget' },
        { key: 'spent', label: 'Spent' },
        { key: 'state', label: 'State' },
      ],
      rows,
    },
    {
      kind: 'flows',
      title: 'Try this',
      flows: [
        {
          id: 'set-budget',
          title: 'Set a department budget',
          steps: [
            { text: 'Press **Set a budget**, pick a department and enter a **monthly budget**.' },
            {
              text: 'The preview gauge — and, after **Save budget**, the overview — starts at **$0.00 spent** (AC-01).',
            },
          ],
        },
        {
          id: 'threshold',
          title: 'Cross the 80% threshold',
          steps: [
            { text: 'Run **Push Engineering past 80%** below.' },
            {
              text: 'Press **Refresh** — Engineering flips to the amber **“80% of budget used”** state with a **“Stakeholders notified”** chip (AC-02).',
            },
          ],
        },
        {
          id: 'rollover',
          title: 'Roll over the budget period',
          steps: [
            { text: 'Run **Simulate month-end rollover** below, then **Refresh**.' },
            {
              text: 'Every gauge resets to **$0.00 spent** for the next month; open any department’s **history** to see the prior period preserved with a “new period started” banner (AC-04).',
            },
          ],
        },
      ],
    },
    {
      kind: 'actions',
      title: 'Scenarios',
      actions: [
        {
          id: 'cross-threshold',
          label: 'Push Engineering past 80%',
          description:
            'Bumps Engineering to exactly its 80% warning threshold and records the one-time stakeholder notification. Press Refresh on the overview to see it.',
          run: async () => {
            const { simulateBudgetThresholdCrossingForE2E } = await loadControls();
            simulateBudgetThresholdCrossingForE2E('Engineering');
          },
        },
        {
          id: 'rollover',
          label: 'Simulate month-end rollover',
          description:
            'Ends the current period and starts the next at $0.00 spent for every department, standing in for the scheduled midnight rollover job. Prior periods stay in history. Press Refresh to see it.',
          run: async () => {
            const { simulateBudgetRolloverForE2E } = await loadControls();
            simulateBudgetRolloverForE2E();
          },
        },
      ],
    },
    resetSection,
  ],
};

import type { ApprovalQueueItem } from '@clearline/contracts';

/**
 * Seed approval queue for the demo. Amounts are USD minor units (cents). Two items are deliberately
 * shaped to exercise US-CW-006's guardrails against the demo account (`user_1`, a $10,000-limit
 * Finance Manager):
 *   - exp_4471 ($15,000) is over that limit → approval blocked, escalate offered (AC-06).
 *   - exp_4460 is submitted by `user_1` themselves → self-approval blocked (AC-07).
 * The rest are ordinary in-limit, other-submitter items that approve cleanly.
 */
export const SEED_APPROVALS: ApprovalQueueItem[] = [
  {
    id: 'exp_4201',
    submitterId: 'user_201',
    submitterName: 'Priya Nair',
    category: 'Software',
    amount: { amountMinorUnits: 420_000, currency: 'USD' },
    submittedDate: '2026-06-28',
    status: 'pending_l1',
  },
  {
    id: 'exp_4202',
    submitterId: 'user_202',
    submitterName: 'Dara Reyes',
    category: 'Travel',
    amount: { amountMinorUnits: 30_000, currency: 'USD' },
    submittedDate: '2026-06-28',
    status: 'pending_l1',
  },
  {
    id: 'exp_4471',
    submitterId: 'user_203',
    submitterName: 'Tom Becker',
    category: 'Equipment',
    amount: { amountMinorUnits: 1_500_000, currency: 'USD' },
    submittedDate: '2026-06-27',
    status: 'pending_l1',
  },
  {
    id: 'exp_4460',
    submitterId: 'user_1',
    submitterName: 'Marcus Okafor',
    category: 'Meals',
    amount: { amountMinorUnits: 18_000, currency: 'USD' },
    submittedDate: '2026-06-26',
    status: 'pending_l1',
  },
];

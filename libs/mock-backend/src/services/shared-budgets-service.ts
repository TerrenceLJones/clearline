import { BudgetsService } from './budgets.service';

/**
 * The one BudgetsService the running app's budget handlers bind to, so a GET overview and a subsequent
 * set-budget / simulated crossing / rollover act on the same in-memory state (same rationale as
 * sharedReconciliationService). Not persisted across a full page reload — it resets to the seed, which
 * is fine for a demo; tests inject their own isolated, fixed-clock instance.
 */
export const sharedBudgetsService = new BudgetsService();

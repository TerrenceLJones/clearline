/**
 * Thrown when a budget endpoint returns 403 — the redundant server-side `budget:view` check behind the
 * Controller-only route guard, even if the client guard was bypassed or the viewer's role was
 * downgraded mid-session. The page degrades to an access-denied state rather than a generic error.
 */
export class BudgetForbiddenError extends Error {
  constructor() {
    super('budget_forbidden');
    this.name = 'BudgetForbiddenError';
  }
}

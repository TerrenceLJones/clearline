import { authenticatedFetch } from '@clearline/data-access-auth';
import { BudgetForbiddenError } from './budgets-forbidden-error';

/**
 * Fetch the department budget overview. A 403 becomes BudgetForbiddenError (access-denied); any other
 * non-2xx throws so React Query surfaces the page's error state.
 */
export async function fetchBudgetOverview<T>(): Promise<T> {
  const response = await authenticatedFetch('/api/budgets');
  if (response.status === 403) {
    throw new BudgetForbiddenError();
  }
  if (!response.ok) {
    throw new Error('budgets_overview_failed');
  }
  return response.json() as Promise<T>;
}

/** Fetch one department's period history by slug. Same 403 / non-2xx handling as the overview. */
export async function fetchBudgetHistory<T>(departmentSlug: string): Promise<T> {
  const response = await authenticatedFetch(
    `/api/budgets/${encodeURIComponent(departmentSlug)}/history`,
  );
  if (response.status === 403) {
    throw new BudgetForbiddenError();
  }
  if (!response.ok) {
    throw new Error('budgets_history_failed');
  }
  return response.json() as Promise<T>;
}

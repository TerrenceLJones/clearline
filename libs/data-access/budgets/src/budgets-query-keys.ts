/**
 * Root key for every budgets query — setting a budget invalidates this whole subtree so the overview
 * gauges and any open history refetch together and never drift apart (US-CW-019).
 */
export const BUDGETS_QUERY_KEY = ['budgets'] as const;

/** One key factory per view, so a query and its invalidations can't disagree. */
export const budgetKeys = {
  overview: () => [...BUDGETS_QUERY_KEY, 'overview'] as const,
  history: (departmentSlug: string) => [...BUDGETS_QUERY_KEY, 'history', departmentSlug] as const,
};

import { useQuery } from '@tanstack/react-query';
import type { BudgetHistoryResponse } from '@clearline/contracts';
import { budgetKeys } from './budgets-query-keys';
import { fetchBudgetHistory } from './fetch-budgets';

/** A department's budget history — current period plus archived prior periods, newest first (AC-04). */
export function useBudgetHistory(departmentSlug: string) {
  return useQuery({
    queryKey: budgetKeys.history(departmentSlug),
    queryFn: () => fetchBudgetHistory<BudgetHistoryResponse>(departmentSlug),
    retry: false,
    enabled: departmentSlug.length > 0,
  });
}

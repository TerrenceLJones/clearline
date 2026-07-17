import { useQuery } from '@tanstack/react-query';
import type { BudgetOverviewResponse } from '@clearline/contracts';
import { budgetKeys } from './budgets-query-keys';
import { fetchBudgetOverview } from './fetch-budgets';

/** The current-period budget gauge for every department (US-CW-019 AC-01/AC-02/AC-03). */
export function useBudgetOverview() {
  return useQuery({
    queryKey: budgetKeys.overview(),
    queryFn: () => fetchBudgetOverview<BudgetOverviewResponse>(),
    retry: false,
  });
}

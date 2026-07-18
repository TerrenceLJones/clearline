import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  BudgetErrorResponse,
  SetBudgetRequest,
  SetBudgetResponse,
} from '@clearline/contracts';
import { authenticatedFetch } from '@clearline/data-access-auth';
import { BUDGETS_QUERY_KEY } from './budgets-query-keys';

/**
 * A server-side rejection of a set-budget submission (422), carrying the exact code the form maps to
 * its inline copy — currently `invalid_amount` for a non-positive monthly budget. The server re-runs
 * the same validation the form does (US-CW-019 technical notes), so this is never a silent failure.
 */
export class BudgetValidationError extends Error {
  readonly code: BudgetErrorResponse['error'];

  constructor(code: BudgetErrorResponse['error']) {
    super(`budget_invalid: ${code}`);
    this.name = 'BudgetValidationError';
    this.code = code;
  }
}

async function postBudget(request: SetBudgetRequest): Promise<SetBudgetResponse> {
  const response = await authenticatedFetch('/api/budgets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (response.status === 422) {
    const body = (await response.json()) as BudgetErrorResponse;
    throw new BudgetValidationError(body.error);
  }
  if (!response.ok) {
    throw new Error('set_budget_failed');
  }
  return response.json() as Promise<SetBudgetResponse>;
}

/**
 * Save (or replace) a department's monthly budget. Saving starts the current period at $0 spent
 * (AC-01); on success the whole budgets subtree is invalidated so the overview gauges refetch and show
 * the reset immediately.
 */
export function useSetBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postBudget,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY }),
  });
}

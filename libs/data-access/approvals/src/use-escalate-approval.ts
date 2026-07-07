import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApprovalActionResponse } from '@clearline/contracts';
import { authenticatedFetch } from '@clearline/data-access-auth';
import { APPROVALS_QUERY_KEY } from './approvals-query-key';

async function postEscalate(itemId: string): Promise<ApprovalActionResponse> {
  const response = await authenticatedFetch(`/api/approvals/${itemId}/escalate`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('escalate_failed');
  }
  return response.json();
}

/**
 * Routes an over-limit expense to a Controller (L2) — the one-click escalation offered when an
 * approval exceeds the manager's limit (US-CW-006 AC-06). Refetches the queue so the item reflects
 * its new pending-L2 state.
 */
export function useEscalateApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postEscalate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APPROVALS_QUERY_KEY }),
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApprovalActionResponse } from '@clearline/contracts';
import { authenticatedFetch } from '@clearline/data-access-auth';
import { APPROVALS_QUERY_KEY } from './approvals-query-key';

async function postReassign(itemId: string): Promise<ApprovalActionResponse> {
  const response = await authenticatedFetch(`/api/approvals/${itemId}/reassign`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('reassign_failed');
  }
  return response.json();
}

/**
 * Hands an expense to a different approver — the sanctioned escape hatch when the acting approver
 * can't approve it themselves (e.g. their own submission, US-CW-006 AC-08). Refetches the queue so
 * the reassigned item drops out of this approver's list.
 */
export function useReassignApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postReassign,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APPROVALS_QUERY_KEY }),
  });
}

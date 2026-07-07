import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApprovalActionResponse } from '@clearline/contracts';
import { authenticatedFetch } from '@clearline/data-access-auth';
import { APPROVALS_QUERY_KEY } from './approvals-query-key';

async function postReject(itemId: string): Promise<ApprovalActionResponse> {
  const response = await authenticatedFetch(`/api/approvals/${itemId}/reject`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('reject_failed');
  }
  return response.json();
}

/** Rejects an expense, dropping it from the pending queue. Server still re-checks approval authority (US-CW-006). */
export function useRejectApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postReject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APPROVALS_QUERY_KEY }),
  });
}

import { useQuery } from '@tanstack/react-query';
import type { ApprovalQueueResponse } from '@clearline/contracts';
import { authenticatedFetch } from '@clearline/data-access-auth';
import { APPROVALS_QUERY_KEY } from './approvals-query-key';

/** Thrown when the server rejects the queue read with 403 — the redundant server check behind US-CW-006 AC-04, even if the client-side route guard was somehow bypassed. */
export class ApprovalsForbiddenError extends Error {
  constructor() {
    super('approvals_forbidden');
    this.name = 'ApprovalsForbiddenError';
  }
}

async function getApprovalQueue(): Promise<ApprovalQueueResponse> {
  const response = await authenticatedFetch('/api/approvals');
  if (response.status === 403) {
    throw new ApprovalsForbiddenError();
  }
  if (!response.ok) {
    throw new Error('approval_queue_failed');
  }
  return response.json();
}

/**
 * The pending approval queue for the current user. The route guard already keeps unauthorized roles
 * off this page, but the query still surfaces a server 403 as ApprovalsForbiddenError so a
 * mid-session downgrade (or a bypassed guard) degrades to the access-denied state rather than a
 * generic error.
 */
export function useApprovalQueue(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: APPROVALS_QUERY_KEY,
    queryFn: getApprovalQueue,
    retry: false,
    enabled: options.enabled,
  });
}

/** Shared cache key for the approval queue — one place so the query and the approve/escalate invalidations can't drift apart. */
export const APPROVALS_QUERY_KEY = ['approvals'] as const;

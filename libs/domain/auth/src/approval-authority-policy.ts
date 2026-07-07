import type { ApprovalErrorCode, Permission } from '@clearline/contracts';
import { hasPermission } from './authorization-policy';

/** True when `amount` is strictly over `limit`. A null limit is unlimited (Controller) — never exceeded. Amounts and limit are both minor units. */
export function exceedsApprovalLimit(limit: number | null, amount: number): boolean {
  if (limit === null) return false;
  return amount > limit;
}

/** Conflict-of-interest check: an approver may never approve an expense they themselves submitted (US-CW-006 AC-07). */
export function isSelfApproval(submitterId: string, approverId: string): boolean {
  return submitterId === approverId;
}

export interface CanApproveInput {
  permissions: readonly Permission[];
  approvalLimit: number | null;
  amount: number;
  submitterId: string;
  approverId: string;
}

export type CanApproveResult = { allowed: true } | { allowed: false; reason: ApprovalErrorCode };

/**
 * The single server-side gate every approval passes through. Checks run in priority order so the
 * caller always gets the most fundamental reason first: lacking the permission at all (forbidden_role)
 * outranks who submitted it, which outranks how large it is. This same function backs both the client's
 * pre-disabling and the endpoint's independent 403 — the client is never the security boundary.
 */
export function canApprove({
  permissions,
  approvalLimit,
  amount,
  submitterId,
  approverId,
}: CanApproveInput): CanApproveResult {
  if (!hasPermission(permissions, 'approvals:act')) {
    return { allowed: false, reason: 'forbidden_role' };
  }
  if (isSelfApproval(submitterId, approverId)) {
    return { allowed: false, reason: 'self_approval_blocked' };
  }
  if (exceedsApprovalLimit(approvalLimit, amount)) {
    return { allowed: false, reason: 'approval_limit_exceeded' };
  }
  return { allowed: true };
}

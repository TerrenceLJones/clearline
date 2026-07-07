import type { ApprovalErrorCode, ApprovalQueueItem, Permission } from '@clearline/contracts';
import { canApprove, hasPermission } from '@clearline/domain-auth';
import { SEED_APPROVALS } from '../fixtures/approvals.fixture';

/** The resolved acting approver — its permissions/limit come from the session (see approvals.handlers). */
export interface ApprovalActor {
  userId: string;
  displayName: string;
  permissions: readonly Permission[];
  approvalLimit: number | null;
}

export type ApprovalQueueOutcome =
  { outcome: 'ok'; items: ApprovalQueueItem[] } | { outcome: 'forbidden' };

export type ApprovalActionOutcome =
  | { outcome: 'ok'; item: ApprovalQueueItem }
  | { outcome: 'not_found' }
  | { outcome: 'forbidden'; reason: ApprovalErrorCode; approvalLimit?: number };

/**
 * In-memory approval queue with server-authoritative guardrails. Every mutation runs through
 * @clearline/domain-auth's canApprove — the same rule the client uses to pre-disable — so a caller
 * who bypasses the UI still can't self-approve or exceed their limit (US-CW-006 AC-06/AC-07). State
 * is per-instance; the app binds to the shared singleton (see shared-approvals-service).
 */
export class ApprovalsService {
  private readonly items: Map<string, ApprovalQueueItem>;

  constructor(seed: ApprovalQueueItem[] = SEED_APPROVALS) {
    // Deep-copy each seed item so mutations (escalate) never corrupt the shared fixture array.
    this.items = new Map(seed.map((item) => [item.id, { ...item, amount: { ...item.amount } }]));
  }

  getQueue(actor: ApprovalActor): ApprovalQueueOutcome {
    if (!hasPermission(actor.permissions, 'approvals:view')) {
      return { outcome: 'forbidden' };
    }
    return { outcome: 'ok', items: [...this.items.values()].map((item) => ({ ...item })) };
  }

  approve(itemId: string, actor: ApprovalActor): ApprovalActionOutcome {
    const item = this.items.get(itemId);
    if (!item) return { outcome: 'not_found' };

    const decision = canApprove({
      permissions: actor.permissions,
      approvalLimit: actor.approvalLimit,
      amount: item.amount.amountMinorUnits,
      submitterId: item.submitterId,
      approverId: actor.userId,
    });

    if (!decision.allowed) {
      if (decision.reason === 'approval_limit_exceeded' && actor.approvalLimit !== null) {
        return {
          outcome: 'forbidden',
          reason: decision.reason,
          approvalLimit: actor.approvalLimit,
        };
      }
      return { outcome: 'forbidden', reason: decision.reason };
    }

    // Approved items leave the pending queue — the demo doesn't model an approved/history view.
    this.items.delete(itemId);
    return { outcome: 'ok', item: { ...item } };
  }

  reject(itemId: string, actor: ApprovalActor): ApprovalActionOutcome {
    if (!hasPermission(actor.permissions, 'approvals:act')) {
      return { outcome: 'forbidden', reason: 'forbidden_role' };
    }
    const item = this.items.get(itemId);
    if (!item) return { outcome: 'not_found' };

    // Rejected items leave the pending queue, same as approved ones.
    this.items.delete(itemId);
    return { outcome: 'ok', item: { ...item } };
  }

  escalate(itemId: string, actor: ApprovalActor): ApprovalActionOutcome {
    if (!hasPermission(actor.permissions, 'approvals:act')) {
      return { outcome: 'forbidden', reason: 'forbidden_role' };
    }
    const item = this.items.get(itemId);
    if (!item) return { outcome: 'not_found' };

    const escalated: ApprovalQueueItem = {
      ...item,
      status: 'pending_l2',
      escalatedBy: actor.displayName,
    };
    this.items.set(itemId, escalated);
    return { outcome: 'ok', item: { ...escalated } };
  }
}

import { describe, expect, it } from 'vitest';
import { canApprove, exceedsApprovalLimit, isSelfApproval } from './approval-authority-policy';

describe('exceedsApprovalLimit', () => {
  it('is false when the amount is under the limit', () => {
    expect(exceedsApprovalLimit(1_000_000, 500_000)).toBe(false);
  });

  it('is false when the amount exactly equals the limit', () => {
    expect(exceedsApprovalLimit(1_000_000, 1_000_000)).toBe(false);
  });

  it('is true when the amount is over the limit', () => {
    expect(exceedsApprovalLimit(1_000_000, 1_500_000)).toBe(true);
  });

  it('is never exceeded when the limit is null (unlimited)', () => {
    expect(exceedsApprovalLimit(null, 99_999_999)).toBe(false);
  });
});

describe('isSelfApproval', () => {
  it('is true when submitter and approver are the same user', () => {
    expect(isSelfApproval('user_1', 'user_1')).toBe(true);
  });

  it('is false for different users', () => {
    expect(isSelfApproval('user_1', 'user_2')).toBe(false);
  });
});

describe('canApprove', () => {
  const base = {
    permissions: ['approvals:view', 'approvals:act'] as const,
    approvalLimit: 1_000_000,
    amount: 500_000,
    submitterId: 'user_2',
    approverId: 'user_1',
  };

  it('allows a permitted approver within limit approving another user’s expense', () => {
    expect(canApprove({ ...base })).toEqual({ allowed: true });
  });

  it('blocks with forbidden_role when the approver lacks approvals:act', () => {
    expect(canApprove({ ...base, permissions: ['approvals:view'] })).toEqual({
      allowed: false,
      reason: 'forbidden_role',
    });
  });

  it('blocks self-approval before checking the limit', () => {
    expect(
      canApprove({ ...base, submitterId: 'user_1', approverId: 'user_1', amount: 999_999_999 }),
    ).toEqual({ allowed: false, reason: 'self_approval_blocked' });
  });

  it('blocks when the amount exceeds the approver’s limit', () => {
    expect(canApprove({ ...base, amount: 1_500_000 })).toEqual({
      allowed: false,
      reason: 'approval_limit_exceeded',
    });
  });

  it('allows a Controller (null/unlimited limit) to approve any amount', () => {
    expect(canApprove({ ...base, approvalLimit: null, amount: 999_999_999 })).toEqual({
      allowed: true,
    });
  });

  it('prioritizes forbidden_role over every other check', () => {
    expect(
      canApprove({
        ...base,
        permissions: [],
        submitterId: 'user_1',
        approverId: 'user_1',
        amount: 999_999_999,
      }),
    ).toEqual({ allowed: false, reason: 'forbidden_role' });
  });
});

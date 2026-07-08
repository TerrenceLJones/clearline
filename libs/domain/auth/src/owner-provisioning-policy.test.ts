import { describe, expect, it } from 'vitest';
import { ownerProvisioning } from './owner-provisioning-policy';

describe('ownerProvisioning', () => {
  it('grants the account creator the Controller tier with an unlimited approval limit (US-CW-030 AC-02)', () => {
    const patch = ownerProvisioning();
    expect(patch.role).toBe('controller');
    expect(patch.approvalLimit).toBeNull();
  });

  it('flags the creator as the Owner (US-CW-030 AC-02)', () => {
    expect(ownerProvisioning().isOwner).toBe(true);
  });

  it('returns a fresh object each call so callers cannot mutate a shared instance', () => {
    expect(ownerProvisioning()).not.toBe(ownerProvisioning());
    expect(ownerProvisioning()).toEqual(ownerProvisioning());
  });
});

import type { Role } from '@clearline/contracts';

/**
 * The membership an account creator is granted when their business clears KYB (US-CW-030 AC-02):
 * the top approval tier, an unlimited approval limit, and the orthogonal Owner flag. `isOwner` is
 * NOT a role and — in this epic — grants no additional permissions on its own; the team-management
 * consequences of ownership are layered on in EPIC-CW-018. Kept as a pure function so the "what an
 * Owner is" decision lives in one testable place rather than as a literal at the provisioning site.
 */
export interface OwnerProvisioning {
  role: Role;
  /** Minor units; null = unlimited (Controller). */
  approvalLimit: number | null;
  isOwner: true;
}

export function ownerProvisioning(): OwnerProvisioning {
  return { role: 'controller', approvalLimit: null, isOwner: true };
}

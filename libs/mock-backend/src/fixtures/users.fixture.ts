import type { Role } from '@clearline/contracts';

export interface SeedUser {
  id: string;
  email: string;
  /** PBKDF2-HMAC-SHA256 hash (see @clearline/domain-auth password-hashing) — never plaintext, even in seed data. */
  passwordHash: string;
  /** False from account creation (US-CW-029 AC-01) until the sign-up verification link is clicked (AC-03). */
  verified: boolean;
  /** Human-readable name for the nav sidebar/avatar (US-CW-006). */
  displayName: string;
  /** Approval-tier role — decides the permission set, re-read on every session check (US-CW-006). */
  role: Role;
  /** Approval limit in minor units; null = unlimited (Controller). */
  approvalLimit: number | null;
  /** Orthogonal to the approval tier — grants team:view only, never approval authority. */
  isAdmin: boolean;
}

/** The plaintext DEMO_USER_PASSWORD was hashed from, kept only so local dev/tests can log in as the seed user. */
export const DEMO_USER_PASSWORD = 'Correct-Horse-Battery-1';

/**
 * Deterministic seed users for local dev/demo and tests — never real credentials. The demo account
 * starts as a Finance Manager with a $10,000 limit (the most feature-rich shell to explore), and
 * the role can be switched mid-session via simulateRoleChangeForE2E to exercise every US-CW-006 shell.
 */
export const SEED_USERS: SeedUser[] = [
  {
    id: 'user_1',
    email: 'demo@clearline.dev',
    passwordHash:
      'pbkdf2-sha256$210000$EVdpGm+5ZSyaf/tp5qNqAA==$2HU7zHF8PxFivV/4XCZ8GGQeUpHl/B71IO6/yMl3ZhM=',
    verified: true,
    displayName: 'Marcus Okafor',
    role: 'finance_manager',
    approvalLimit: 1_000_000,
    isAdmin: false,
  },
];

import { ApprovalsService } from './approvals.service';

/**
 * The one ApprovalsService the running app's approval handlers bind to, so a GET queue and a
 * subsequent POST approve read and mutate the same in-memory state (same rationale as
 * sharedAuthService). Unlike auth, the queue isn't persisted across a full page reload — it resets
 * to the seed fixtures, which is fine for a demo queue; tests inject their own isolated instance.
 */
export const sharedApprovalsService = new ApprovalsService();

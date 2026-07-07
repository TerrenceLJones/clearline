import { Outlet, useNavigate } from 'react-router';
import type { Permission } from '@clearline/contracts';
import { AccessDenied } from '@clearline/ui';
import { useAuthorization } from '@clearline/data-access-auth';

export interface RequirePermissionProps {
  /** The permission the nested routes require. */
  permission: Permission;
  /** The gated API path, restated in the access-denied panel as "403 Forbidden · GET <path>" (design's "client hides, server decides"). */
  apiPath?: string;
}

/**
 * Route guard for a role-gated section — mount it as a layout route's element with the required
 * permission, and nest the protected pages under it. When the current role lacks the permission it
 * renders the access-denied surface *in place of* the page (nested inside AppShell, so the nav stays
 * visible, per the design), rather than redirecting away. This is the client half of US-CW-006 AC-04;
 * the server independently rejects the underlying API with a 403 regardless of what renders here.
 *
 * Renders nothing while the session (and therefore the role) is still loading, to avoid flashing the
 * access-denied panel before entitlements are known.
 */
export function RequirePermission({ permission, apiPath }: RequirePermissionProps) {
  const { can, isLoading } = useAuthorization();
  const navigate = useNavigate();

  if (isLoading) return null;

  if (!can(permission)) {
    return (
      <AccessDenied
        message="Ask an admin if you need it. This page is available to a different role."
        requestLine={apiPath ? `403 Forbidden · GET ${apiPath}` : undefined}
        actionLabel="Back to My Expenses"
        onAction={() => navigate('/')}
      />
    );
  }

  return <Outlet />;
}

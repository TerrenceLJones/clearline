import { useMemo } from 'react';
import type { Permission, Role } from '@clearline/contracts';
import { hasPermission, permissionsForRole } from '@clearline/domain-auth';
import { useSession } from './use-session';

export interface Authorization {
  /** True until the session query first resolves — render nav/actions as loading, not empty, to avoid a flash. */
  isLoading: boolean;
  role: Role | null;
  isAdmin: boolean;
  /** Minor units; null = unlimited (Controller) or unknown (not yet loaded). */
  approvalLimit: number | null;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
}

/**
 * Derives the current user's permission set from their live session role — the single source the UI
 * reads to decide what nav and actions to render. It does NOT make authorization safe on its own:
 * every gated request is still independently re-checked server-side (US-CW-006). Because it's built
 * on useSession, a mid-session role change picked up by the next session refetch flows straight
 * through here, so nav and actions re-render against the new role without a reload (AC-05).
 */
export function useAuthorization(): Authorization {
  const { data, isPending } = useSession();

  return useMemo<Authorization>(() => {
    if (!data) {
      return {
        isLoading: isPending,
        role: null,
        isAdmin: false,
        approvalLimit: null,
        permissions: [],
        can: () => false,
      };
    }

    const permissions = permissionsForRole(data.role, { isAdmin: data.isAdmin });
    return {
      isLoading: false,
      role: data.role,
      isAdmin: data.isAdmin,
      approvalLimit: data.approvalLimit,
      permissions,
      can: (permission) => hasPermission(permissions, permission),
    };
  }, [data, isPending]);
}

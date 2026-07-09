import { useEffect, useRef, useState } from 'react';
import type { Permission } from '@clearline/contracts';
import { useAuthorization } from './use-authorization';

export interface AccessChanged {
  /** True once a session refetch reveals the user lost a permission they previously had (a mid-session downgrade). */
  accessChanged: boolean;
  /** Dismisses the banner until the next downgrade. */
  dismiss: () => void;
}

/**
 * Watches the live permission set for a shrink between renders — the signal for US-CW-006 AC-05's
 * "Your access changed" banner. Only a *lost* permission trips it; gaining permissions (an upgrade)
 * doesn't, since nothing the user could see is being taken away. Compares against the previous
 * permission set (not the current role name) so it stays correct even as the role vocabulary grows.
 */
export function useAccessChanged(): AccessChanged {
  const { permissions, isLoading, role } = useAuthorization();
  const previousRef = useRef<Permission[] | null>(null);
  const [accessChanged, setAccessChanged] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    // No session (logout / revocation) is not a downgrade — reset the baseline so signing back in
    // doesn't spuriously trip the banner, and so a session-end race can't flash "access changed".
    if (role === null) {
      previousRef.current = null;
      return;
    }
    const previous = previousRef.current;
    if (previous) {
      const lostAPermission = previous.some((p) => !permissions.includes(p));
      if (lostAPermission) setAccessChanged(true);
    }
    previousRef.current = [...permissions];
  }, [permissions, isLoading, role]);

  return { accessChanged, dismiss: () => setAccessChanged(false) };
}

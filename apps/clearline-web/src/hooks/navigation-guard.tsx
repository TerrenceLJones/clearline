import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, type NavigateOptions } from 'react-router';
import { ConfirmationDialog } from '@clearline/ui';
import { NavigationGuardContext, type GuardedNavigate } from './navigation-guard-context';

/** What a blocked leave attempt was trying to do, so confirming it can replay the right navigation. */
type PendingNavigation = { kind: 'spa'; to: string; options?: NavigateOptions } | { kind: 'back' };

/**
 * A lightweight navigation guard for unsaved-changes warnings (US-CW-034 AC-02), built for the app's
 * component `<BrowserRouter>` — React Router's `useBlocker` needs a data router, which the app doesn't
 * use. A page arms the guard with `useRegisterNavigationGuard(isDirty)`. It intercepts three ways to
 * leave a dirty page:
 *
 *  1. In-app links — the central nav dispatchers (the primary sidebar in AppChrome, the SettingsNav in
 *     SettingsLayout) route clicks through `useGuardedNavigate()`, which defers behind the confirm.
 *  2. Browser Back/Forward — while armed, a sentinel history entry (same URL) is kept so the first
 *     Back/Forward pops the sentinel instead of the real page; we re-absorb it and prompt, then unwind
 *     to the intended entry on confirm. Without this, back/forward would silently discard changes.
 *  3. Hard navigations (reload, tab close, external links) — covered separately by each form's
 *     `beforeunload` handler; the browser's own dialog is the only option there.
 *
 * The context + hooks live in navigation-guard-context.ts; this file exports only the provider so React
 * Fast Refresh stays happy.
 */
export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const blockRef = useRef(false);
  const navigate = useNavigate();
  const [armed, setArmedState] = useState(false);
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  // Mirror of `pending` the stable popstate listener can read without re-subscribing on each change.
  const pendingRef = useRef<PendingNavigation | null>(null);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  // True only while we intentionally unwind history on "Discard & leave", so neither the popstate
  // listener nor the disarm cleanup mistakes our own navigation for another leave attempt.
  const leavingRef = useRef(false);

  const setArmed = useCallback((active: boolean) => {
    blockRef.current = active;
    setArmedState(active);
  }, []);

  const guardedNavigate = useCallback<GuardedNavigate>(
    (to, options) => {
      if (blockRef.current) setPending({ kind: 'spa', to, options });
      else navigate(to, options);
    },
    [navigate],
  );

  // Browser Back/Forward guard. While armed, keep a sentinel history entry carrying the current URL
  // (and React Router's own history state, so its location bookkeeping isn't clobbered). The first
  // Back/Forward pops the sentinel rather than the real page; we re-push it to stay put and prompt.
  useEffect(() => {
    if (!armed) return;
    const stay = () => window.history.pushState(window.history.state, '', window.location.href);
    stay();
    function onPopState() {
      if (!blockRef.current || leavingRef.current) return;
      // Re-absorb every Back/Forward so repeated presses can't reach a prior route and unmount the
      // form before the user answers the prompt; only open one dialog.
      stay();
      if (!pendingRef.current) setPending({ kind: 'back' });
    }
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      // Normal disarm (the form was saved/discarded in place): drop the sentinel we added so the
      // browser Back button isn't left one press "behind". Skipped when we're deliberately leaving.
      if (leavingRef.current) leavingRef.current = false;
      else window.history.back();
    };
  }, [armed]);

  const proceed = useCallback(() => {
    const target = pendingRef.current;
    setPending(null);
    if (!target) return;
    blockRef.current = false;
    if (target.kind === 'spa') {
      navigate(target.to, target.options);
    } else {
      // Leaving via Back/Forward: unwind past the sentinel AND the current page to the entry the user
      // was actually returning to. leavingRef suppresses re-blocking while this navigation settles.
      leavingRef.current = true;
      window.history.go(-2);
      // Self-heal: if there was no earlier entry to return to (the form was the first history entry),
      // go(-2) is a no-op and no popstate fires — clear the flag on the next tick so the guard re-arms
      // instead of staying silently disabled. The real-navigation case has already unmounted by then.
      window.setTimeout(() => {
        leavingRef.current = false;
      }, 0);
    }
  }, [navigate]);

  return (
    <NavigationGuardContext.Provider value={{ blockRef, guardedNavigate, setArmed }}>
      {children}
      <ConfirmationDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Discard unsaved changes?"
        body="You have unsaved changes on this page. If you leave now, they'll be lost."
        confirmLabel="Discard & leave"
        onConfirm={proceed}
        countdown={0}
      />
    </NavigationGuardContext.Provider>
  );
}

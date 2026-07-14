/**
 * Reset the demo to its seeded starting point. The MSW services hold their mutable state in-memory
 * (role changes, payment reversals) plus a little in sessionStorage (the access token and rehydrated
 * onboarding progress), so clearing sessionStorage and hard-reloading re-runs the mock-backend's
 * seeding from scratch — a clean slate for the next tester. Reloads the current page in place rather
 * than navigating to a fixed route: clearing the token logs the tester out, so RequireAuth then
 * lands them on /login from wherever they reset. Bound to the Beacon's "Reset demo data" action,
 * which gates it behind a confirm since it discards any in-progress work.
 */
export async function resetDemoState(): Promise<void> {
  try {
    sessionStorage.clear();
  } catch {
    // sessionStorage may be unavailable; the reload alone still resets in-memory MSW state.
  }
  window.location.reload();
}

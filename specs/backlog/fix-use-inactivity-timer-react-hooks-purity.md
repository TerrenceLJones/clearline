# Fix react-hooks `refs`/`purity` violations in `useInactivityTimer`

**Type:** Tech debt / Chore
**Component:** `libs/data-access/auth`
**Epic:** EPIC-CW-002 (session/idle-logout)
**Priority:** Low

## Background

`eslint-plugin-react-hooks` v7's stricter React-Compiler rules
(`react-hooks/refs`, `react-hooks/purity`) are currently scoped to component
files (`.jsx`/`.tsx`) only. That scoping was set deliberately in
`eslint.config.mjs` during the NewPaymentPage refactor (EPIC-CW-004) so the
classic hook rules could be extended to all `.ts` files without newly failing
existing `.ts` hooks on rules the team hasn't adopted there.

`libs/data-access/auth/src/use-inactivity-timer.ts` is the one `.ts` hook that
violates those stricter rules. This ticket tracks fixing it so `refs`/`purity`
can eventually be enabled repo-wide for `.ts` hooks.

> **Note:** These are React-Compiler purity/memoization concerns, **not** an
> active runtime bug. The idle-logout behavior (14-min warn / 15-min forced
> logout, US-CW-002 AC-04/AC-05) works correctly today. This is not urgent.

## Findings

1. **`use-inactivity-timer.ts:37`** — `useRef(Date.now())` (`purity`)
   `Date.now()` is re-evaluated on every render, though only the first value is
   retained. Impure call during render.

2. **`use-inactivity-timer.ts:40`** — `onExpireRef.current = onExpire;` (`refs`)
   Latest-callback ref written during render. Documented anti-pattern (a
   discarded concurrent render can leave the ref mutated for a render that never
   commits).

3. **`use-inactivity-timer.ts:43-44`** —
   `useState(() => getWarningSecondsRemaining(lastActivityRef.current, Date.now()))`
   (`refs`)
   Reads `lastActivityRef.current` during render (in the lazy state
   initializer); also involves an impure `Date.now()`.

## Suggested approach

- Finding 2 is the clear win — move the ref sync into an effect:

  ```ts
  useEffect(() => {
    onExpireRef.current = onExpire;
  });
  ```

- Findings 1 & 3 need the timer's initialization restructured so "now" is not
  read during render — e.g. seed `lastActivityRef`/`secondsRemaining` in a mount
  effect rather than inline. Confirm the initial `secondsRemaining` value and
  first render still match current behavior.

## Acceptance criteria

- [ ] `use-inactivity-timer.ts` passes `react-hooks/refs` and
      `react-hooks/purity` with no suppressions.
- [ ] Existing `use-inactivity-timer.test.ts` passes unchanged (warn-at-14,
      expire-at-15, `onExpire` fires exactly once on the active→expired
      transition, `resetTimer` behavior). Add cases if the refactor changes
      initialization timing.
- [ ] `eslint.config.mjs`: promote `react-hooks/refs` + `react-hooks/purity`
      from the component-only block to the all-TS/JS block once this file is
      clean.
- [ ] Manual/verify pass on the idle-logout flow (warning modal appears, "Stay
      signed in" resets, forced logout fires).

## Out of scope

Any change to `ACTIVITY_EVENTS` or the warning-modal interaction — this ticket
is purely about hook-purity compliance with no behavior change.

import { expect, test, type MockBackend } from './support/fixtures';
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  expectSignedIn,
  fillLoginForm,
  navigateSpa,
} from './support/helpers';

// Budget Management is Controller-only (budget:view). The demo account seeds as a Finance Manager, so
// simulateRoleChangeForE2E stands in for an admin promoting it to Controller — the same mechanism
// rbac.spec.ts uses to tour every US-CW-006 shell. These specs drive US-CW-019 against the seeded
// department budgets (Engineering on-track, Marketing at the 80% warning, Sales over budget).
async function signInAsController(
  page: Parameters<typeof fillLoginForm>[0],
  mockBackend: MockBackend,
) {
  await mockBackend.simulateRoleChangeForE2E(DEMO_EMAIL, { role: 'controller' });
  await page.goto('/login');
  await fillLoginForm(page, DEMO_EMAIL, DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expectSignedIn(page);
  await navigateSpa(page, '/budgets');
  // Unique to this page — the "Budget Management" heading collides with the shell's h1.
  await expect(page.getByText(/Department budgets · July 2026/)).toBeVisible();
}

test('shows each department gauge with an accessible threshold state, never colour alone (AC-02/AC-03)', async ({
  page,
  mockBackend,
}) => {
  await signInAsController(page, mockBackend);

  // 80% warning: spelled out in text, with the stakeholder-notification record.
  await expect(page.getByText('80% of budget used')).toBeVisible();
  await expect(page.getByText('Stakeholders notified').first()).toBeVisible();
  // Over budget: the exact overage in text (AC-03), not just a colour.
  await expect(page.getByText('104% of budget used — $2,000.00 over')).toBeVisible();
  // On track: an icon + label, not colour alone.
  await expect(page.getByText('On track').first()).toBeVisible();
});

test('sets a department budget and the gauge starts at $0.00 spent (AC-01)', async ({
  page,
  mockBackend,
}) => {
  await signInAsController(page, mockBackend);

  await page.getByRole('button', { name: 'Set a budget' }).click();

  // Pick a department and a monthly budget, then save.
  await page.getByLabel('Department', { exact: true }).click();
  await page.getByRole('option', { name: 'Engineering' }).click();
  await page.getByLabel('Monthly budget').fill('30000');
  await page.getByRole('button', { name: 'Save budget' }).click();

  // Back on the overview, Engineering now reads $0.00 of the new $30,000.00 budget.
  await expect(page.getByText(/Department budgets · July 2026/)).toBeVisible();
  await expect(page.getByText('$0.00 / $30,000.00')).toBeVisible();
});

test('opens a department’s budget history with prior periods preserved (AC-04)', async ({
  page,
  mockBackend,
}) => {
  await signInAsController(page, mockBackend);

  await page.getByRole('link', { name: 'Engineering budget history' }).click();

  await expect(page.getByRole('heading', { name: 'Engineering · budget history' })).toBeVisible();
  await expect(page.getByText('Current')).toBeVisible();
  // The seeded June period is preserved and its over-budget result is spelled out.
  await expect(page.getByText('June 2026')).toBeVisible();
  await expect(page.getByText('104% · $2,000.00 over')).toBeVisible();
});

test('a Finance Manager cannot see or reach Budget Management (Controller-only)', async ({
  page,
}) => {
  await page.goto('/login');
  await fillLoginForm(page, DEMO_EMAIL, DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expectSignedIn(page); // seeds as Finance Manager

  // The nav item is capability-gated on budget:view, which a Finance Manager lacks.
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByText('Budget Management')).toHaveCount(0);

  // The route is guarded independently of the nav — a direct navigation hits access-denied, and the
  // server would reject GET /api/budgets with a 403.
  await navigateSpa(page, '/budgets');
  await expect(page.getByText("You don't have access to this")).toBeVisible();
  await expect(page.getByText('403 Forbidden · GET /api/budgets')).toBeVisible();
});

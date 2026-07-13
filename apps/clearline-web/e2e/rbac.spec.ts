import { expect, test } from './support/fixtures';
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  expectSignedIn,
  fillLoginForm,
  navigateSpa,
} from './support/helpers';

// The demo account seeds as a Finance Manager ($10k limit); simulateRoleChangeForE2E stands in for
// an admin reassigning the role, letting one account tour every US-CW-006 shell. React Query's
// refetch-on-window-focus (visibilitychange) is how a mid-session change surfaces on the "next
// request" without a reload — the same mechanism session.spec.ts uses.
async function signIn(page: Parameters<typeof fillLoginForm>[0]) {
  await page.goto('/login');
  await fillLoginForm(page, DEMO_EMAIL, DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expectSignedIn(page);
}

async function triggerSessionRefetch(page: Parameters<typeof fillLoginForm>[0]) {
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
}

test('an Employee sees only My Expenses and My Cards in the nav (AC-01)', async ({
  page,
  mockBackend,
}) => {
  await mockBackend.simulateRoleChangeForE2E(DEMO_EMAIL, { role: 'employee', approvalLimit: null });
  await signIn(page);

  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByText('My Cards')).toBeVisible();
  await expect(nav.getByText('My Expenses')).toBeVisible();
  await expect(nav.getByText('Approvals')).toHaveCount(0);
  await expect(nav.getByText('Reconciliation')).toHaveCount(0);
});

test('a Controller sees Budget Management and Audit Log on top of the manager nav (AC-03)', async ({
  page,
  mockBackend,
}) => {
  await mockBackend.simulateRoleChangeForE2E(DEMO_EMAIL, {
    role: 'controller',
    approvalLimit: null,
  });
  await signIn(page);

  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByText('Budget Management')).toBeVisible();
  await expect(nav.getByText('Audit Log')).toBeVisible();
});

test('an Employee navigating directly to /approvals hits the access-denied page (AC-04)', async ({
  page,
  mockBackend,
}) => {
  await mockBackend.simulateRoleChangeForE2E(DEMO_EMAIL, { role: 'employee', approvalLimit: null });
  await signIn(page);

  await navigateSpa(page, '/approvals');

  await expect(page.getByText("You don't have access to this")).toBeVisible();
  await expect(page.getByText('403 Forbidden · GET /api/approvals')).toBeVisible();
});

test('an Employee cannot see or reach Payments (EPIC-CW-004)', async ({ page, mockBackend }) => {
  await mockBackend.simulateRoleChangeForE2E(DEMO_EMAIL, { role: 'employee', approvalLimit: null });
  await signIn(page);

  // The Payments nav item is capability-gated on payments:create, which an Employee lacks.
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByText('Payments')).toHaveCount(0);

  // The route is guarded independently of the nav — a direct navigation hits the access-denied
  // surface, not a UI-only gate, and the server would reject GET /api/payments/context with a 403.
  await navigateSpa(page, '/payments/new');
  await expect(page.getByText("You don't have access to this")).toBeVisible();
  await expect(page.getByText('403 Forbidden · GET /api/payments/context')).toBeVisible();
});

test('a mid-session downgrade shows the access-changed banner and hides manager nav (AC-05)', async ({
  page,
  mockBackend,
}) => {
  await signIn(page); // seeds as Finance Manager
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByText('Approvals')).toBeVisible();

  await mockBackend.simulateRoleChangeForE2E(DEMO_EMAIL, { role: 'employee', approvalLimit: null });
  await triggerSessionRefetch(page);

  await expect(
    page.getByText('Your access changed. Some features may no longer be available.'),
  ).toBeVisible();
  await expect(nav.getByText('Approvals')).toHaveCount(0);
});

test('a Finance Manager is blocked from over-limit approval and offered escalation (AC-06)', async ({
  page,
}) => {
  await signIn(page); // Finance Manager, $10k limit
  await page.getByRole('navigation', { name: 'Main' }).getByText('Approvals').click();

  await expect(page.getByText('Tom Becker')).toBeVisible();
  await expect(
    page.getByText(/This exceeds your approval limit of \$10,000\.00\. Route it to a Controller/),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Escalate' })).toBeVisible();
});

test('a Finance Manager cannot approve their own expense (AC-07)', async ({ page }) => {
  await signIn(page); // demo account also submitted exp_4460 itself
  await page.getByRole('navigation', { name: 'Main' }).getByText('Approvals').click();

  await expect(
    page.getByText("You can't approve your own expense. It needs another approver."),
  ).toBeVisible();
});

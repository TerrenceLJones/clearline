import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { createBudgetsHandlers } from './budgets.handlers';
import { AuthService } from '../services/auth.service';
import { BudgetsService } from '../services/budgets.service';
import { SEED_USERS, DEMO_USER_PASSWORD } from '../fixtures/users.fixture';

const controller = SEED_USERS.find((u) => u.role === 'controller')!;
const financeManager = SEED_USERS.find((u) => u.role === 'finance_manager')!;
const IP = '127.0.0.1 (mocked)';
const ORIGIN = 'http://budgets-test.example';

let authService: AuthService;
let budgetsService: BudgetsService;
let server: ReturnType<typeof setupServer>;

beforeAll(() => {
  server = setupServer();
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  authService = new AuthService();
  budgetsService = new BudgetsService();
  server.use(...createBudgetsHandlers(budgetsService, authService));
});

async function loginAs(email: string): Promise<string> {
  const { accessToken } = await authService.login(email, DEMO_USER_PASSWORD, IP);
  return accessToken!;
}

function get(path: string, token?: string) {
  return fetch(`${ORIGIN}/api/budgets${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function post(token: string, body: unknown) {
  return fetch(`${ORIGIN}/api/budgets`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('budget endpoints — auth', () => {
  it('returns 401 without an access token', async () => {
    expect((await get('')).status).toBe(401);
  });

  it('returns 403 for a Finance Manager (no budget:view — Controller only)', async () => {
    const token = await loginAs(financeManager.email);
    const response = await get('', token);
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe('forbidden_role');
  });

  it('serves the overview for a Controller (has budget:view)', async () => {
    const token = await loginAs(controller.email);
    const response = await get('', token);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.periodLabel).toBe('July 2026');
    expect(body.budgets.length).toBeGreaterThan(0);
  });
});

describe('budget history endpoint', () => {
  it('returns a department history newest-first', async () => {
    const token = await loginAs(controller.email);
    const body = await (await get('/engineering/history', token)).json();
    expect(body.department).toBe('Engineering');
    expect(body.periods[0].periodLabel).toBe('July 2026');
  });

  it('returns 404 for an unknown department', async () => {
    const token = await loginAs(controller.email);
    const response = await get('/legal/history', token);
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('department_not_found');
  });
});

describe('set budget endpoint (AC-01)', () => {
  it('saves a budget and starts the period at $0 spent', async () => {
    const token = await loginAs(controller.email);
    const response = await post(token, {
      department: 'Engineering',
      amountMinorUnits: 5_000_000,
      currency: 'USD',
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.budget.budget.amountMinorUnits).toBe(5_000_000);
    expect(body.budget.spent.amountMinorUnits).toBe(0);
  });

  it('rejects a non-positive amount with 422 invalid_amount', async () => {
    const token = await loginAs(controller.email);
    const response = await post(token, {
      department: 'Engineering',
      amountMinorUnits: 0,
      currency: 'USD',
    });
    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe('invalid_amount');
  });
});

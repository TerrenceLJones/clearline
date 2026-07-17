import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { BudgetForbiddenError } from './budgets-forbidden-error';
import { useBudgetOverview } from './use-budget-overview';
import { createQueryWrapper } from './test/create-query-wrapper';

const server = registerMswServer();
const wrapper = createQueryWrapper({ queries: { retry: false } });

afterEach(() => clearAccessToken());

describe('useBudgetOverview', () => {
  it('returns the department overview on success', async () => {
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/budgets', () =>
        HttpResponse.json({
          periodLabel: 'July 2026',
          budgets: [
            {
              id: 'engineering-2026-07',
              department: 'Engineering',
              periodLabel: 'July 2026',
              periodKey: '2026-07',
              budget: { amountMinorUnits: 5_000_000, currency: 'USD' },
              spent: { amountMinorUnits: 2_300_000, currency: 'USD' },
              notifiedAt: null,
              isCurrent: true,
            },
          ],
        }),
      ),
    );

    const { result } = renderHook(() => useBudgetOverview(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.periodLabel).toBe('July 2026');
    expect(result.current.data?.budgets[0]?.department).toBe('Engineering');
  });

  it('maps a 403 to a typed BudgetForbiddenError (access-denied)', async () => {
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/budgets', () =>
        HttpResponse.json({ error: 'forbidden_role' }, { status: 403 }),
      ),
    );

    const { result } = renderHook(() => useBudgetOverview(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(BudgetForbiddenError);
  });
});

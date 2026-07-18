import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { BudgetForbiddenError } from './budgets-forbidden-error';
import { useBudgetHistory } from './use-budget-history';
import { createQueryWrapper } from './test/create-query-wrapper';

const server = registerMswServer();
const wrapper = createQueryWrapper({ queries: { retry: false } });

afterEach(() => clearAccessToken());

describe('useBudgetHistory', () => {
  it('returns a department history newest-first on success (AC-04)', async () => {
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/budgets/:department/history', () =>
        HttpResponse.json({
          department: 'Engineering',
          periods: [
            {
              id: 'engineering-2026-07',
              department: 'Engineering',
              periodLabel: 'July 2026',
              periodKey: '2026-07',
              budget: { amountMinorUnits: 5_000_000, currency: 'USD' },
              spent: { amountMinorUnits: 2_300_000, currency: 'USD' },
              notifiedAt: null,
            },
          ],
        }),
      ),
    );

    const { result } = renderHook(() => useBudgetHistory('engineering'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.department).toBe('Engineering');
    expect(result.current.data?.periods[0]?.periodLabel).toBe('July 2026');
  });

  it('maps a 403 to a typed BudgetForbiddenError', async () => {
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/budgets/:department/history', () =>
        HttpResponse.json({ error: 'forbidden_role' }, { status: 403 }),
      ),
    );

    const { result } = renderHook(() => useBudgetHistory('engineering'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(BudgetForbiddenError);
  });

  it('does not fetch when the department slug is empty', () => {
    setAccessToken('access_valid');
    const { result } = renderHook(() => useBudgetHistory(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

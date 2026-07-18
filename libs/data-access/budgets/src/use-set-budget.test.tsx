import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { BudgetValidationError, useSetBudget } from './use-set-budget';
import { createQueryWrapper } from './test/create-query-wrapper';

const server = registerMswServer();
const wrapper = createQueryWrapper({ queries: { retry: false }, mutations: { retry: false } });

const INPUT = { department: 'Engineering', amountMinorUnits: 5_000_000, currency: 'USD' };

afterEach(() => clearAccessToken());

describe('useSetBudget', () => {
  it('returns the saved budget (reset to $0 spent) on success (AC-01)', async () => {
    setAccessToken('access_valid');
    server.use(
      http.post('*/api/budgets', () =>
        HttpResponse.json(
          {
            budget: {
              id: 'engineering-2026-07',
              department: 'Engineering',
              periodLabel: 'July 2026',
              periodKey: '2026-07',
              budget: { amountMinorUnits: 5_000_000, currency: 'USD' },
              spent: { amountMinorUnits: 0, currency: 'USD' },
              notifiedAt: null,
              isCurrent: true,
            },
          },
          { status: 201 },
        ),
      ),
    );

    const { result } = renderHook(() => useSetBudget(), { wrapper });
    result.current.mutate(INPUT);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.budget.spent.amountMinorUnits).toBe(0);
  });

  it('maps a 422 invalid_amount to a typed BudgetValidationError', async () => {
    setAccessToken('access_valid');
    server.use(
      http.post('*/api/budgets', () =>
        HttpResponse.json({ error: 'invalid_amount' }, { status: 422 }),
      ),
    );

    const { result } = renderHook(() => useSetBudget(), { wrapper });
    result.current.mutate({ ...INPUT, amountMinorUnits: 0 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error;
    expect(error).toBeInstanceOf(BudgetValidationError);
    if (error instanceof BudgetValidationError) {
      expect(error.code).toBe('invalid_amount');
    }
  });
});

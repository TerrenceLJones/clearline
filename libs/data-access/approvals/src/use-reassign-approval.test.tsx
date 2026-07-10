import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { useReassignApproval } from './use-reassign-approval';
import { createQueryWrapper } from './test/create-query-wrapper';

const server = registerMswServer();
const wrapper = createQueryWrapper({ mutations: { retry: false } });

afterEach(() => clearAccessToken());

describe('useReassignApproval', () => {
  it('resolves with the reassigned item', async () => {
    setAccessToken('access_valid');
    server.use(
      http.post('*/api/approvals/:id/reassign', () =>
        HttpResponse.json({
          item: {
            id: 'exp_4460',
            submitterId: 'user_1',
            submitterName: 'Marcus Okafor',
            category: 'Meals',
            amount: { amountMinorUnits: 18_000, currency: 'USD' },
            submittedDate: '2026-06-26',
            status: 'pending_l1',
          },
        }),
      ),
    );

    const { result } = renderHook(() => useReassignApproval(), { wrapper });
    result.current.mutate('exp_4460');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.item.id).toBe('exp_4460');
  });
});

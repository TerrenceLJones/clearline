import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { useRejectApproval } from './use-reject-approval';
import { createQueryWrapper } from './test/create-query-wrapper';

const server = registerMswServer();
const wrapper = createQueryWrapper({ mutations: { retry: false } });

afterEach(() => clearAccessToken());

describe('useRejectApproval', () => {
  it('resolves with the rejected item', async () => {
    setAccessToken('access_valid');
    server.use(
      http.post('*/api/approvals/:id/reject', () =>
        HttpResponse.json({
          item: {
            id: 'exp_4201',
            submitterId: 'user_201',
            submitterName: 'Priya Nair',
            category: 'Software',
            amount: { amountMinorUnits: 420_000, currency: 'USD' },
            submittedDate: '2026-06-28',
            status: 'pending_l1',
          },
        }),
      ),
    );

    const { result } = renderHook(() => useRejectApproval(), { wrapper });
    result.current.mutate('exp_4201');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.item.id).toBe('exp_4201');
  });
});

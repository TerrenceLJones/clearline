import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { useEscalateApproval } from './use-escalate-approval';
import { createQueryWrapper } from './test/create-query-wrapper';

const server = registerMswServer();
const wrapper = createQueryWrapper({ mutations: { retry: false } });

afterEach(() => clearAccessToken());

describe('useEscalateApproval', () => {
  it('resolves with the item routed to L2', async () => {
    setAccessToken('access_valid');
    server.use(
      http.post('*/api/approvals/:id/escalate', () =>
        HttpResponse.json({
          item: {
            id: 'exp_4471',
            submitterId: 'user_203',
            submitterName: 'Tom Becker',
            category: 'Equipment',
            amount: { amountMinorUnits: 1_500_000, currency: 'USD' },
            submittedDate: '2026-06-27',
            status: 'pending_l2',
            escalatedBy: 'Marcus Okafor',
          },
        }),
      ),
    );

    const { result } = renderHook(() => useEscalateApproval(), { wrapper });
    result.current.mutate('exp_4471');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.item.status).toBe('pending_l2');
    expect(result.current.data?.item.escalatedBy).toBe('Marcus Okafor');
  });
});

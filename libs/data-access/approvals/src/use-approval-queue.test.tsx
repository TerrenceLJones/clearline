import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { ApprovalsForbiddenError, useApprovalQueue } from './use-approval-queue';
import { createQueryWrapper } from './test/create-query-wrapper';

const server = registerMswServer();
const wrapper = createQueryWrapper({ queries: { retry: false } });

afterEach(() => clearAccessToken());

describe('useApprovalQueue', () => {
  it('resolves with the pending items', async () => {
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/approvals', () =>
        HttpResponse.json({
          items: [
            {
              id: 'exp_4201',
              submitterId: 'user_201',
              submitterName: 'Priya Nair',
              category: 'Software',
              amount: { amountMinorUnits: 420_000, currency: 'USD' },
              submittedDate: '2026-06-28',
              status: 'pending_l1',
            },
          ],
        }),
      ),
    );

    const { result } = renderHook(() => useApprovalQueue(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0]?.id).toBe('exp_4201');
  });

  it('surfaces a 403 as ApprovalsForbiddenError (AC-04)', async () => {
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/approvals', () =>
        HttpResponse.json({ error: 'forbidden_role' }, { status: 403 }),
      ),
    );

    const { result } = renderHook(() => useApprovalQueue(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApprovalsForbiddenError);
  });
});

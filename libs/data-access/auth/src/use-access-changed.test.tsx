import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Role } from '@clearline/contracts';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { useAccessChanged } from './use-access-changed';
import { useAuthorization } from './use-authorization';
import { clearAccessToken, setAccessToken } from './access-token-store';

const server = registerMswServer();

afterEach(() => clearAccessToken());

/** Observes both the resolved role (to await the baseline) and the access-changed flag from one render. */
function renderAccessChanged(getRole: () => Role) {
  setAccessToken('access_valid');
  server.use(
    http.get('*/api/auth/session', () =>
      HttpResponse.json({
        userId: 'user_1',
        email: 'demo@clearline.dev',
        displayName: 'Marcus Okafor',
        role: getRole(),
        approvalLimit: getRole() === 'finance_manager' ? 1_000_000 : null,
        isAdmin: false,
      }),
    ),
  );

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => ({ ...useAccessChanged(), role: useAuthorization().role }), {
    wrapper,
  });
  return { ...view, queryClient };
}

describe('useAccessChanged', () => {
  it('does not flag a change on first load', async () => {
    const { result } = renderAccessChanged(() => 'finance_manager');
    await waitFor(() => expect(result.current.role).toBe('finance_manager'));
    expect(result.current.accessChanged).toBe(false);
  });

  it('flags a change when a mid-session downgrade removes a permission (AC-05)', async () => {
    let role: Role = 'finance_manager';
    const { result, queryClient } = renderAccessChanged(() => role);
    await waitFor(() => expect(result.current.role).toBe('finance_manager'));

    role = 'employee';
    await queryClient.invalidateQueries({ queryKey: ['session'] });

    await waitFor(() => expect(result.current.accessChanged).toBe(true));
  });

  it('does not flag an upgrade that only adds permissions', async () => {
    let role: Role = 'employee';
    const { result, queryClient } = renderAccessChanged(() => role);
    await waitFor(() => expect(result.current.role).toBe('employee'));

    role = 'finance_manager';
    await queryClient.invalidateQueries({ queryKey: ['session'] });
    await waitFor(() => expect(result.current.role).toBe('finance_manager'));
    expect(result.current.accessChanged).toBe(false);
  });

  it('does not flag a change when the session ends (logout is not a downgrade)', async () => {
    let authed = true;
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/auth/session', () => {
        if (!authed) return HttpResponse.json({ error: 'invalid_token' }, { status: 401 });
        return HttpResponse.json({
          userId: 'user_1',
          email: 'demo@clearline.dev',
          displayName: 'Marcus Okafor',
          role: 'finance_manager',
          approvalLimit: 1_000_000,
          isAdmin: false,
        });
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => ({ ...useAccessChanged(), role: useAuthorization().role }),
      {
        wrapper,
      },
    );
    await waitFor(() => expect(result.current.role).toBe('finance_manager'));

    // Logout clears the session from the cache (data → undefined), unlike a transient error which
    // keeps stale data. resetQueries reproduces that: the refetch 401s with no prior data to retain.
    authed = false;
    await queryClient.resetQueries({ queryKey: ['session'] });
    await waitFor(() => expect(result.current.role).toBeNull());
    expect(result.current.accessChanged).toBe(false);
  });

  it('clears once dismissed', async () => {
    let role: Role = 'finance_manager';
    const { result, queryClient } = renderAccessChanged(() => role);
    await waitFor(() => expect(result.current.role).toBe('finance_manager'));

    role = 'employee';
    await queryClient.invalidateQueries({ queryKey: ['session'] });
    await waitFor(() => expect(result.current.accessChanged).toBe(true));

    result.current.dismiss();
    await waitFor(() => expect(result.current.accessChanged).toBe(false));
  });
});

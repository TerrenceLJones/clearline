import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { Role } from '@clearline/contracts';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { RequirePermission } from './RequirePermission';
import { withQueryClient } from '../test/with-query-client';

const server = registerMswServer();

afterEach(() => clearAccessToken());

function mockRole(role: Role) {
  setAccessToken('access_valid');
  server.use(
    http.get('*/api/auth/session', () =>
      HttpResponse.json({
        userId: 'user_1',
        email: 'demo@clearline.dev',
        displayName: 'Marcus Okafor',
        role,
        approvalLimit: role === 'finance_manager' ? 1_000_000 : null,
        isAdmin: false,
      }),
    ),
  );
}

function renderGuardedApprovals() {
  return render(
    withQueryClient(
      <MemoryRouter initialEntries={['/approvals']}>
        <Routes>
          <Route
            element={<RequirePermission permission="approvals:view" apiPath="/api/approvals" />}
          >
            <Route path="/approvals" element={<div>Approvals content</div>} />
          </Route>
          <Route path="/" element={<div>My Expenses home</div>} />
        </Routes>
      </MemoryRouter>,
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    ),
  );
}

describe('RequirePermission', () => {
  it('renders the protected route for a role that has the permission', async () => {
    mockRole('finance_manager');
    renderGuardedApprovals();
    await waitFor(() => expect(screen.getByText('Approvals content')).toBeInTheDocument());
  });

  it('renders access-denied for a role that lacks it, without leaving the shell (AC-04)', async () => {
    mockRole('employee');
    renderGuardedApprovals();

    await waitFor(() =>
      expect(screen.getByText("You don't have access to this")).toBeInTheDocument(),
    );
    expect(screen.queryByText('Approvals content')).not.toBeInTheDocument();
    expect(screen.getByText('403 Forbidden · GET /api/approvals')).toBeInTheDocument();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { Role } from '@clearline/contracts';
import { ThemeProvider } from '@clearline/design-tokens';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { AppChrome } from './AppChrome';
import { withQueryClient } from './test/with-query-client';

const server = registerMswServer();

afterEach(() => clearAccessToken());

function mockRole(role: Role, isAdmin = false) {
  setAccessToken('access_valid');
  server.use(
    http.get('*/api/auth/session', () =>
      HttpResponse.json({
        userId: 'user_1',
        email: 'demo@clearline.dev',
        displayName: 'Marcus Okafor',
        role,
        approvalLimit: role === 'finance_manager' ? 1_000_000 : null,
        isAdmin,
      }),
    ),
  );
}

function renderChrome(initialEntry = '/') {
  return render(
    withQueryClient(
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<AppChrome />}>
              <Route path="/" element={<div>Home content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    ),
  );
}

describe('AppChrome role-scoped navigation', () => {
  it('shows only My Expenses and My Cards for an Employee (AC-01)', async () => {
    mockRole('employee');
    renderChrome();

    // "My Cards" is a nav-only label (unlike "My Expenses", which is also the page title), so it's
    // an unambiguous signal that the role-scoped nav has populated.
    await waitFor(() => expect(screen.getByText('My Cards')).toBeInTheDocument());
    expect(screen.queryByText('Approvals')).not.toBeInTheDocument();
    expect(screen.queryByText('Reconciliation')).not.toBeInTheDocument();
  });

  it('adds Approvals and Reconciliation for a Finance Manager (AC-02)', async () => {
    mockRole('finance_manager');
    renderChrome();

    await waitFor(() => expect(screen.getByText('Approvals')).toBeInTheDocument());
    expect(screen.getByText('Reconciliation')).toBeInTheDocument();
    expect(screen.queryByText('Budget Management')).not.toBeInTheDocument();
  });

  it('adds Budget Management and Audit Log for a Controller (AC-03)', async () => {
    mockRole('controller');
    renderChrome();

    await waitFor(() => expect(screen.getByText('Budget Management')).toBeInTheDocument());
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });

  it('adds Team for an Admin without any approval links (orthogonality)', async () => {
    mockRole('employee', true);
    renderChrome();

    await waitFor(() => expect(screen.getByText('Team')).toBeInTheDocument());
    expect(screen.queryByText('Approvals')).not.toBeInTheDocument();
  });
});

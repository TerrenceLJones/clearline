import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen } from '@testing-library/react';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { NewBudgetPage } from './NewBudgetPage';

const server = registerMswServer();
afterEach(() => clearAccessToken());

const usd = (amountMinorUnits: number) => ({ amountMinorUnits, currency: 'USD' });

function stubOverview() {
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
            budget: usd(5_000_000),
            spent: usd(2_300_000),
            notifiedAt: null,
            isCurrent: true,
          },
        ],
      }),
    ),
  );
}

function renderPage() {
  setAccessToken('access_valid');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/budgets/new']}>
        <Routes>
          <Route path="/budgets/new" element={<NewBudgetPage />} />
          <Route path="/budgets" element={<div>Budgets overview</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NewBudgetPage', () => {
  it('renders the form with Save disabled until a department and amount are chosen (AC-01)', async () => {
    stubOverview();
    renderPage();

    // Wait for the form itself (past the loading skeleton).
    const save = await screen.findByRole('button', { name: 'Save budget' });
    expect(screen.getByText(/Saving starts the gauge at \$0 spent/)).toBeInTheDocument();
    // Button soft-disables via aria-disabled (stays focusable) rather than the native attribute.
    expect(save).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows a retry when the department list fails to load (non-403)', async () => {
    setAccessToken('access_valid');
    server.use(http.get('*/api/budgets', () => HttpResponse.json({}, { status: 500 })));
    renderPage();

    expect(await screen.findByText("The department list couldn't load.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('degrades a 403 to access-denied', async () => {
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/budgets', () =>
        HttpResponse.json({ error: 'forbidden_role' }, { status: 403 }),
      ),
    );
    renderPage();

    expect(await screen.findByText(/403 Forbidden/)).toBeInTheDocument();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen } from '@testing-library/react';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { BudgetHistoryPage } from './BudgetHistoryPage';

const server = registerMswServer();
afterEach(() => clearAccessToken());

const usd = (amountMinorUnits: number) => ({ amountMinorUnits, currency: 'USD' });

function period(periodLabel: string, periodKey: string, budgetMinor: number, spentMinor: number) {
  return {
    id: `engineering-${periodKey}`,
    department: 'Engineering',
    periodLabel,
    periodKey,
    budget: usd(budgetMinor),
    spent: usd(spentMinor),
    notifiedAt: null,
  };
}

function stubHistory(periods: unknown[]) {
  server.use(
    http.get('*/api/budgets/:department/history', () =>
      HttpResponse.json({ department: 'Engineering', periods }),
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
      <MemoryRouter initialEntries={['/budgets/engineering/history']}>
        <Routes>
          <Route path="/budgets/:department/history" element={<BudgetHistoryPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BudgetHistoryPage', () => {
  it('lists prior periods with an under/over result, newest first (AC-04)', async () => {
    stubHistory([
      period('July 2026', '2026-07', 5_000_000, 2_300_000),
      period('June 2026', '2026-06', 5_000_000, 5_200_000),
      period('May 2026', '2026-05', 5_000_000, 4_680_000),
    ]);
    renderPage();

    expect(await screen.findByText('July 2026')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    // June over budget: exact overage; May under budget.
    expect(screen.getByText('104% · $2,000.00 over')).toBeInTheDocument();
    expect(screen.getByText('94% · under')).toBeInTheDocument();
  });

  it('shows the “new period started” banner when the current period is back to $0 (AC-04)', async () => {
    stubHistory([
      period('August 2026', '2026-08', 5_000_000, 0),
      period('July 2026', '2026-07', 5_000_000, 2_300_000),
    ]);
    renderPage();

    expect(await screen.findByText(/A new budget period started August 2026/)).toBeInTheDocument();
  });

  it('degrades a 403 to access-denied', async () => {
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/budgets/:department/history', () =>
        HttpResponse.json({ error: 'forbidden_role' }, { status: 403 }),
      ),
    );
    renderPage();

    expect(await screen.findByText(/403 Forbidden/)).toBeInTheDocument();
  });
});

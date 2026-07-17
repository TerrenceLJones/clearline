import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { BudgetOverviewPage } from './BudgetOverviewPage';

const server = registerMswServer();
afterEach(() => clearAccessToken());

const usd = (amountMinorUnits: number) => ({ amountMinorUnits, currency: 'USD' });

function dept(
  department: string,
  spentMinor: number,
  budgetMinor: number,
  notifiedAt: string | null = null,
) {
  return {
    id: `${department.toLowerCase()}-2026-07`,
    department,
    periodLabel: 'July 2026',
    periodKey: '2026-07',
    budget: usd(budgetMinor),
    spent: usd(spentMinor),
    notifiedAt,
    isCurrent: true,
  };
}

function stubOverview(budgets: unknown[] = DEFAULT_BUDGETS) {
  server.use(
    http.get('*/api/budgets', () => HttpResponse.json({ periodLabel: 'July 2026', budgets })),
  );
}

const DEFAULT_BUDGETS = [
  dept('Engineering', 2_300_000, 5_000_000),
  dept('Marketing', 4_000_000, 5_000_000, '2026-07-14T09:00:00.000Z'),
  dept('Sales', 5_200_000, 5_000_000, '2026-07-10T09:00:00.000Z'),
];

function renderPage() {
  setAccessToken('access_valid');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/budgets']}>
        <Routes>
          <Route path="/budgets" element={<BudgetOverviewPage />} />
          <Route
            path="/budgets/:department/history"
            element={<div>History for a department</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BudgetOverviewPage', () => {
  it('renders a gauge per department in each threshold state (AC-01/AC-02/AC-03)', async () => {
    stubOverview();
    renderPage();

    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    // 80% warning band, with the stakeholder notification surfaced.
    expect(screen.getByText('80% of budget used')).toBeInTheDocument();
    expect(screen.getAllByText('Stakeholders notified').length).toBeGreaterThan(0);
    // Over budget, exact overage spelled out in text (AC-03).
    expect(screen.getByText('104% of budget used — $2,000.00 over')).toBeInTheDocument();
  });

  it('degrades a 403 to access-denied rather than a broken page', async () => {
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/budgets', () =>
        HttpResponse.json({ error: 'forbidden_role' }, { status: 403 }),
      ),
    );
    renderPage();

    expect(await screen.findByText(/403 Forbidden · GET \/api\/budgets/)).toBeInTheDocument();
  });

  it('links each gauge to that department’s budget history (AC-04)', async () => {
    const user = userEvent.setup();
    stubOverview();
    renderPage();

    await screen.findByText('Engineering');
    await user.click(screen.getByRole('link', { name: 'Engineering budget history' }));
    expect(await screen.findByText('History for a department')).toBeInTheDocument();
  });
});

import { Link, useNavigate } from 'react-router';
import { BudgetForbiddenError, useBudgetOverview } from '@clearline/data-access-budgets';
import { AccessDenied, BudgetGauge, Button, Text } from '@clearline/ui';
import { toMajorUnits } from '@clearline/money';
import { useDemoBeacon } from '@clearline/demo-beacon';
import { usePageTitle } from '../../hooks/usePageTitle';
import { budgetBeacon } from './BudgetOverviewPage.beacon';
import { BudgetError, GaugeGridSkeleton } from './budget-chrome';
import { departmentSlug } from './budget-slug';

/**
 * The department budget overview (US-CW-019). One gauge per department for the current period —
 * on-track, amber at the 80% warning threshold (with the stakeholder-notified chip), or critical over
 * budget with the exact overage spelled out (AC-01/AC-02/AC-03) — each linking to that department's
 * history. A 403 degrades to access-denied, not a broken page (Budget Management is Controller-only).
 * Refresh re-reads spend as it accrues; "Set a budget" opens the new-budget form.
 */
export function BudgetOverviewPage() {
  usePageTitle('Budget Management');
  useDemoBeacon(budgetBeacon);
  const navigate = useNavigate();
  const overview = useBudgetOverview();

  // A mid-session downgrade (or a bypassed route guard) degrades to access-denied, not a broken page.
  if (overview.error instanceof BudgetForbiddenError) {
    return <AccessDenied requestLine="403 Forbidden · GET /api/budgets" />;
  }

  const budgets = overview.data?.budgets ?? [];

  return (
    <div className="font-sans">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text as="h2" size="heading" tone="default" className="mb-0.5">
            Budget Management
          </Text>
          <Text as="p" size="label" tone="muted" className="mb-0">
            {overview.data
              ? `Department budgets · ${overview.data.periodLabel}`
              : 'Department budgets'}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="refresh"
            loading={overview.isFetching}
            onClick={() => void overview.refetch()}
          >
            Refresh
          </Button>
          <Button variant="primary" size="sm" icon="plus" onClick={() => navigate('/budgets/new')}>
            Set a budget
          </Button>
        </div>
      </div>

      {overview.isError ? (
        <BudgetError onRetry={() => void overview.refetch()} />
      ) : overview.isPending ? (
        <GaugeGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => (
            <Link
              key={budget.id}
              to={`/budgets/${departmentSlug(budget.department)}/history`}
              className="focus-visible:ring-cl-accent-weak block rounded-xl outline-none focus-visible:ring-3"
              aria-label={`${budget.department} budget history`}
            >
              <BudgetGauge
                label={budget.department}
                used={toMajorUnits(budget.spent)}
                total={toMajorUnits(budget.budget)}
                currency={budget.budget.currency}
                notified={budget.notifiedAt !== null}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

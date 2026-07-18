import { Link, useParams } from 'react-router';
import type { BudgetPeriod } from '@clearline/contracts';
import { BudgetForbiddenError, useBudgetHistory } from '@clearline/data-access-budgets';
import { budgetStatus, overageMinorUnits, utilizationRatio } from '@clearline/domain-budgets';
import { AccessDenied, Icon, Text, formatMoneyValue } from '@clearline/ui';
import { useDemoBeacon } from '@clearline/demo-beacon';
import { usePageTitle } from '../../hooks/usePageTitle';
import { budgetBeacon } from './BudgetOverviewPage.beacon';
import { BudgetError } from './budget-chrome';

/** The Result cell for one period — under vs over budget, icon + text, never color alone (AC-03). */
function PeriodResult({ period }: { period: BudgetPeriod }) {
  const budgetMinor = period.budget.amountMinorUnits;
  const spentMinor = period.spent.amountMinorUnits;
  const pct = Math.round(utilizationRatio(spentMinor, budgetMinor) * 100);

  if (spentMinor === 0) {
    return (
      <Text as="span" size="label" tone="faint">
        {pct}% used
      </Text>
    );
  }
  if (budgetStatus(utilizationRatio(spentMinor, budgetMinor)) === 'over') {
    const over = formatMoneyValue({
      amountMinorUnits: overageMinorUnits(spentMinor, budgetMinor),
      currency: period.budget.currency,
    });
    return (
      <span className="text-cl-crit inline-flex items-center gap-1">
        <Icon name="octagon-alert" size={10} />
        <Text as="span" size="label" weight="semibold">
          {pct}% · {over} over
        </Text>
      </span>
    );
  }
  return (
    <span className="text-cl-pos inline-flex items-center gap-1">
      <Icon name="check" size={10} stroke={2.2} />
      <Text as="span" size="label" weight="semibold">
        {pct}% · under
      </Text>
    </span>
  );
}

/**
 * A department's Budget history (US-CW-019 AC-04). After a period rolls over, the new period starts at
 * $0.00 spent — surfaced here with a banner — while every prior period stays readable in the table, so
 * historical data is never dropped at the boundary. A 403 degrades to access-denied.
 */
export function BudgetHistoryPage() {
  const { department: slug = '' } = useParams();
  usePageTitle('Budget history');
  useDemoBeacon(budgetBeacon);
  const history = useBudgetHistory(slug);

  if (history.error instanceof BudgetForbiddenError) {
    return <AccessDenied requestLine={`403 Forbidden · GET /api/budgets/${slug}/history`} />;
  }

  const periods = history.data?.periods ?? [];
  const current = periods[0];
  const department = history.data?.department ?? slug;
  // The new period reads as freshly rolled over the moment its spend is back to zero (AC-04 / AC-01).
  const justRolledOver = current !== undefined && current.spent.amountMinorUnits === 0;

  return (
    <div className="font-sans">
      <Link
        to="/budgets"
        className="text-cl-text-2 mb-3 inline-flex items-center gap-1.5 text-[13px]"
      >
        <Icon name="arrow-left" size={13} />
        Back to budgets
      </Link>

      <Text as="h2" size="heading" tone="default" className="mb-4">
        {department} · budget history
      </Text>

      {history.isError ? (
        <BudgetError
          message="This department's history couldn't load."
          onRetry={() => void history.refetch()}
        />
      ) : history.isPending ? (
        <div className="border-cl-border bg-cl-surface rounded-xl border p-[18px]">
          <div className="cl-skeleton mb-3 h-2.5 w-1/2 rounded" aria-hidden="true" />
          <div className="cl-skeleton mb-3 h-2.5 w-full rounded" aria-hidden="true" />
          <div className="cl-skeleton h-2.5 w-2/3 rounded" aria-hidden="true" />
        </div>
      ) : (
        <>
          {justRolledOver && current ? (
            <div className="bg-cl-accent-weak mb-4 flex items-center gap-2.5 rounded-[10px] border border-[color-mix(in_srgb,var(--cl-accent)_22%,transparent)] px-4 py-3">
              <Icon name="refresh" size={16} className="text-cl-accent-text shrink-0" />
              <Text as="span" size="label" weight="semibold" tone="accent">
                A new budget period started {current.periodLabel} — {department} is at{' '}
                {formatMoneyValue(current.spent)} of {formatMoneyValue(current.budget)}.
              </Text>
            </div>
          ) : null}

          <div className="border-cl-border bg-cl-surface overflow-hidden rounded-xl border">
            <div className="border-cl-border grid grid-cols-[1fr_1fr_1fr_1.1fr] border-b px-4 py-2.5">
              <Text as="span" size="label" weight="semibold" tone="faint">
                Period
              </Text>
              <Text as="span" size="label" weight="semibold" tone="faint" className="text-right">
                Budget
              </Text>
              <Text as="span" size="label" weight="semibold" tone="faint" className="text-right">
                Spent
              </Text>
              <Text as="span" size="label" weight="semibold" tone="faint" className="text-right">
                Result
              </Text>
            </div>
            {periods.map((period, index) => (
              <div
                key={period.id}
                className={`grid grid-cols-[1fr_1fr_1fr_1.1fr] items-center px-4 py-3 ${
                  index < periods.length - 1 ? 'border-cl-border border-b' : ''
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Text
                    as="span"
                    size="label"
                    weight={index === 0 ? 'semibold' : undefined}
                    tone="default"
                  >
                    {period.periodLabel}
                  </Text>
                  {index === 0 ? (
                    <span className="bg-cl-accent-weak text-cl-accent-text rounded px-1.5 py-0.5 text-[10px] font-semibold">
                      Current
                    </span>
                  ) : null}
                </span>
                <Text as="span" size="mono" tone="muted" className="text-right">
                  {formatMoneyValue(period.budget)}
                </Text>
                <Text as="span" size="mono" weight="semibold" tone="default" className="text-right">
                  {formatMoneyValue(period.spent)}
                </Text>
                <span className="text-right">
                  <PeriodResult period={period} />
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

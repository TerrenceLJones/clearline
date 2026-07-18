import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetGauge } from './BudgetGauge';

describe('BudgetGauge', () => {
  it('shows "On track" under 80% usage', () => {
    render(<BudgetGauge label="Engineering" used={23000} total={50000} />);
    expect(screen.getByText('On track')).toBeInTheDocument();
    expect(screen.getByText('46% used')).toBeInTheDocument();
  });

  it('shows a "% used" warning state at or above 80%', () => {
    render(<BudgetGauge label="Marketing" used={40000} total={50000} />);
    expect(screen.getByText('80% used')).toBeInTheDocument();
    expect(screen.getByText('80% of budget used')).toBeInTheDocument();
  });

  it('spells out the exact overage in text when over budget (AC-03)', () => {
    render(<BudgetGauge label="Sales" used={52000} total={50000} />);
    expect(screen.getByText('Over')).toBeInTheDocument();
    expect(screen.getByText('104% of budget used — $2,000.00 over')).toBeInTheDocument();
  });

  it('surfaces "Stakeholders notified" only when notified and at/over the threshold (AC-02)', () => {
    const { rerender } = render(
      <BudgetGauge label="Marketing" used={40000} total={50000} notified />,
    );
    expect(screen.getByText('Stakeholders notified')).toBeInTheDocument();

    // On-track budgets never show the notified line, even if the flag is set.
    rerender(<BudgetGauge label="Engineering" used={23000} total={50000} notified />);
    expect(screen.queryByText('Stakeholders notified')).not.toBeInTheDocument();
  });

  it('formats amounts in the given currency with no assumed decimal places (JPY)', () => {
    render(<BudgetGauge label="Tokyo Office" used={3_600_000} total={5_000_000} currency="JPY" />);
    // ¥ with zero decimals, not "¥3,600,000.00".
    expect(screen.getByText('¥3,600,000 / ¥5,000,000')).toBeInTheDocument();
  });
});

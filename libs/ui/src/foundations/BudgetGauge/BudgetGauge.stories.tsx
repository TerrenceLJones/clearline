import type { Meta, StoryObj } from '@storybook/react-vite';
import { BudgetGauge } from './BudgetGauge';

const meta: Meta<typeof BudgetGauge> = {
  title: 'Foundations/BudgetGauge',
  component: BudgetGauge,
};
export default meta;

type Story = StoryObj<typeof BudgetGauge>;

export const OnTrack: Story = { args: { label: 'Engineering', used: 23000, total: 50000 } };
export const Warning80Percent: Story = { args: { label: 'Marketing', used: 40000, total: 50000 } };
export const OverBudget: Story = { args: { label: 'Sales', used: 52000, total: 50000 } };

/** At/over the 80% threshold, `notified` surfaces that department stakeholders were alerted (US-CW-019 AC-02). */
export const WarningNotified: Story = {
  args: { label: 'Marketing', used: 40000, total: 50000, notified: true },
};

/** A department budgeted in a 0-decimal currency (JPY) — amounts render with no assumed decimal places. */
export const NonUsdCurrency: Story = {
  args: { label: 'Tokyo Office', used: 3_600_000, total: 5_000_000, currency: 'JPY' },
};

import { Icon } from '../Icon';
import type { IconName } from '@clearline/icons';
import { formatMoney } from '../../utils/formatMoney';
import { Text } from '../../atoms/Text';

export interface BudgetGaugeProps {
  label: string;
  /** Spend so far, in major units of `currency` (e.g. dollars, not cents). */
  used: number;
  /** The budget, in major units of `currency`. */
  total: number;
  /** ISO 4217 currency for the amounts — drives the money formatting (JPY 0-decimal, BHD 3-decimal). @default 'USD' */
  currency?: string;
  /**
   * When true and the gauge is at or over the 80% warning threshold, shows a "Stakeholders notified"
   * line — the visible record that department stakeholders were alerted on the crossing (US-CW-019 AC-02).
   */
  notified?: boolean;
}

interface Band {
  icon: IconName;
  textClass: string;
  fillClass: string;
  status: string;
}

function bandFor(pct: number): Band {
  if (pct >= 100) {
    return {
      icon: 'octagon-alert',
      textClass: 'text-cl-crit',
      fillClass: 'bg-cl-crit',
      status: 'Over',
    };
  }
  if (pct >= 80) {
    return {
      icon: 'triangle-alert',
      textClass: 'text-cl-warn',
      fillClass: 'bg-cl-warn',
      status: `${Math.round(pct)}% used`,
    };
  }
  return { icon: 'check', textClass: 'text-cl-pos', fillClass: 'bg-cl-pos', status: 'On track' };
}

/**
 * Threshold bands at normal / 80% / over — percentage and overage are always spelled out in text, color
 * reinforces rather than carries the message (US-CW-019 AC-03 / US-CW-023 AC-04). Amounts render through
 * the currency-aware formatter, so a department budgeted in a 0-decimal (JPY) or 3-decimal (BHD)
 * currency reads correctly rather than assuming two decimal places.
 */
export function BudgetGauge({ label, used, total, currency = 'USD', notified }: BudgetGaugeProps) {
  const safeTotal = total || 1;
  const pctRaw = (used / safeTotal) * 100;
  const pct = Math.round(pctRaw);
  const band = bandFor(pctRaw);

  const footText =
    pctRaw >= 100
      ? `${pct}% of budget used — ${formatMoney(used - total, currency)} over`
      : pctRaw >= 80
        ? `${pct}% of budget used`
        : `${pct}% used`;

  return (
    <div className="bg-cl-surface border-cl-border rounded-xl border p-5">
      <div className="mb-2.5 flex items-center justify-between">
        <Text as="span" size="label" weight="semibold" tone="default">
          {label}
        </Text>
        <span className={`inline-flex items-center gap-1 ${band.textClass}`}>
          <Icon name={band.icon} size={11} />
          <Text as="span" size="label" weight="semibold">
            {band.status}
          </Text>
        </span>
      </div>
      <div className="bg-cl-surface-2 mb-2.5 h-[9px] overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full ${band.fillClass}`}
          style={{ width: `${Math.min(100, pctRaw)}%` }}
        />
      </div>
      <div className="flex justify-between">
        <Text
          as="span"
          size="mono"
          weight={pctRaw >= 80 ? 'semibold' : undefined}
          tone={pctRaw >= 80 ? undefined : 'muted'}
          className={pctRaw >= 80 ? band.textClass : undefined}
        >
          {footText}
        </Text>
        <Text as="span" size="mono" tone="faint">
          {formatMoney(used, currency)} / {formatMoney(total, currency)}
        </Text>
      </div>
      {notified && pctRaw >= 80 ? (
        <span className={`mt-2 inline-flex items-center gap-1 ${band.textClass}`}>
          <Icon name="bell" size={10} />
          <Text as="span" size="label" weight="medium">
            Stakeholders notified
          </Text>
        </span>
      ) : null}
    </div>
  );
}

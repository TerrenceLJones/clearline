import { formatMoneyValue, type SelectOption } from '@clearline/ui';

const FREE = 'Free';

/**
 * The Method listbox options for the New Payment form (US-CW-007), shaped for the reusable `Select`.
 *
 * Only ACH and Wire are backed by the payments service today, so they are the sole selectable rails,
 * shown at the platform's actual $0 fee (the Review "Total debit" charges the amount only). Same-day
 * ACH and Check appear per the design but are disabled — kept visible so the option set reads
 * complete rather than hiding capability, matching the design's disabled treatment.
 *
 * Fees are currency-aware: formatted in the source account's own currency via `formatMoneyValue`, so
 * a non-USD source account renders the fee correctly rather than assuming dollars.
 */
export function paymentMethodOptions(sourceCurrency: string): SelectOption[] {
  const fee = (minorUnits: number): string =>
    minorUnits === 0
      ? FREE
      : formatMoneyValue({ amountMinorUnits: minorUnits, currency: sourceCurrency });

  return [
    {
      value: 'ach',
      label: 'ACH',
      description: 'Standard rail · arrives in 1–2 business days',
      meta: fee(0),
    },
    {
      value: 'same_day_ach',
      label: 'Same-day ACH',
      description: 'Not enabled for this account',
      meta: fee(1000),
      disabled: true,
    },
    {
      value: 'wire',
      label: 'Wire',
      description: 'Irreversible · arrives same day',
      meta: fee(0),
    },
    {
      value: 'check',
      label: 'Check',
      description: 'Not enabled for this vendor',
      disabled: true,
      disabledMeta: 'OFF',
      separatorBefore: true,
    },
  ];
}

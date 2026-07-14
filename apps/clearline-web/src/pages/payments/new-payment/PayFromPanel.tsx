import { Icon, Text, formatMoneyValue } from '@clearline/ui';
import type { NewPaymentForm } from './use-new-payment-form';

/** The read-only "Pay from" row — a derived ledger projection with no input affordance (US-CW-008). */
export function PayFromPanel({ source }: { source: NewPaymentForm['source'] }) {
  return (
    <div className="mb-4">
      <Text as="div" size="label" tone="muted" className="mb-1.5">
        Pay from
      </Text>
      <div className="border-cl-border-2 bg-cl-surface flex items-center justify-between rounded-lg border px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="bg-cl-accent-weak text-cl-accent-text flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-md">
            <Icon name="building" size={15} />
          </span>
          <div className="min-w-0">
            <Text as="div" size="body" weight="semibold" className="truncate">
              {source ? `${source.name} · ${source.maskedAccount}` : 'Loading account…'}
            </Text>
            <Text as="div" size="label" tone="faint">
              {source ? `${source.currency} checking` : ' '}
            </Text>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="text-cl-text-3 border-cl-border-2 mb-0.5 inline-flex items-center gap-1 rounded border px-1.5 py-0.5">
            <Icon name="lock" size={9} />
            <Text as="span" size="mono" tone="faint">
              DERIVED
            </Text>
          </span>
          {source ? (
            <Text as="div" size="mono" weight="semibold" className="tabular-nums">
              {formatMoneyValue(source.availableBalance)}
            </Text>
          ) : (
            <div className="cl-skeleton ml-auto h-[16px] w-[70px] rounded" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}

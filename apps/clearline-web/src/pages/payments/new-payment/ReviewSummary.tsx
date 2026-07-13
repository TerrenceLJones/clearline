import { Button, Text } from '@clearline/ui';
import { arrivalEstimate, formatUsd } from './format';
import type { NewPaymentForm } from './use-new-payment-form';

interface ReviewSummaryProps {
  method: NewPaymentForm['method'];
  amountMinor: NewPaymentForm['amountMinor'];
  projectedBalanceMinor: NewPaymentForm['projectedBalanceMinor'];
  isPending: NewPaymentForm['isPending'];
  isTimeout: NewPaymentForm['isTimeout'];
  idempotencyKey: NewPaymentForm['idempotencyKey'];
  onReview: NewPaymentForm['onReview'];
}

/** The derived Review summary — fees, arrival, total debit and the projected post-payment balance. */
export function ReviewSummary({
  method,
  amountMinor,
  projectedBalanceMinor,
  isPending,
  isTimeout,
  idempotencyKey,
  onReview,
}: ReviewSummaryProps) {
  return (
    <div className="border-cl-border bg-cl-surface flex flex-[0.9] flex-col border-t p-6 md:border-t-0 md:border-l">
      <Text as="div" size="label" weight="semibold" tone="muted" className="mb-4">
        Review
      </Text>

      <div className="flex justify-between py-1.5">
        <Text as="span" size="label" tone="muted">
          Amount
        </Text>
        <Text as="span" size="body" weight="medium" className="font-mono tabular-nums">
          {amountMinor !== null ? formatUsd(amountMinor) : '—'}
        </Text>
      </div>
      <div className="flex justify-between py-1.5">
        <Text as="span" size="label" tone="muted">
          {method === 'ach' ? 'ACH' : 'Wire'} fee
        </Text>
        <Text as="span" size="body" weight="medium" className="font-mono tabular-nums">
          {formatUsd(0)}
        </Text>
      </div>
      <div className="flex justify-between py-1.5">
        <Text as="span" size="label" tone="muted">
          Arrives
        </Text>
        <Text as="span" size="body" weight="medium">
          {arrivalEstimate(method)}
        </Text>
      </div>

      <div className="bg-cl-border my-2.5 h-px" />

      <div className="flex justify-between pb-3">
        <Text as="span" size="body" weight="semibold">
          Total debit
        </Text>
        <Text as="span" size="body" weight="semibold" className="font-mono tabular-nums">
          {amountMinor !== null ? formatUsd(amountMinor) : '—'}
        </Text>
      </div>
      <Text as="div" size="label" tone="faint" className="mb-5 leading-relaxed">
        Balance after this payment:{' '}
        <span className="font-mono">
          {projectedBalanceMinor !== null ? formatUsd(projectedBalanceMinor) : '—'}
        </span>{' '}
        (derived).
      </Text>

      <div className="mt-auto">
        <Button type="button" fullWidth onClick={onReview} loading={isPending} disabled={isTimeout}>
          Review &amp; send
        </Button>
        {isPending ? (
          <Text as="p" size="label" tone="muted" className="mt-2 text-center">
            Processing…
          </Text>
        ) : null}
        <Text as="p" size="mono" tone="faint" className="mt-3 text-center">
          idempotency-key {idempotencyKey.slice(0, 8)}…
        </Text>
      </div>
    </div>
  );
}

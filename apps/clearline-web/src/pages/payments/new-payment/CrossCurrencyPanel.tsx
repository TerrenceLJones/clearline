import { Alert, Checkbox, Text, formatMoneyValue } from '@clearline/ui';
import type { NewPaymentForm } from './use-new-payment-form';

interface CrossCurrencyPanelProps {
  selectedRecipient: NewPaymentForm['selectedRecipient'];
  /** Source account currency for the "You send" figure. */
  sourceCurrency: NewPaymentForm['sourceCurrency'];
  amountMinor: NewPaymentForm['amountMinor'];
  fx: NewPaymentForm['fx'];
  fxAcknowledged: NewPaymentForm['fxAcknowledged'];
  onFxAcknowledgedChange: NewPaymentForm['setFxAcknowledged'];
}

/** Non-blocking cross-currency banner + converted amount, confirmed before send (US-CW-008 AC-06). */
export function CrossCurrencyPanel({
  selectedRecipient,
  sourceCurrency,
  amountMinor,
  fx,
  fxAcknowledged,
  onFxAcknowledgedChange,
}: CrossCurrencyPanelProps) {
  return (
    <div className="mt-5">
      <Alert
        tone="info"
        title={`This recipient uses ${selectedRecipient?.currency}. Review the converted amount before sending.`}
      />
      {fx.data ? (
        <div className="border-cl-border bg-cl-surface mt-3 rounded-lg border p-3">
          <div className="flex justify-between py-1">
            <Text as="span" size="label" tone="muted">
              You send
            </Text>
            <Text as="span" size="mono">
              {amountMinor !== null
                ? formatMoneyValue({ amountMinorUnits: amountMinor, currency: sourceCurrency })
                : '—'}{' '}
              {sourceCurrency}
            </Text>
          </div>
          <div className="flex justify-between py-1">
            <Text as="span" size="label" tone="muted">
              Exchange rate
            </Text>
            <Text as="span" size="mono">
              1 {sourceCurrency} = {fx.data.rate.rate} {fx.data.rate.toCurrency}
            </Text>
          </div>
          <div className="flex justify-between py-1">
            <Text as="span" size="label" tone="muted">
              Recipient gets
            </Text>
            <Text as="span" size="mono" weight="semibold">
              {formatMoneyValue(fx.data.convertedAmount)} {fx.data.convertedAmount.currency}
            </Text>
          </div>
          <label className="mt-2 flex items-center gap-2">
            <Checkbox
              aria-label="Confirm converted amount"
              checked={fxAcknowledged}
              onCheckedChange={onFxAcknowledgedChange}
            />
            <Text as="span" size="label">
              Confirm converted amount
            </Text>
          </label>
        </div>
      ) : null}
    </div>
  );
}

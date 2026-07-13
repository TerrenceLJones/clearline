import { Icon, Text, TextField } from '@clearline/ui';
import type { NewPaymentForm } from './use-new-payment-form';

interface AmountMethodFieldsProps {
  amountInput: NewPaymentForm['amountInput'];
  method: NewPaymentForm['method'];
  activeError: NewPaymentForm['activeError'];
  onAmountChange: NewPaymentForm['changeAmount'];
  onMethodChange: NewPaymentForm['setMethod'];
}

/** Amount + method row. Amount is the prominent, tabular figure per the design. */
export function AmountMethodFields({
  amountInput,
  method,
  activeError,
  onAmountChange,
  onMethodChange,
}: AmountMethodFieldsProps) {
  return (
    <div className="mb-4 flex items-end gap-3.5">
      <div className="flex-[1.2]">
        <TextField
          label="Amount"
          inputMode="decimal"
          prefix="$"
          value={amountInput}
          onChange={(e) => onAmountChange(e.target.value)}
          state={activeError?.field === 'amount' ? 'error' : undefined}
          className="font-mono text-[18px] font-semibold tabular-nums"
        />
      </div>
      <div className="flex-1">
        <Text as="div" size="label" tone="muted" className="mb-1.5">
          Method
        </Text>
        <div className="relative">
          <select
            aria-label="Method"
            value={method}
            onChange={(e) => onMethodChange(e.target.value as 'ach' | 'wire')}
            className="border-cl-border-2 bg-cl-surface text-cl-text focus:border-cl-accent focus:ring-cl-accent-weak w-full cursor-pointer appearance-none rounded-lg border py-[11px] pr-9 pl-3.5 text-[13px] outline-none focus:ring-3"
          >
            <option value="ach">ACH</option>
            <option value="wire">Wire</option>
          </select>
          <span className="text-cl-text-3 pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <Icon name="chevron-down" size={12} />
          </span>
        </div>
      </div>
    </div>
  );
}

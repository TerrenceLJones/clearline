import { TextField } from '@clearline/ui';
import type { NewPaymentForm } from './use-new-payment-form';

interface MemoFieldProps {
  memo: NewPaymentForm['memo'];
  onMemoChange: NewPaymentForm['setMemo'];
}

export function MemoField({ memo, onMemoChange }: MemoFieldProps) {
  return (
    <div>
      <TextField
        label="Memo"
        value={memo}
        onChange={(e) => onMemoChange(e.target.value)}
        placeholder="e.g. Q2 platform license — INV-20418"
      />
    </div>
  );
}

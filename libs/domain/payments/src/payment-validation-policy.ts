import type { PaymentErrorCode, RecipientAccountStatus } from '@clearline/contracts';

/**
 * True when the amount is a well-formed transfer figure: a positive integer number of minor units.
 * Rejects zero, negatives, fractional minor units, `NaN`, and `Infinity` — a malformed amount the
 * client's `parseAmountToMinorUnits` already blocks, re-checked here so the server boundary can't be
 * bypassed into a $0/negative transfer.
 */
export function isValidAmount(amountMinorUnits: number): boolean {
  return Number.isInteger(amountMinorUnits) && amountMinorUnits > 0;
}

/** True when the amount (minor units) is at or below the available balance. */
export function hasSufficientBalance(
  availableBalanceMinorUnits: number,
  amountMinorUnits: number,
): boolean {
  return amountMinorUnits <= availableBalanceMinorUnits;
}

/** True when today's cumulative spend plus this amount would exceed the daily transfer limit. */
export function exceedsDailyLimit(
  dailyLimitMinorUnits: number,
  dailySpentMinorUnits: number,
  amountMinorUnits: number,
): boolean {
  return dailySpentMinorUnits + amountMinorUnits > dailyLimitMinorUnits;
}

export interface PaymentValidationInput {
  amountMinorUnits: number;
  availableBalanceMinorUnits: number;
  dailyLimitMinorUnits: number;
  dailySpentMinorUnits: number;
  /** The recipient account resolves to the payer's own source account (US-CW-008 AC-05). */
  isSelfTransfer: boolean;
  /**
   * Status of the resolved recipient, when known (a verified recipient picked from the context).
   * Undefined for hand-entered details the server must resolve — a `recipient_not_found` there is
   * decided upstream of this gate, since an unresolvable recipient has no status to check.
   */
  recipientStatus?: RecipientAccountStatus;
}

export type PaymentValidationResult =
  | { ok: true }
  | {
      ok: false;
      reason: Extract<
        PaymentErrorCode,
        | 'invalid_amount'
        | 'insufficient_balance'
        | 'daily_limit_exceeded'
        | 'recipient_closed'
        | 'self_transfer'
      >;
    };

/**
 * The single gate every payment passes through, run client-side to pre-block and server-side to
 * independently reject — the same canApprove pattern (US-CW-006). Checks run in priority order so the
 * caller surfaces the most fundamental reason first: a malformed amount (not a payment at all) outranks
 * paying the wrong account (self-transfer, closed recipient), which outranks whether the payer can
 * afford it (balance, then daily limit). The client is never the security boundary — the server re-runs
 * this on submit regardless of what the UI showed.
 */
export function validatePayment(input: PaymentValidationInput): PaymentValidationResult {
  // A malformed amount isn't a payment at all — checked before who's being paid or affordability.
  if (!isValidAmount(input.amountMinorUnits)) {
    return { ok: false, reason: 'invalid_amount' };
  }
  if (input.isSelfTransfer) {
    return { ok: false, reason: 'self_transfer' };
  }
  if (input.recipientStatus === 'closed') {
    return { ok: false, reason: 'recipient_closed' };
  }
  if (!hasSufficientBalance(input.availableBalanceMinorUnits, input.amountMinorUnits)) {
    return { ok: false, reason: 'insufficient_balance' };
  }
  if (
    exceedsDailyLimit(
      input.dailyLimitMinorUnits,
      input.dailySpentMinorUnits,
      input.amountMinorUnits,
    )
  ) {
    return { ok: false, reason: 'daily_limit_exceeded' };
  }
  return { ok: true };
}

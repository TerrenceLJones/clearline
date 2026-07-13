import type { Money } from '@clearline/contracts';
import { toMajorUnits } from '@clearline/money';

/**
 * Formats an already-major-units amount (e.g. dollars, not cents) as a localized currency
 * string — sign is dropped; callers indicate credit/debit separately. `Intl.NumberFormat`
 * picks the correct symbol and decimal places per `currency` (e.g. 0 for JPY, 2 for USD, 3
 * for BHD) rather than assuming 2 everywhere. Converting raw minor units (cents) into this
 * major-units amount is a domain concern — see `toMajorUnits` in `@clearline/money`, or use
 * {@link formatMoneyValue} to format a `Money` (minor units + currency) in one step.
 */
export function formatMoney(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Math.abs(amount));
}

/**
 * Formats a `Money` value (raw minor units + its currency) as a localized currency string —
 * the one-step, currency-aware form of `formatMoney(toMajorUnits(money), money.currency)`.
 * Prefer this over hand-composing the two so every call site stays currency-aware rather than
 * assuming USD/2-decimals.
 */
export function formatMoneyValue(money: Money): string {
  return formatMoney(toMajorUnits(money), money.currency);
}

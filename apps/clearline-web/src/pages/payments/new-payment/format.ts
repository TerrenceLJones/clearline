import { toMajorUnits } from '@clearline/money';
import { formatMoney } from '@clearline/ui';

export function formatUsd(amountMinorUnits: number): string {
  return formatMoney(toMajorUnits({ amountMinorUnits, currency: 'USD' }), 'USD');
}

/** A read-only settlement estimate for the Review summary — ACH clears in a couple of business days, a wire the same day. */
export function arrivalEstimate(method: 'ach' | 'wire'): string {
  return method === 'ach' ? '1–2 business days' : 'Same day';
}

/** First-letters initials for the recipient avatar (Avatar itself trims to two glyphs). */
export function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

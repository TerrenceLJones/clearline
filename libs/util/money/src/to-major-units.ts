import type { Money } from '@clearline/contracts';
import { minorUnitExponent } from './minor-unit-exponent';

/**
 * Converts an integer minor-units amount to a major-unit float (e.g. cents -> dollars),
 * using each currency's own minor-unit exponent rather than assuming 2 decimal places —
 * JPY has 0, BHD has 3, USD/EUR have 2. Callers (e.g. @clearline/ui's formatMoney)
 * only ever receive the resulting major-unit float, never raw minor units.
 */
export function toMajorUnits({ amountMinorUnits, currency }: Money): number {
  return amountMinorUnits / 10 ** minorUnitExponent(currency);
}

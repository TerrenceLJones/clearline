import { minorUnitExponent } from './minor-unit-exponent';

/**
 * Converts a major-unit amount (e.g. dollars) into integer minor units (e.g. cents) for the
 * given currency — the inverse of {@link toMajorUnits}. Uses the currency's own minor-unit
 * exponent (JPY 0, USD/EUR 2, BHD 3) rather than a hardcoded ×100, and rounds to shed
 * floating-point drift (e.g. 19.99 × 100). Defined here, alongside its inverse, so the two
 * directions can never disagree about a currency's decimal places.
 */
export function toMinorUnits(amountMajorUnits: number, currency: string): number {
  return Math.round(amountMajorUnits * 10 ** minorUnitExponent(currency));
}

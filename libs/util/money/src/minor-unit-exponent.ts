/**
 * The number of decimal places a currency's minor unit uses (its ISO 4217 exponent),
 * resolved from the platform's own currency data rather than hardcoded — USD/EUR have 2,
 * JPY has 0, BHD has 3. Falls back to 2 for the rare currency `Intl` can't resolve.
 * Shared by `toMajorUnits` and `toMinorUnits` so both directions agree on the exponent.
 */
export function minorUnitExponent(currency: string): number {
  return (
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

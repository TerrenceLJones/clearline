/** Memoized per currency — the `Intl.NumberFormat` constructor is comparatively expensive and the
 * exponent for a given code never changes within a session. */
const exponentCache = new Map<string, number>();

/**
 * The number of decimal places a currency's minor unit uses (its ISO 4217 exponent),
 * resolved from the platform's own currency data rather than hardcoded — USD/EUR have 2,
 * JPY has 0, BHD has 3. Falls back to 2 for a currency `Intl` can't resolve: an unknown code
 * makes the `Intl.NumberFormat` constructor throw `RangeError`, which we swallow rather than
 * letting it surface through `toMinorUnits`/`toMajorUnits`.
 * Shared by `toMajorUnits` and `toMinorUnits` so both directions agree on the exponent.
 */
export function minorUnitExponent(currency: string): number {
  const cached = exponentCache.get(currency);
  if (cached !== undefined) return cached;

  let exponent: number;
  try {
    exponent =
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
  } catch {
    // Unknown/invalid ISO 4217 code — the constructor throws RangeError. Default to 2 decimals.
    exponent = 2;
  }

  exponentCache.set(currency, exponent);
  return exponent;
}

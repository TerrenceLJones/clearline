/** Memoized per currency — deriving the symbol constructs an `Intl.NumberFormat`, which isn't free. */
const symbolCache = new Map<string, string>();

/**
 * The narrow currency symbol for an ISO 4217 code — `$` for USD, `€` for EUR, `¥` for JPY — resolved
 * from the platform's own currency data rather than hardcoded, so a non-USD source account labels its
 * amount field correctly. Falls back to the raw code for a currency `Intl` can't resolve (the
 * constructor throws `RangeError` on an unknown code, which we swallow).
 */
export function currencySymbol(currency: string): string {
  const cached = symbolCache.get(currency);
  if (cached !== undefined) return cached;

  let symbol: string;
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    symbol = parts.find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    symbol = currency;
  }

  symbolCache.set(currency, symbol);
  return symbol;
}

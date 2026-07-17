import { Button, Icon, Text } from '@clearline/ui';

/**
 * Shimmer placeholder gauges for the overview while it loads — sized cards, never a flash of "$0.00"
 * spend, so a slow page reads as loading rather than as every department un-budgeted.
 */
export function GaugeGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="border-cl-border bg-cl-surface rounded-xl border p-5">
          <div className="cl-skeleton mb-3 h-2.5 w-1/3 rounded" />
          <div className="cl-skeleton mb-2.5 h-[9px] w-full rounded-full" />
          <div className="cl-skeleton h-2.5 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}

/** The page-level failure state: a warning glyph, the message, and a Retry that re-fetches the page. */
export function BudgetError({
  message = "This page couldn't load.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="border-cl-border bg-cl-surface flex min-h-[160px] flex-col items-center justify-center rounded-xl border p-[18px] text-center"
      role="alert"
    >
      <div className="bg-cl-neg-weak mb-3 flex h-9 w-9 items-center justify-center rounded-[10px]">
        <Icon name="triangle-alert" size={18} className="text-cl-neg" />
      </div>
      <Text as="p" size="label" tone="muted" className="mb-3">
        {message}
      </Text>
      <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

import { Icon } from '@clearline/icons';
import { Button } from '../../atoms/Button';
import { Text } from '../../atoms/Text';

export interface AccessDeniedProps {
  /** Defaults to US-CW-006 AC-04's exact copy. */
  title?: string;
  /** Defaults to US-CW-006 AC-04's exact copy. */
  message?: string;
  /**
   * The independent server rejection restated as a mono line, e.g. "403 Forbidden · GET /api/approvals".
   * Reinforces that the client never was the boundary (design's "client hides, server decides").
   */
  requestLine?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * The access-denied surface shown when a user reaches a route their role doesn't authorize
 * (US-CW-006 AC-04). Presentational only — the routing/authorization decision lives at the app layer
 * (RequirePermission), and the underlying API is independently rejected with a 403 regardless of
 * whether this ever renders. Designed to sit inside the app shell, so the nav stays visible.
 */
export function AccessDenied({
  title = "You don't have access to this",
  message = 'Ask an admin if you need it.',
  requestLine,
  actionLabel,
  onAction,
}: AccessDeniedProps) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-14 text-center font-sans">
      <div className="bg-cl-surface-2 mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
        <Icon name="lock" size={24} className="text-cl-text-2" />
      </div>
      <Text as="h3" size="heading" className="mb-2">
        {title}
      </Text>
      <Text as="p" size="label" weight="regular" tone="muted" className="mb-0 max-w-85">
        {message}
      </Text>
      {requestLine ? (
        <div className="border-cl-border bg-cl-inset mt-4 rounded-lg border px-2.75 py-1.5">
          <Text as="span" size="mono" tone="faint">
            {requestLine}
          </Text>
        </div>
      ) : null}
      {actionLabel ? (
        <Button variant="primary" onClick={onAction} className="mt-4.5">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

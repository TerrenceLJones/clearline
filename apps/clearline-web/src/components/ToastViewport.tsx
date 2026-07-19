import { Toast, type ToastTone } from '@clearline/ui';

export interface ToastViewportProps {
  /** The current message, or null when nothing is showing. */
  toast: string | null;
  /** Clears the toast — wired to the manual close (×) affordance. */
  onDismiss: () => void;
  tone?: ToastTone;
}

/**
 * Floats a {@link Toast} at the top-center of the viewport, above page content, so a confirmation is
 * visible regardless of scroll position. Pairs with {@link useToast}; renders nothing when idle.
 */
export function ToastViewport({ toast, onDismiss, tone }: ToastViewportProps) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto">
        <Toast message={toast} tone={tone} onDismiss={onDismiss} />
      </div>
    </div>
  );
}

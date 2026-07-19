import { useCallback, useEffect, useState } from 'react';

/**
 * A transient confirmation toast: `show(message)` displays it, it clears itself after `duration` ms,
 * and `dismiss()` clears it immediately (wired to the toast's manual close affordance). The
 * auto-dismiss lifecycle lives here rather than in the presentational `Toast` atom — the atom stays
 * pure (a sticky or externally-controlled toast is still possible), while form pages avoid
 * re-implementing the same setTimeout. Render with `<ToastViewport toast={toast} onDismiss={dismiss} />`.
 */
export function useToast(duration = 3000) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(timer);
  }, [toast, duration]);

  const dismiss = useCallback(() => setToast(null), []);

  return { toast, show: setToast, dismiss };
}

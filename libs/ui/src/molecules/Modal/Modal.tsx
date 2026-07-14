import type { ReactNode } from 'react';
import { Icon } from '../../foundations/Icon';
import type { IconName } from '@clearline/icons';
import { Text } from '../../atoms/Text';
import { ModalShell } from '../ModalShell';

export type ModalTone = 'accent' | 'negative' | 'warning';

const TONE_CLASSES: Record<ModalTone, { weakBg: string; fg: string; solidBg: string }> = {
  accent: { weakBg: 'bg-cl-accent-weak', fg: 'text-cl-accent-text', solidBg: 'bg-cl-accent' },
  negative: { weakBg: 'bg-cl-neg-weak', fg: 'text-cl-neg', solidBg: 'bg-cl-neg' },
  warning: { weakBg: 'bg-cl-warn-weak', fg: 'text-cl-warn', solidBg: 'bg-cl-accent' },
};

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: IconName;
  title: string;
  body?: ReactNode;
  tone?: ModalTone;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
}

/** A contained, focus-trapped overlay built on Radix `Dialog` (focus trap, Escape-to-close, and ARIA wiring come from the primitive rather than being hand-rolled). */
export function Modal({
  open,
  onOpenChange,
  icon = 'arrow-right',
  title,
  body,
  tone = 'accent',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
}: ModalProps) {
  const t = TONE_CLASSES[tone];

  return (
    <ModalShell open={open} onOpenChange={onOpenChange}>
      <div className="mb-3 flex items-center gap-2.75">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${t.weakBg}`}
        >
          <Icon name={icon} size={17} className={t.fg} />
        </div>
        <ModalShell.Title asChild>
          <Text as="h2" size="heading" tone="default">
            {title}
          </Text>
        </ModalShell.Title>
      </div>
      {body ? (
        <ModalShell.Description asChild>
          <Text as="p" size="label" weight="regular" tone="muted" className="mb-4">
            {body}
          </Text>
        </ModalShell.Description>
      ) : null}
      <div className="flex gap-2.5">
        <ModalShell.Close asChild>
          <button
            type="button"
            className="border-cl-border-2 bg-cl-surface text-cl-text-2 flex-1 rounded-lg border px-4 py-2.5 text-[13px] font-medium"
          >
            {cancelLabel}
          </button>
        </ModalShell.Close>
        <button
          type="button"
          onClick={onConfirm}
          className={`flex-[1.4] rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white ${t.solidBg}`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

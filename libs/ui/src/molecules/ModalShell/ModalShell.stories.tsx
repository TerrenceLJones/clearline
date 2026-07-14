import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ModalShell } from './ModalShell';
import { Button } from '../../atoms/Button';
import { Text } from '../../atoms/Text';

const meta: Meta<typeof ModalShell> = {
  title: 'Molecules/ModalShell',
  component: ModalShell,
};
export default meta;

type Story = StoryObj<typeof ModalShell>;

export const Default: Story = {
  args: { open: true, maxWidth: 340 },
  render: (args) => (
    <ModalShell {...args}>
      <ModalShell.Title asChild>
        <Text as="h2" size="heading" tone="default" className="mb-1">
          Confirm action
        </Text>
      </ModalShell.Title>
      <ModalShell.Description asChild>
        <Text as="p" size="label" tone="muted" className="mb-4">
          Bespoke content lives directly inside the shell — the design system owns the overlay,
          focus-trap, and ARIA.
        </Text>
      </ModalShell.Description>
      <div className="flex gap-2.5">
        <ModalShell.Close asChild>
          <button
            type="button"
            className="border-cl-border-2 bg-cl-surface text-cl-text-2 flex-1 rounded-lg border px-4 py-2.5 text-[13px] font-medium"
          >
            Cancel
          </button>
        </ModalShell.Close>
        <Button fullWidth className="flex-[1.4]">
          Confirm
        </Button>
      </div>
    </ModalShell>
  ),
  play: async ({ canvasElement }) => {
    // Radix renders the dialog in a portal at the document body, so query the whole document.
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog');
    await expect(dialog).toHaveAccessibleName('Confirm action');
  },
};

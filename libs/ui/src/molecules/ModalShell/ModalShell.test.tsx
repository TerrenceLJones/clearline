import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalShell } from './ModalShell';

function renderShell(onOpenChange = vi.fn(), open = true) {
  return render(
    <ModalShell open={open} onOpenChange={onOpenChange} maxWidth={340}>
      <ModalShell.Title>Verify it&apos;s you</ModalShell.Title>
      <ModalShell.Description>Enter your code.</ModalShell.Description>
      <ModalShell.Close asChild>
        <button type="button">Cancel</button>
      </ModalShell.Close>
    </ModalShell>,
  );
}

describe('ModalShell', () => {
  it('renders its children in an accessible dialog when open', () => {
    renderShell();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // The title/description are wired to the dialog for a11y.
    expect(dialog).toHaveAccessibleName("Verify it's you");
    expect(screen.getByText('Enter your code.')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    renderShell(vi.fn(), false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('requests close on Escape and via a ModalShell.Close trigger', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderShell(onOpenChange);

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

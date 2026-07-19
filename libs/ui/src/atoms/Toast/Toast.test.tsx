import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders the message inside a polite status region by default (AC-01)', () => {
    render(<Toast message="10 approved" />);
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('10 approved');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('announces assertively when the role is alert', () => {
    render(<Toast message="Something failed" tone="negative" role="alert" />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('shows a manual dismiss control only when onDismiss is provided, and fires it (US-CW-034)', async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Toast message="Saved" />);
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();

    rerender(<Toast message="Saved" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

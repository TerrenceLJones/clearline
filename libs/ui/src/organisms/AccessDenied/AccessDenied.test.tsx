import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessDenied } from './AccessDenied';

describe('AccessDenied', () => {
  it('renders the AC-04 copy by default', () => {
    render(<AccessDenied />);
    expect(screen.getByText("You don't have access to this")).toBeInTheDocument();
    expect(screen.getByText('Ask an admin if you need it.')).toBeInTheDocument();
  });

  it('exposes the denial as an alert to assistive tech', () => {
    render(<AccessDenied />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows the server request line when provided', () => {
    render(<AccessDenied requestLine="403 Forbidden · GET /api/approvals" />);
    expect(screen.getByText('403 Forbidden · GET /api/approvals')).toBeInTheDocument();
  });

  it('renders the action and wires onAction', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<AccessDenied actionLabel="Back to My Expenses" onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: 'Back to My Expenses' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders no action button when no label is given', () => {
    render(<AccessDenied />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

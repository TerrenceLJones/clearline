import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentFormAlerts } from './PaymentFormAlerts';
import type { ActiveError } from './use-new-payment-form';

const limitError: ActiveError = {
  field: 'amount',
  message: 'This exceeds your daily transfer limit of $20,000.00.',
  limitCta: true,
};

const plainError: ActiveError = {
  field: 'recipient',
  message: "You can't transfer to the same account.",
};

function renderAlerts(props: Partial<ComponentProps<typeof PaymentFormAlerts>> = {}) {
  return render(
    <PaymentFormAlerts
      isTimeout={false}
      isExhausted={false}
      activeError={null}
      onRetry={vi.fn()}
      {...props}
    />,
  );
}

describe('PaymentFormAlerts', () => {
  it('renders nothing when there is no timeout, exhaustion or error', () => {
    const { container } = renderAlerts();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the "still confirming" notice on timeout', () => {
    renderAlerts({ isTimeout: true });
    expect(
      screen.getByText(
        "We're still confirming your payment. We'll update this in a moment — don't resubmit.",
      ),
    ).toBeInTheDocument();
  });

  it('shows a Retry banner on exhaustion that calls onRetry when clicked', async () => {
    const onRetry = vi.fn();
    renderAlerts({ isExhausted: true, onRetry });
    expect(screen.getByText("Couldn't process this payment. Try again.")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error with a limit-increase CTA when limitCta is set', () => {
    renderAlerts({ activeError: limitError });
    expect(screen.getByRole('alert')).toHaveTextContent(limitError.message);
    expect(screen.getByRole('button', { name: /request limit increase/i })).toBeInTheDocument();
  });

  it('shows an inline error without a CTA when limitCta is not set', () => {
    renderAlerts({ activeError: plainError });
    expect(screen.getByRole('alert')).toHaveTextContent(plainError.message);
    expect(
      screen.queryByRole('button', { name: /request limit increase/i }),
    ).not.toBeInTheDocument();
  });

  it('prioritises the timeout notice over a concurrent exhaustion and error', () => {
    renderAlerts({ isTimeout: true, isExhausted: true, activeError: limitError });
    expect(
      screen.getByText(
        "We're still confirming your payment. We'll update this in a moment — don't resubmit.",
      ),
    ).toBeInTheDocument();
    // Exhaustion and inline-error content stay suppressed while the timeout notice is up.
    expect(screen.queryByText("Couldn't process this payment. Try again.")).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('prioritises the exhaustion banner over an inline error', () => {
    renderAlerts({ isExhausted: true, activeError: limitError });
    expect(screen.getByText("Couldn't process this payment. Try again.")).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /request limit increase/i }),
    ).not.toBeInTheDocument();
  });
});

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { AccessDenied } from './AccessDenied';
import { alertingAction } from '../../storybook-actions';

const meta: Meta<typeof AccessDenied> = {
  title: 'Organisms/AccessDenied',
  component: AccessDenied,
};
export default meta;

type Story = StoryObj<typeof AccessDenied>;

export const Default: Story = {
  args: {
    message:
      'Ask an admin if you need it. This page is available to Finance Managers and Controllers.',
    requestLine: '403 Forbidden · GET /api/approvals',
    actionLabel: 'Back to My Expenses',
    onAction: alertingAction('Navigating to My Expenses'),
  },
};

export const WithoutRequestLine: Story = {
  args: {
    actionLabel: 'Back to My Expenses',
    onAction: alertingAction('Navigating to My Expenses'),
  },
};

export const ActionWired: Story = {
  args: {
    requestLine: '403 Forbidden · GET /api/approvals',
    actionLabel: 'Back to My Expenses',
    onAction: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Back to My Expenses' }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
};

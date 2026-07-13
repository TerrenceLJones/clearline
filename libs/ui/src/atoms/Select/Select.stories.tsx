import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Select, type SelectOption } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Atoms/Select',
  component: Select,
};
export default meta;

type Story = StoryObj<typeof Select>;

/** Mirrors the New Payment "Method" listbox: rich rows, a disabled option that stays visible, and a fee. */
const METHOD_OPTIONS: SelectOption[] = [
  {
    value: 'ach',
    label: 'ACH',
    description: 'Standard rail · arrives in 1–2 business days',
    meta: 'Free',
  },
  {
    value: 'same_day_ach',
    label: 'Same-day ACH',
    description: 'Not enabled for this account',
    meta: '$10.00',
    disabled: true,
    disabledMeta: 'OFF',
  },
  {
    value: 'wire',
    label: 'Wire',
    description: 'Arrives same day',
    meta: 'Free',
  },
  {
    value: 'check',
    label: 'Check',
    description: 'Not enabled for this vendor',
    disabled: true,
    disabledMeta: 'OFF',
    separatorBefore: true,
  },
];

function ControlledSelect(props: { options: SelectOption[]; initial: string }) {
  const [value, setValue] = useState(props.initial);
  return (
    <div style={{ width: 260 }}>
      <Select aria-label="Method" value={value} onValueChange={setValue} options={props.options} />
    </div>
  );
}

export const PaymentMethod: Story = {
  render: () => <ControlledSelect options={METHOD_OPTIONS} initial="ach" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox', { name: 'Method' });
    await expect(trigger).toHaveTextContent('ACH');

    await userEvent.click(trigger);

    // Options render in a portal (document.body), so query the whole screen.
    const wire = await screen.findByRole('option', { name: /Wire/ });
    const check = screen.getByRole('option', { name: /Check/ });
    await expect(check).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(wire);
    await expect(trigger).toHaveTextContent('Wire');
  },
};

export const DisabledControl: Story = {
  render: () => (
    <div style={{ width: 260 }}>
      <Select
        aria-label="Method"
        value="ach"
        onValueChange={() => {}}
        disabled
        options={METHOD_OPTIONS}
      />
    </div>
  ),
};

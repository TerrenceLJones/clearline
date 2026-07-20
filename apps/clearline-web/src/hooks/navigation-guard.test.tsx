import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { NavigationGuardProvider } from './navigation-guard';
import { useRegisterNavigationGuard } from './navigation-guard-context';

function DirtyForm({ active }: { active: boolean }) {
  useRegisterNavigationGuard(active);
  return <div>form body</div>;
}

function renderGuard(active: boolean) {
  return render(
    <BrowserRouter>
      <NavigationGuardProvider>
        <DirtyForm active={active} />
      </NavigationGuardProvider>
    </BrowserRouter>,
  );
}

function pressBrowserBack() {
  act(() => {
    window.dispatchEvent(new Event('popstate'));
  });
}

afterEach(() => {
  // Collapse any sentinel entries the guard pushed so tests don't bleed history state into each other.
  window.history.replaceState(null, '', '/');
});

describe('NavigationGuardProvider — browser Back/Forward guard', () => {
  it('prompts before a browser Back discards unsaved changes', async () => {
    renderGuard(true);
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();

    pressBrowserBack();

    expect(await screen.findByText('Discard unsaved changes?')).toBeInTheDocument();
  });

  it('does not prompt when there are no unsaved changes', () => {
    renderGuard(false);
    pressBrowserBack();
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
  });

  it('cancelling the prompt closes it and stays armed for the next Back', async () => {
    renderGuard(true);
    const user = userEvent.setup();

    pressBrowserBack();
    await user.click(await screen.findByRole('button', { name: /Cancel/ }));
    await waitForDialogGone();

    // A second Back re-prompts — the guard is still armed.
    pressBrowserBack();
    expect(await screen.findByText('Discard unsaved changes?')).toBeInTheDocument();
  });
});

async function waitForDialogGone() {
  await screen.findByText('form body');
  expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
}

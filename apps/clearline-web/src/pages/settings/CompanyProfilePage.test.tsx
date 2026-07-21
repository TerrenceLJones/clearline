import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { CompanyProfileResponse } from '@clearline/contracts';
import { ThemeProvider } from '@clearline/design-tokens';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { CompanyProfilePage } from './CompanyProfilePage';
import { withQueryClient } from '../../test/with-query-client';

const server = registerMswServer();
afterEach(() => clearAccessToken());

function seedCompany(overrides: Partial<CompanyProfileResponse> = {}): CompanyProfileResponse {
  return {
    legalName: 'Clearline Demo Co',
    ein: '11-2223334',
    structure: 'C-Corporation',
    verificationStatus: 'verified',
    primaryContactEmail: 'owner@clearline.dev',
    addressLine1: '1 Market St',
    addressLine2: '',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    fiscalYearStartMonth: 1,
    ...overrides,
  };
}

/** Backs the section-access probe (authorized) plus a mutable company record so fetch/mutate is real. */
function mockCompanyBackend(initial = seedCompany(), { authorized = true } = {}) {
  setAccessToken('access_valid');
  const state = { company: initial };
  server.use(
    http.get('*/api/settings/sections/:slug', ({ params }) =>
      authorized
        ? HttpResponse.json({ slug: params.slug, authorized: true })
        : HttpResponse.json({ error: 'forbidden_role' }, { status: 403 }),
    ),
    http.get('*/api/company', () => HttpResponse.json(state.company)),
    http.patch('*/api/company', async ({ request }) => {
      const patch = (await request.json()) as Partial<CompanyProfileResponse>;
      state.company = { ...state.company, ...patch };
      return HttpResponse.json(state.company);
    }),
  );
  return state;
}

function renderCompany() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    withQueryClient(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/settings/company']}>
          <CompanyProfilePage />
        </MemoryRouter>
      </ThemeProvider>,
      queryClient,
    ),
  );
}

const footer = () => screen.queryByRole('region', { name: 'Unsaved changes' });

describe('CompanyProfilePage — verified identity (AC-02)', () => {
  it('renders legal name + EIN as read-only text with a Verified badge and support note', async () => {
    mockCompanyBackend();
    renderCompany();

    expect(await screen.findByText('Clearline Demo Co')).toBeInTheDocument();
    expect(screen.getByText('11-2223334')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Verified details cannot be changed\. Contact support if there's an error\./i,
      ),
    ).toBeInTheDocument();

    // The EIN is text, not an editable input.
    expect(screen.queryByDisplayValue('11-2223334')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Clearline Demo Co')).not.toBeInTheDocument();
  });

  it('shows a pending state instead of the Verified badge when not KYB-verified (edge)', async () => {
    mockCompanyBackend(seedCompany({ verificationStatus: 'pending' }));
    renderCompany();

    await screen.findByText('Clearline Demo Co');
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });
});

describe('CompanyProfilePage — editable fields (AC-01)', () => {
  it('saves a primary-contact edit: footer appears, then a toast and the footer clears', async () => {
    mockCompanyBackend();
    renderCompany();

    const contact = await screen.findByLabelText('Primary contact email');
    expect(footer()).not.toBeInTheDocument();

    await userEvent.clear(contact);
    await userEvent.type(contact, 'finance@clearline.dev');
    expect(footer()).toBeInTheDocument();

    await userEvent.click(within(footer()!).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByText('Company profile updated')).toBeInTheDocument());
    await waitFor(() => expect(footer()).not.toBeInTheDocument());
  });

  it('discards edits back to the saved values and hides the footer', async () => {
    mockCompanyBackend();
    renderCompany();

    const address = await screen.findByLabelText('Address line 1');
    await userEvent.clear(address);
    await userEvent.type(address, 'Somewhere else');
    expect(footer()).toBeInTheDocument();

    await userEvent.click(within(footer()!).getByRole('button', { name: 'Discard' }));
    expect(footer()).not.toBeInTheDocument();
    expect(screen.getByLabelText('Address line 1')).toHaveValue('1 Market St');
  });

  it('notes that a fiscal-year change applies next budget period, not retroactively', async () => {
    mockCompanyBackend();
    renderCompany();
    await screen.findByLabelText('Primary contact email');
    expect(screen.getByText(/next budget period/i)).toBeInTheDocument();
  });
});

describe('CompanyProfilePage — server decides (AC-03)', () => {
  it('renders AccessDenied when the section probe returns 403, hiding the form', async () => {
    mockCompanyBackend(seedCompany(), { authorized: false });
    renderCompany();

    expect(await screen.findByText(/403 Forbidden/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Primary contact email')).not.toBeInTheDocument();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import type { CompanyProfileResponse } from '@clearline/contracts';
import { registerMswServer } from '@clearline/mock-backend/test-factories';
import { clearAccessToken, setAccessToken } from '@clearline/data-access-auth';
import { createQueryWrapper } from './test/create-query-wrapper';
import { useCompanyProfile, useUpdateCompanyProfile } from './use-company-profile';

const server = registerMswServer();
afterEach(() => clearAccessToken());

const COMPANY: CompanyProfileResponse = {
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
};

describe('useCompanyProfile / useUpdateCompanyProfile (AC-01/02)', () => {
  it('loads the company profile then persists an operational edit', async () => {
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/company', () => HttpResponse.json(COMPANY)),
      http.patch('*/api/company', async ({ request }) => {
        const patch = (await request.json()) as Partial<CompanyProfileResponse>;
        return HttpResponse.json({ ...COMPANY, ...patch });
      }),
    );
    const { wrapper } = createQueryWrapper({ queries: { retry: false } });
    const { result } = renderHook(
      () => ({ company: useCompanyProfile(), update: useUpdateCompanyProfile() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.company.isSuccess).toBe(true));
    expect(result.current.company.data?.legalName).toBe('Clearline Demo Co');
    expect(result.current.company.data?.verificationStatus).toBe('verified');

    result.current.update.mutate({
      primaryContactEmail: 'finance@clearline.dev',
      addressLine1: '500 Howard St',
      addressLine2: 'Suite 400',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      fiscalYearStartMonth: 7,
    });
    await waitFor(() => expect(result.current.update.isSuccess).toBe(true));
    // The mutation primes the query cache with the server's copy.
    expect(result.current.company.data?.addressLine1).toBe('500 Howard St');
    expect(result.current.company.data?.fiscalYearStartMonth).toBe(7);
  });

  it('surfaces a fetch error', async () => {
    setAccessToken('access_valid');
    server.use(
      http.get('*/api/company', () =>
        HttpResponse.json({ error: 'forbidden_role' }, { status: 403 }),
      ),
    );
    const { wrapper } = createQueryWrapper({ queries: { retry: false } });
    const { result } = renderHook(() => useCompanyProfile(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

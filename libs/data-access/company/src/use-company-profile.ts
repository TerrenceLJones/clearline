import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '@clearline/data-access-auth';
import type { CompanyProfileResponse, UpdateCompanyProfileRequest } from '@clearline/contracts';
import { companyKeys } from './company-query-keys';

async function getCompanyProfile(): Promise<CompanyProfileResponse> {
  const response = await authenticatedFetch('/api/company');
  if (!response.ok) throw new Error('company_profile_fetch_failed');
  return response.json();
}

/** The org's company profile: KYB-locked identity + editable operational fields (US-CW-036 AC-01/02). */
export function useCompanyProfile() {
  return useQuery({ queryKey: companyKeys.profile, queryFn: getCompanyProfile });
}

async function patchCompanyProfile(
  request: UpdateCompanyProfileRequest,
): Promise<CompanyProfileResponse> {
  const response = await authenticatedFetch('/api/company', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('company_profile_update_failed');
  return response.json();
}

/** Persist an edit to the editable operational fields (AC-01), priming the company cache with the server's copy. */
export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchCompanyProfile,
    onSuccess: (profile) => queryClient.setQueryData(companyKeys.profile, profile),
  });
}

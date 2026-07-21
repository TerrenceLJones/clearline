import { describe, expect, it } from 'vitest';
import type { UpdateCompanyProfileRequest } from '@clearline/contracts';
import { AuthService } from './auth.service';
import { buildSeedUser } from '../fixtures/test-factories';
import { SEED_ORGANIZATION } from '../fixtures/users.fixture';

const ORG_ID = SEED_ORGANIZATION.id;

/** A Controller/Owner in the seeded demo org — the persona Company Profile is gated to (AC-01). */
async function makeService() {
  const user = await buildSeedUser({
    id: 'user_owner',
    email: 'owner@clearline.dev',
    role: 'controller',
    isOwner: true,
    orgId: ORG_ID,
  });
  return new AuthService([user]);
}

const EDIT: UpdateCompanyProfileRequest = {
  primaryContactEmail: 'finance@clearline.dev',
  addressLine1: '500 Howard St',
  addressLine2: 'Suite 400',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94105',
  fiscalYearStartMonth: 7,
};

describe('getCompanyProfile (US-CW-036 AC-02)', () => {
  it('returns the KYB identity as verified alongside the seeded editable fields', async () => {
    const service = await makeService();
    const profile = service.getCompanyProfile(ORG_ID);

    expect(profile).not.toBeNull();
    expect(profile!.legalName).toBe(SEED_ORGANIZATION.legalName);
    expect(profile!.ein).toBe(SEED_ORGANIZATION.ein);
    expect(profile!.verificationStatus).toBe('verified');
    expect(profile!.structure).toBe('C-Corporation');
    expect(profile!.addressLine1).toBe('1 Market St');
    expect(profile!.fiscalYearStartMonth).toBeGreaterThanOrEqual(1);
    expect(profile!.fiscalYearStartMonth).toBeLessThanOrEqual(12);
  });

  it('is null for an unknown org', async () => {
    const service = await makeService();
    expect(service.getCompanyProfile('org_missing')).toBeNull();
  });

  it('reports pending when the org has not cleared KYB (inferred edge)', async () => {
    const user = await buildSeedUser({ id: 'u', email: 'p@x.dev', orgId: 'org_pending' });
    const service = new AuthService(
      [user],
      [
        {
          id: 'org_pending',
          legalName: 'Pending Co',
          ein: '00-0000000',
          createdAt: 0,
          verified: false,
        },
      ],
    );
    expect(service.getCompanyProfile('org_pending')!.verificationStatus).toBe('pending');
  });
});

describe('updateCompanyProfile (AC-01)', () => {
  it('updates only the editable operational fields, leaving the KYB identity untouched', async () => {
    const service = await makeService();
    const updated = service.updateCompanyProfile(ORG_ID, EDIT);

    expect(updated!.primaryContactEmail).toBe('finance@clearline.dev');
    expect(updated!.addressLine1).toBe('500 Howard St');
    expect(updated!.addressLine2).toBe('Suite 400');
    expect(updated!.fiscalYearStartMonth).toBe(7);
    // KYB identity is immutable — untouched by the edit (AC-02).
    expect(updated!.legalName).toBe(SEED_ORGANIZATION.legalName);
    expect(updated!.ein).toBe(SEED_ORGANIZATION.ein);
    expect(updated!.verificationStatus).toBe('verified');
  });

  it('persists the edit so the next read returns it', async () => {
    const service = await makeService();
    service.updateCompanyProfile(ORG_ID, EDIT);
    expect(service.getCompanyProfile(ORG_ID)!.addressLine1).toBe('500 Howard St');
  });

  it('is null for an unknown org', async () => {
    const service = await makeService();
    expect(service.updateCompanyProfile('org_missing', EDIT)).toBeNull();
  });
});

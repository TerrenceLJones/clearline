import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import type { CompanyProfileResponse, UpdateCompanyProfileRequest } from '@clearline/contracts';
import { AuditService } from '../services/audit.service';
import { AuthService } from '../services/auth.service';
import { buildSeedUser } from '../fixtures/test-factories';
import { SEED_ORGANIZATION } from '../fixtures/users.fixture';
import { createCompanyHandlers } from './company.handlers';

const BASE = 'http://localhost';
const PASSWORD = 'correct-password';
const ORG_ID = SEED_ORGANIZATION.id;

let server: ReturnType<typeof setupServer>;
let authService: AuthService;
let auditService: AuditService;

/** Sign in one of the seeded org members and return its access token. */
async function tokenFor(email: string): Promise<string> {
  const login = await authService.login(email, PASSWORD, '127.0.0.1');
  return login.accessToken!;
}

async function startWith() {
  const controller = await buildSeedUser({
    id: 'user_ctrl',
    email: 'controller@clearline.dev',
    password: PASSWORD,
    role: 'controller',
    orgId: ORG_ID,
  });
  const employee = await buildSeedUser({
    id: 'user_emp',
    email: 'employee@clearline.dev',
    password: PASSWORD,
    role: 'employee',
    orgId: ORG_ID,
  });
  authService = new AuthService([controller, employee]);
  auditService = new AuditService([]);
  server = setupServer(...createCompanyHandlers(authService, auditService));
  server.listen({ onUnhandledRequest: 'error' });
}

function auth(token: string, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  };
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

beforeEach(startWith);
afterEach(() => server?.close());

describe('GET /api/company', () => {
  it('401s when unauthenticated', async () => {
    const res = await fetch(`${BASE}/api/company`);
    expect(res.status).toBe(401);
  });

  it('403s for an Employee without org-profile:manage (AC-03)', async () => {
    const token = await tokenFor('employee@clearline.dev');
    const res = await fetch(`${BASE}/api/company`, auth(token));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden_role' });
  });

  it('returns the company profile for a Controller (AC-01/02)', async () => {
    const token = await tokenFor('controller@clearline.dev');
    const res = await fetch(`${BASE}/api/company`, auth(token));
    expect(res.status).toBe(200);
    const body = (await res.json()) as CompanyProfileResponse;
    expect(body.legalName).toBe(SEED_ORGANIZATION.legalName);
    expect(body.ein).toBe(SEED_ORGANIZATION.ein);
    expect(body.verificationStatus).toBe('verified');
    expect(body.addressLine1).toBe('1 Market St');
  });
});

describe('PATCH /api/company', () => {
  it('persists the editable fields and records a company_profile audit event (AC-01/04)', async () => {
    const token = await tokenFor('controller@clearline.dev');
    const res = await fetch(
      `${BASE}/api/company`,
      auth(token, { method: 'PATCH', body: JSON.stringify(EDIT) }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as CompanyProfileResponse;
    expect(body.addressLine1).toBe('500 Howard St');
    expect(body.fiscalYearStartMonth).toBe(7);

    const events = auditService.list();
    expect(events).toHaveLength(1);
    expect(events[0]!.category).toBe('company_profile');
    expect(events[0]!.actor.id).toBe('user_ctrl');
    // Before → after is captured (AC-04).
    expect(events[0]!.diff?.from).toContain('1 Market St');
    expect(events[0]!.diff?.to).toContain('500 Howard St');

    // Persisted for the next read.
    const reread = (await (
      await fetch(`${BASE}/api/company`, auth(token))
    ).json()) as CompanyProfileResponse;
    expect(reread.addressLine1).toBe('500 Howard St');
  });

  it('401s when unauthenticated and records nothing', async () => {
    const res = await fetch(`${BASE}/api/company`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(EDIT),
    });
    expect(res.status).toBe(401);
    expect(auditService.list()).toHaveLength(0);
  });

  it('403s for an Employee and records nothing (AC-03)', async () => {
    const token = await tokenFor('employee@clearline.dev');
    const res = await fetch(
      `${BASE}/api/company`,
      auth(token, { method: 'PATCH', body: JSON.stringify(EDIT) }),
    );
    expect(res.status).toBe(403);
    expect(auditService.list()).toHaveLength(0);
  });

  it('ignores a crafted legalName/ein in the body — KYB identity is immutable (AC-02)', async () => {
    const token = await tokenFor('controller@clearline.dev');
    const res = await fetch(
      `${BASE}/api/company`,
      auth(token, {
        method: 'PATCH',
        body: JSON.stringify({ ...EDIT, legalName: 'Hacked Inc', ein: '99-9999999' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as CompanyProfileResponse;
    expect(body.legalName).toBe(SEED_ORGANIZATION.legalName);
    expect(body.ein).toBe(SEED_ORGANIZATION.ein);
  });
});

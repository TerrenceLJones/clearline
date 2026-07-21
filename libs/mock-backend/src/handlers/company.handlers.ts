import { http, HttpResponse, type HttpHandler } from 'msw';
import type {
  CompanyErrorResponse,
  CompanyProfileResponse,
  UpdateCompanyProfileRequest,
} from '@clearline/contracts';
import { hasPermission, permissionsForRole } from '@clearline/domain-auth';
import { AuditService } from '../services/audit.service';
import { AuthService } from '../services/auth.service';
import { sharedAuditService } from '../services/shared-audit-service';
import { sharedAuthService } from '../services/shared-auth-service';
import { resolveAuditActor } from './audit-actor';
import { bearerToken, unauthorizedForSession } from './session-auth';

function forbidden() {
  const body: CompanyErrorResponse = { error: 'forbidden_role' };
  return HttpResponse.json(body, { status: 403 });
}

/** A one-line before/after summary of the editable fields, for the audit diff (AC-04). */
function summarize(profile: CompanyProfileResponse): string {
  const address = [
    profile.addressLine1,
    profile.addressLine2,
    profile.city,
    profile.state,
    profile.postalCode,
  ]
    .filter(Boolean)
    .join(', ');
  return `${profile.primaryContactEmail} · ${address} · FY month ${profile.fiscalYearStartMonth}`;
}

/**
 * The Company Profile surface (US-CW-036). Unlike the self-service Profile endpoints, this is org-config:
 * every call independently re-derives the caller's permissions from their live session and requires
 * `org-profile:manage` (Controller/Admin/Owner), returning 403 regardless of client routing — "client
 * hides, server decides" (AC-03). Reads/writes act on the caller's own organization, resolved from the
 * session (never a client-supplied org id). A successful edit emits an immutable `company_profile` audit
 * event with a before → after diff (AC-04). The KYB-verified legal name and EIN are never written here,
 * so a crafted request carrying them cannot alter them (AC-02).
 */
export function createCompanyHandlers(
  authService: AuthService = sharedAuthService,
  auditService: AuditService = sharedAuditService,
): HttpHandler[] {
  /**
   * Resolve the caller's org id if their session is active AND carries `org-profile:manage`. Returns
   * a discriminated result so the handler can map each failure to the right status: 401 (no session),
   * 403 (authorized session but wrong role, or no org to manage).
   */
  function authorizeOrg(
    request: Request,
  ): { ok: true; orgId: string } | { ok: false; status: 401 | 403 } {
    const token = bearerToken(request);
    const session = token ? authService.checkSession(token) : null;
    if (!session || session.outcome !== 'active') return { ok: false, status: 401 };

    const permissions = permissionsForRole(session.role!, {
      isAdmin: session.isAdmin!,
      isOwner: session.isOwner!,
    });
    if (!hasPermission(permissions, 'org-profile:manage')) return { ok: false, status: 403 };

    const orgId = authService.getOrgIdForUser(session.userId!);
    if (!orgId) return { ok: false, status: 403 };
    return { ok: true, orgId };
  }

  return [
    http.get('*/api/company', ({ request }) => {
      const authz = authorizeOrg(request);
      if (!authz.ok) {
        return authz.status === 401 ? unauthorizedForSession(request, authService) : forbidden();
      }
      const body = authService.getCompanyProfile(authz.orgId)!;
      return HttpResponse.json<CompanyProfileResponse>(body, { status: 200 });
    }),

    http.patch('*/api/company', async ({ request }) => {
      const authz = authorizeOrg(request);
      if (!authz.ok) {
        return authz.status === 401 ? unauthorizedForSession(request, authService) : forbidden();
      }
      // Only the operational fields are read; legalName/ein/structure in the body are ignored (AC-02).
      const patch = (await request.json()) as UpdateCompanyProfileRequest;
      const before = authService.getCompanyProfile(authz.orgId)!;
      const after = authService.updateCompanyProfile(authz.orgId, {
        primaryContactEmail: patch.primaryContactEmail,
        addressLine1: patch.addressLine1,
        addressLine2: patch.addressLine2,
        city: patch.city,
        state: patch.state,
        postalCode: patch.postalCode,
        fiscalYearStartMonth: patch.fiscalYearStartMonth,
      })!;

      const actor = resolveAuditActor(request, authService);
      if (actor) {
        auditService.record({
          actor,
          category: 'company_profile',
          action: 'Updated company profile',
          target: { label: after.legalName },
          diff: { from: summarize(before), to: summarize(after) },
        });
      }
      return HttpResponse.json<CompanyProfileResponse>(after, { status: 200 });
    }),
  ];
}

export const companyHandlers = createCompanyHandlers();

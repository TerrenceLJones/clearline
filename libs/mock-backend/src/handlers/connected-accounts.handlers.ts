import { http, HttpResponse, type HttpHandler } from 'msw';
import type {
  ConnectManuallyRequest,
  ConnectedAccount,
  ConnectedAccountErrorCode,
  ConnectedAccountErrorResponse,
  ConnectedAccountResponse,
  ConnectedAccountsResponse,
  Permission,
  VerifyMicroDepositsRequest,
  VerifyMicroDepositsResponse,
} from '@clearline/contracts';
import { hasPermission, permissionsForRole } from '@clearline/domain-auth';
import { AuditService } from '../services/audit.service';
import { AuthService } from '../services/auth.service';
import { ConnectedAccountsService } from '../services/connected-accounts.service';
import { sharedAuditService } from '../services/shared-audit-service';
import { sharedAuthService } from '../services/shared-auth-service';
import { sharedConnectedAccountsService } from '../services/shared-connected-accounts-service';
import { resolveAuditActor } from './audit-actor';
import { bearerToken, unauthorizedForSession } from './session-auth';

/** Resolve the caller's server-derived permissions from their own access token — never client claims. */
function resolvePermissions(
  request: Request,
  authService: AuthService,
): readonly Permission[] | null {
  const accessToken = bearerToken(request);
  if (!accessToken) return null;
  const session = authService.checkSession(accessToken);
  if (session.outcome !== 'active') return null;
  return permissionsForRole(session.role!, {
    isAdmin: session.isAdmin!,
    isOwner: session.isOwner!,
  });
}

function error(code: ConnectedAccountErrorCode, status: number) {
  const body: ConnectedAccountErrorResponse = { error: code };
  return HttpResponse.json(body, { status });
}

/**
 * Thin HTTP adapter in front of ConnectedAccountsService (US-CW-038). Every endpoint independently
 * re-checks `bank-accounts:manage` server-side (the route guard is never the boundary), and every
 * mutation records a `connected_account` audit event with the masked account — never the account number
 * (AC-10). A connect/verify/remove/reconnect maps one-to-one to a service command.
 */
export function createConnectedAccountsHandlers(
  service: ConnectedAccountsService = sharedConnectedAccountsService,
  authService: AuthService = sharedAuthService,
  auditService: AuditService = sharedAuditService,
): HttpHandler[] {
  /** Auth + server-side bank-accounts:manage check, shared by every endpoint. */
  function authorize(request: Request) {
    const permissions = resolvePermissions(request, authService);
    if (!permissions) return { fail: unauthorizedForSession(request, authService) };
    if (!hasPermission(permissions, 'bank-accounts:manage')) {
      return { fail: error('forbidden_role', 403) };
    }
    return { fail: null as null };
  }

  function audit(request: Request, action: string, account: ConnectedAccount) {
    const actor = resolveAuditActor(request, authService);
    if (!actor) return;
    auditService.record({
      actor,
      category: 'connected_account',
      action,
      target: { label: `${account.institutionName} ••••${account.last4}` },
    });
  }

  return [
    http.get('*/api/connected-accounts', ({ request }) => {
      const { fail } = authorize(request);
      if (fail) return fail;
      return HttpResponse.json<ConnectedAccountsResponse>(
        { accounts: service.list() },
        {
          status: 200,
        },
      );
    }),

    http.post('*/api/connected-accounts/plaid', ({ request }) => {
      const { fail } = authorize(request);
      if (fail) return fail;
      const account = service.connectViaPlaid();
      audit(request, 'Connected bank account via Plaid', account);
      return HttpResponse.json<ConnectedAccountResponse>({ account }, { status: 201 });
    }),

    http.post('*/api/connected-accounts/manual', async ({ request }) => {
      const { fail } = authorize(request);
      if (fail) return fail;
      const body = (await request.json()) as ConnectManuallyRequest;
      const result = service.connectManually(body.routingNumber, body.accountNumber);
      switch (result.outcome) {
        case 'invalid_routing':
          return error('invalid_routing', 422);
        case 'invalid_account':
          return error('invalid_account', 422);
        case 'already_connected':
          return error('already_connected', 409);
        case 'ok':
          audit(request, 'Connected bank account manually', result.account);
          return HttpResponse.json<ConnectedAccountResponse>(
            { account: result.account },
            {
              status: 201,
            },
          );
      }
    }),

    http.post('*/api/connected-accounts/:id/verify', async ({ request, params }) => {
      const { fail } = authorize(request);
      if (fail) return fail;
      const body = (await request.json()) as VerifyMicroDepositsRequest;
      const result = service.verifyMicroDeposits(String(params.id), body.amountsMinorUnits);
      if (result.outcome === 'not_found') return error('account_not_found', 404);
      if (result.outcome === 'not_pending') return error('not_pending', 409);
      if (result.outcome === 'verified') {
        audit(request, 'Verified bank account', result.account);
      }
      return HttpResponse.json<VerifyMicroDepositsResponse>(
        {
          account: result.account,
          outcome: result.outcome,
          attemptsRemaining: result.attemptsRemaining,
        },
        { status: 200 },
      );
    }),

    http.post('*/api/connected-accounts/:id/reconnect', ({ request, params }) => {
      const { fail } = authorize(request);
      if (fail) return fail;
      const result = service.reconnect(String(params.id));
      if (result.outcome === 'not_found') return error('account_not_found', 404);
      audit(request, 'Reconnected bank account', result.account);
      return HttpResponse.json<ConnectedAccountResponse>(
        { account: result.account },
        {
          status: 200,
        },
      );
    }),

    http.delete('*/api/connected-accounts/:id', ({ request, params }) => {
      const { fail } = authorize(request);
      if (fail) return fail;
      const result = service.remove(String(params.id));
      if (result.outcome === 'not_found') return error('account_not_found', 404);
      audit(request, 'Removed bank account', result.account);
      return HttpResponse.json<ConnectedAccountResponse>(
        { account: result.account },
        {
          status: 200,
        },
      );
    }),
  ];
}

export const connectedAccountsHandlers = createConnectedAccountsHandlers();

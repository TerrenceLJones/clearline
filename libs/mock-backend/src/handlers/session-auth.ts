import { HttpResponse } from 'msw';
import type { SessionErrorResponse } from '@clearline/contracts';
import type { AuthService } from '../services/auth.service';

/** Pulls the bearer access token out of the Authorization header, or undefined when absent/malformed. */
export function bearerToken(request: Request): string | undefined {
  const authHeader = request.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
}

/**
 * The 401 an authenticated endpoint returns when the caller has no active session — mapping the
 * session-check outcome to the SAME error code the /api/auth/session endpoint uses. Critically, an
 * expired access token yields `access_token_expired`, so the client's silent-refresh interceptor
 * recovers on EVERY authenticated endpoint rather than only on /session (US-CW-002 AC-01): a user
 * whose access token lapses while on, say, the approvals queue is silently refreshed instead of
 * bounced to login. Revoked families report their specific reason; anything else is `invalid_token`.
 */
export function unauthorizedForSession(request: Request, authService: AuthService) {
  const accessToken = bearerToken(request);
  const result = accessToken ? authService.checkSession(accessToken) : null;

  let error: SessionErrorResponse['error'] = 'invalid_token';
  if (result?.outcome === 'expired') {
    error = 'access_token_expired';
  } else if (result?.outcome === 'revoked') {
    error =
      result.reason === 'password_changed'
        ? 'session_revoked_password_changed'
        : 'session_revoked_security';
  }

  const body: SessionErrorResponse = { error };
  return HttpResponse.json(body, { status: 401 });
}

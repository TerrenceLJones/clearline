/**
 * The Company Profile surface (EPIC-CW-022 / US-CW-036): an organization's editable operational
 * details — primary contact, business address, fiscal-year start — kept current by a Controller,
 * Admin, or Owner, while the KYB-verified legal identity (legal name + EIN) stays read-only. Gated
 * by `org-profile:manage`; the server independently re-checks that permission on every call
 * (US-CW-033 AC-04). The verified identity fields render as text, never as editable inputs — the
 * "no derived/verified value rendered as editable" instance of the design §19 doctrine.
 */

/** Whether the org's legal identity has cleared KYB. 'pending' orgs show a pending state, not a Verified badge. */
export type CompanyVerificationStatus = 'verified' | 'pending';

/** GET /api/company — the org's company profile: KYB-locked identity plus the editable operational fields. */
export interface CompanyProfileResponse {
  /** KYB-verified legal business name — read-only (AC-02). */
  legalName: string;
  /** KYB-verified Employer Identification Number — read-only, carries the "Verified" badge (AC-02). */
  ein: string;
  /** Registered business structure (e.g. "C-Corporation") — sourced from KYB, read-only. */
  structure: string;
  /** Whether legalName/ein are KYB-verified; drives the Verified badge vs. a pending state (AC-02). */
  verificationStatus: CompanyVerificationStatus;
  /** Primary contact email for the organization — editable (AC-01). */
  primaryContactEmail: string;
  addressLine1: string;
  /** Optional second address line (suite/floor); '' when unused. */
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  /** Fiscal-year start month, 1 (January) – 12 (December). A change applies next budget period, not retroactively (AC-01). */
  fiscalYearStartMonth: number;
}

/**
 * PATCH /api/company — the editable operational fields only. Legal name, EIN, and structure are
 * KYB-derived and immutable post-verification (AC-02): they are absent here, and a crafted request
 * carrying them cannot change them because the server never reads them from this body.
 */
export interface UpdateCompanyProfileRequest {
  primaryContactEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  fiscalYearStartMonth: number;
}

export type CompanyErrorCode =
  /** Caller's session lacks `org-profile:manage` — the API refuses regardless of client routing (AC-03). */
  | 'forbidden_role'
  /** No active session on the request. */
  | 'unauthenticated';

export interface CompanyErrorResponse {
  error: CompanyErrorCode;
}

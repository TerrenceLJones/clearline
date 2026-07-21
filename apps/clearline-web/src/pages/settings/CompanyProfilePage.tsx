import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AccessDenied, Chip, Select, Text, TextField, UnsavedChangesFooter } from '@clearline/ui';
import { SettingsForbiddenError, useSettingsSectionAccess } from '@clearline/data-access-settings';
import { useCompanyProfile, useUpdateCompanyProfile } from '@clearline/data-access-company';
import type { CompanyProfileResponse } from '@clearline/contracts';
import { useDemoBeacon } from '@clearline/demo-beacon';
import { ToastViewport } from '../../components/ToastViewport';
import { useToast } from '../../hooks/useToast';
import { useRegisterNavigationGuard } from '../../hooks/navigation-guard-context';
import { DEFAULT_SETTINGS_SLUG, settingsPathForSlug } from '../../rbac/settings-sections';
import { companyBeacon } from './company.beacon';

/** A card surface matching the other settings sections. */
const CARD = 'border-cl-border bg-cl-surface rounded-xl border p-6';

/** Month options for the fiscal-year-start select (1 = January … 12 = December). */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: String(index + 1), label }));

interface CompanyForm {
  primaryContactEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  fiscalYearStartMonth: number;
}

/** The editable form's values seeded from the saved company profile. */
function toForm(company: CompanyProfileResponse | undefined): CompanyForm {
  return {
    primaryContactEmail: company?.primaryContactEmail ?? '',
    addressLine1: company?.addressLine1 ?? '',
    addressLine2: company?.addressLine2 ?? '',
    city: company?.city ?? '',
    state: company?.state ?? '',
    postalCode: company?.postalCode ?? '',
    fiscalYearStartMonth: company?.fiscalYearStartMonth ?? 1,
  };
}

/** A read-only verified-identity field: rendered as text (not a disabled input), per the design §19 doctrine. */
function ReadOnlyField({
  label,
  value,
  mono = false,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Text as="span" size="label" tone="muted">
        {label}
      </Text>
      <div className="flex items-center gap-2">
        <Text as="span" className={mono ? 'font-mono' : undefined}>
          {value}
        </Text>
        {badge}
      </div>
    </div>
  );
}

/**
 * Settings → Company Profile (US-CW-036). An Organization-group page gated by `org-profile:manage`.
 * The KYB-verified legal name + EIN render as read-only text with a "Verified" badge and a support
 * path (AC-02) — never as editable inputs. The operational fields (primary contact, business
 * address, fiscal-year start) are editable behind the shared unsaved-changes footer + leave guard
 * (AC-01). Like every org section it independently honors the server's 403 (AC-03): the section
 * probe degrades the whole page to AccessDenied even if the client route guard were bypassed.
 */
export function CompanyProfilePage() {
  useDemoBeacon(companyBeacon);
  const navigate = useNavigate();
  const access = useSettingsSectionAccess('company');
  const { data: company } = useCompanyProfile();
  const updateCompany = useUpdateCompanyProfile();
  const { toast, show: showToast } = useToast(4000);

  const [form, setForm] = useState<CompanyForm>(() => toForm(company));

  // Re-seed the form whenever the saved server values change — on first load and after a successful
  // save. The "adjust state while rendering" reset pattern (matching PersonalInfoPage), keyed on the
  // saved values so an in-progress edit is never clobbered by an unrelated re-render.
  const savedKey = company
    ? [
        company.primaryContactEmail,
        company.addressLine1,
        company.addressLine2,
        company.city,
        company.state,
        company.postalCode,
        company.fiscalYearStartMonth,
      ].join('|')
    : '';
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (company && savedKey !== syncedKey) {
    setSyncedKey(savedKey);
    setForm(toForm(company));
  }

  const dirty = Boolean(
    company &&
    (form.primaryContactEmail !== company.primaryContactEmail ||
      form.addressLine1 !== company.addressLine1 ||
      form.addressLine2 !== company.addressLine2 ||
      form.city !== company.city ||
      form.state !== company.state ||
      form.postalCode !== company.postalCode ||
      form.fiscalYearStartMonth !== company.fiscalYearStartMonth),
  );

  // Unsaved-changes guard (AC-01, via the US-CW-034 footer + leave guard): in-app navigation prompts
  // first; the beforeunload handler covers hard navigations (reload, tab close).
  useRegisterNavigationGuard(dirty);
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function handleSave() {
    updateCompany.mutate(
      {
        primaryContactEmail: form.primaryContactEmail,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        fiscalYearStartMonth: form.fiscalYearStartMonth,
      },
      { onSuccess: () => showToast('Company profile updated') },
    );
  }
  function handleDiscard() {
    setForm(toForm(company));
  }

  // Client hides, server decides (AC-03): a typed 403 from the section probe swaps the whole page to
  // AccessDenied even though the route guard already gates it client-side.
  if (access.isError && access.error instanceof SettingsForbiddenError) {
    return (
      <AccessDenied
        message="Ask an admin if you need it. This settings section is available to a different role."
        requestLine="403 Forbidden · GET /api/settings/sections/company"
        actionLabel="Back to Personal Info"
        onAction={() => navigate(settingsPathForSlug(DEFAULT_SETTINGS_SLUG))}
      />
    );
  }

  if (!company) {
    return (
      <Text as="p" tone="muted">
        Loading company profile…
      </Text>
    );
  }

  const verified = company.verificationStatus === 'verified';

  return (
    <div className="flex flex-col gap-6">
      <Text as="h2" size="heading">
        Company Profile
      </Text>

      {/* Verified business identity — read-only (AC-02). */}
      <section className={`${CARD} flex flex-col gap-4`}>
        <Text as="h3" size="label" weight="semibold">
          Business identity
        </Text>
        <ReadOnlyField label="Legal business name" value={company.legalName} />
        <div className="flex flex-wrap gap-x-12 gap-y-4">
          <ReadOnlyField
            label="EIN"
            value={company.ein}
            mono
            badge={
              verified ? (
                <Chip label="Verified" icon="check" />
              ) : (
                <Chip label="Pending verification" icon="clock" />
              )
            }
          />
          <ReadOnlyField label="Business structure" value={company.structure} />
        </div>
        <Text as="p" size="label" tone="faint">
          {verified
            ? "Verified details cannot be changed. Contact support if there's an error."
            : 'These details are being verified. Contact support if there’s an error.'}
        </Text>
      </section>

      {/* Editable operational fields (AC-01). */}
      <section className={`${CARD} flex flex-col gap-4`}>
        <Text as="h3" size="label" weight="semibold">
          Contact & address
        </Text>
        <TextField
          label="Primary contact email"
          type="email"
          value={form.primaryContactEmail}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, primaryContactEmail: event.target.value }))
          }
        />
        <TextField
          label="Address line 1"
          value={form.addressLine1}
          onChange={(event) => setForm((prev) => ({ ...prev, addressLine1: event.target.value }))}
        />
        <TextField
          label="Address line 2"
          value={form.addressLine2}
          onChange={(event) => setForm((prev) => ({ ...prev, addressLine2: event.target.value }))}
        />
        <div className="flex flex-wrap gap-4">
          <div className="min-w-40 flex-1">
            <TextField
              label="City"
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
            />
          </div>
          <div className="w-24">
            <TextField
              label="State"
              value={form.state}
              onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
            />
          </div>
          <div className="w-32">
            <TextField
              label="ZIP / Postal code"
              value={form.postalCode}
              onChange={(event) => setForm((prev) => ({ ...prev, postalCode: event.target.value }))}
            />
          </div>
        </div>
      </section>

      {/* Fiscal year (AC-01). */}
      <section className={`${CARD} flex flex-col gap-2`}>
        <Text as="h3" size="label" weight="semibold">
          Fiscal year
        </Text>
        <div className="flex flex-col gap-1.5">
          <Text as="span" size="label" tone="muted" id="fiscal-year-label">
            Fiscal year start month
          </Text>
          <div className="w-56">
            <Select
              aria-label="Fiscal year start month"
              value={String(form.fiscalYearStartMonth)}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, fiscalYearStartMonth: Number(value) }))
              }
              options={MONTH_OPTIONS}
            />
          </div>
        </div>
        <Text as="p" size="label" tone="faint">
          A change takes effect on the next budget period — existing periods are not re-windowed.
        </Text>
      </section>

      <UnsavedChangesFooter
        visible={dirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        saving={updateCompany.isPending}
      />

      <ToastViewport toast={toast} />
    </div>
  );
}

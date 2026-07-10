import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { CreatePaymentRequest, PaymentRecipient } from '@clearline/contracts';
import { validatePayment } from '@clearline/domain-payments';
import { toMajorUnits } from '@clearline/money';
import {
  AccessDenied,
  Alert,
  Avatar,
  Button,
  ConfirmationDialog,
  Icon,
  Text,
  TextField,
  formatMoney,
} from '@clearline/ui';
import {
  PaymentTimeoutError,
  PaymentValidationError,
  PaymentsForbiddenError,
  useCreatePayment,
  useExchangeRate,
  useIdempotencyKey,
  usePaymentContext,
} from '@clearline/data-access-payments';
import { usePageTitle } from '../../hooks/usePageTitle';
import { messageForPaymentError, parseAmountToMinorUnits } from './new-payment-form';

const DRAFT_KEY = 'clearline:payment-draft';

interface PaymentDraft {
  recipientId?: string;
  amountInput: string;
  memo: string;
  method: 'ach' | 'wire';
  manualMode: boolean;
  routingNumber: string;
  accountNumber: string;
  idempotencyKey: string;
}

/**
 * Reads the in-progress payment draft. AC-06 preserves the amount, recipient, memo AND the idempotency
 * key across a session-expiry redirect, so re-authentication resumes the exact same PaymentIntent
 * rather than starting a new one — the persisted key is what makes that a resume, not a duplicate.
 */
function readDraft(): Partial<PaymentDraft> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<PaymentDraft>) : null;
  } catch {
    return null;
  }
}

function writeDraft(draft: PaymentDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // A full sessionStorage (or a privacy mode that throws) shouldn't break the form.
  }
}

function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function formatUsd(amountMinorUnits: number): string {
  return formatMoney(toMajorUnits({ amountMinorUnits, currency: 'USD' }), 'USD');
}

/** A read-only settlement estimate for the Review summary — ACH clears in a couple of business days, a wire the same day. */
function arrivalEstimate(method: 'ach' | 'wire'): string {
  return method === 'ach' ? '1–2 business days' : 'Same day';
}

/** First-letters initials for the recipient avatar (Avatar itself trims to two glyphs). */
function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/**
 * The New Payment form (US-CW-007/008/009). Balance, daily-limit, self-transfer and closed-recipient
 * checks run client-side via the same validatePayment gate the server enforces, so doomed payments are
 * blocked before any network call. Submission is pessimistic — an idempotency key minted once, a
 * confirm dialog with an irreversible countdown, then "Processing…" until the server confirms —
 * never an instant "Success". The server independently re-validates everything and its 4xx reasons
 * map back to the same inline copy.
 */
export function NewPaymentPage() {
  usePageTitle('New payment');
  const navigate = useNavigate();
  const context = usePaymentContext();
  const createPayment = useCreatePayment();

  const draft = useMemo(() => readDraft(), []);
  const [recipientId, setRecipientId] = useState<string | undefined>(draft?.recipientId);
  const [manualMode, setManualMode] = useState<boolean>(draft?.manualMode ?? false);
  const [routingNumber, setRoutingNumber] = useState(draft?.routingNumber ?? '');
  const [accountNumber, setAccountNumber] = useState(draft?.accountNumber ?? '');
  const [amountInput, setAmountInput] = useState(draft?.amountInput ?? '');
  const [memo, setMemo] = useState(draft?.memo ?? '');
  const [method, setMethod] = useState<'ach' | 'wire'>(draft?.method ?? 'ach');
  const [fxAcknowledged, setFxAcknowledged] = useState(false);
  const [clientError, setClientError] = useState<{
    field?: 'recipient' | 'amount';
    message: string;
    limitCta?: boolean;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const idempotency = useIdempotencyKey(draft?.idempotencyKey);

  const source = context.data?.source;
  const recipients = context.data?.recipients ?? [];
  const selectedRecipient = recipients.find((r) => r.id === recipientId);
  const amountMinor = parseAmountToMinorUnits(amountInput);
  const isCrossCurrency = !!selectedRecipient && selectedRecipient.currency !== 'USD';

  const fx = useExchangeRate('USD', selectedRecipient?.currency ?? 'USD', amountMinor ?? 0, {
    enabled: isCrossCurrency && (amountMinor ?? 0) > 0,
  });

  // Persist the draft (incl. the idempotency key) on every change, so a mid-submission session
  // timeout and redirect can rehydrate it on return (AC-06).
  useEffect(() => {
    writeDraft({
      recipientId,
      amountInput,
      memo,
      method,
      manualMode,
      routingNumber,
      accountNumber,
      idempotencyKey: idempotency.key,
    });
  }, [
    recipientId,
    amountInput,
    memo,
    method,
    manualMode,
    routingNumber,
    accountNumber,
    idempotency.key,
  ]);

  const serverError =
    createPayment.error instanceof PaymentValidationError ? createPayment.error : null;
  const isTimeout = createPayment.error instanceof PaymentTimeoutError;
  const isExhausted = createPayment.isError && !serverError && !isTimeout;

  // A server idempotency mismatch means the payload changed since the key was minted — this is a
  // genuinely new operation, so mint a fresh key for the resubmission (AC-05).
  useEffect(() => {
    if (serverError?.code === 'idempotency_mismatch') {
      idempotency.reset();
    }
    // Only react to the code transitioning, not to idempotency identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverError?.code]);

  if (context.error instanceof PaymentsForbiddenError) {
    return <AccessDenied requestLine="403 Forbidden · GET /api/payments/context" />;
  }

  function runClientValidation(): typeof clientError {
    if (!source) return { message: 'Loading your account…' };
    if (!selectedRecipient && !manualMode) {
      return { field: 'recipient', message: 'Choose a recipient or enter account details.' };
    }
    if (amountMinor === null) {
      return { field: 'amount', message: 'Enter an amount greater than $0.' };
    }
    const decision = validatePayment({
      amountMinorUnits: amountMinor,
      availableBalanceMinorUnits: source.availableBalance.amountMinorUnits,
      dailyLimitMinorUnits: source.dailyLimit.amountMinorUnits,
      dailySpentMinorUnits: source.dailySpent.amountMinorUnits,
      isSelfTransfer: selectedRecipient
        ? selectedRecipient.maskedAccount === source.maskedAccount
        : false,
      recipientStatus: selectedRecipient?.status,
    });
    if (!decision.ok) {
      return {
        field:
          decision.reason === 'recipient_closed' || decision.reason === 'self_transfer'
            ? 'recipient'
            : 'amount',
        message: messageForPaymentError(decision.reason, {
          availableBalance:
            decision.reason === 'insufficient_balance' ? source.availableBalance : undefined,
          dailyLimit: decision.reason === 'daily_limit_exceeded' ? source.dailyLimit : undefined,
        }),
        limitCta: decision.reason === 'daily_limit_exceeded',
      };
    }
    if (isCrossCurrency && !fxAcknowledged) {
      return {
        field: 'amount',
        message: 'Review and confirm the converted amount before sending.',
      };
    }
    return null;
  }

  function onReview() {
    const error = runClientValidation();
    setClientError(error);
    if (!error) setConfirmOpen(true);
  }

  function buildRequest(): CreatePaymentRequest {
    return {
      amount: { amountMinorUnits: amountMinor ?? 0, currency: 'USD' },
      method,
      ...(memo ? { memo } : {}),
      ...(manualMode
        ? { recipientAccount: { routingNumber, accountNumber } }
        : { recipientId: selectedRecipient?.id }),
    };
  }

  function submit() {
    createPayment.mutate(
      { request: buildRequest(), idempotencyKey: idempotency.key },
      {
        onSuccess: (intent) => {
          clearDraft();
          navigate(`/payments/${intent.id}`);
        },
      },
    );
  }

  function onConfirm() {
    setConfirmOpen(false);
    submit();
  }

  function selectRecipient(recipient: PaymentRecipient) {
    setManualMode(false);
    setRecipientId(recipient.id);
    setMethod(recipient.method);
    setFxAcknowledged(false);
    setClientError(null);
  }

  const activeError = serverError
    ? {
        field: serverError.code === 'recipient_not_found' ? ('recipient' as const) : undefined,
        message: messageForPaymentError(serverError.code, {
          availableBalance: serverError.availableBalance,
          dailyLimit: serverError.dailyLimit,
        }),
        limitCta: serverError.code === 'daily_limit_exceeded',
      }
    : clientError;

  // Balance after this payment is itself a derived projection (available − amount) — shown read-only in
  // the Review panel. Fall back to the current available balance until a valid, in-balance amount exists.
  const projectedBalanceMinor =
    source && amountMinor !== null && amountMinor <= source.availableBalance.amountMinorUnits
      ? source.availableBalance.amountMinorUnits - amountMinor
      : (source?.availableBalance.amountMinorUnits ?? null);

  return (
    <div className="font-sans">
      {/* Fills the shell's content column (design spans the full width, split ~1.35 / 0.9). */}
      <div className="w-full">
        <div className="border-cl-border bg-cl-bg overflow-hidden rounded-xl border md:flex">
          {/* ── Left: the payment form ───────────────────────────────────────── */}
          <div className="flex-[1.35] p-6 md:p-7">
            <Text as="h2" size="heading" className="mb-1">
              New payment
            </Text>
            <Text as="p" size="label" tone="muted" className="mb-5">
              Initiate a transfer to a verified vendor.
            </Text>

            {/* Pay from — a derived, read-only balance (no input affordance, US-CW-008). */}
            <div className="mb-4">
              <Text as="div" size="label" tone="muted" className="mb-1.5">
                Pay from
              </Text>
              <div className="border-cl-border-2 bg-cl-surface flex items-center justify-between rounded-lg border px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="bg-cl-accent-weak text-cl-accent-text flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-md">
                    <Icon name="building" size={15} />
                  </span>
                  <div className="min-w-0">
                    <Text as="div" size="body" weight="semibold" className="truncate">
                      {source ? `${source.name} · ${source.maskedAccount}` : 'Loading account…'}
                    </Text>
                    <Text as="div" size="label" tone="faint">
                      {source ? `${source.currency} checking` : ' '}
                    </Text>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-cl-text-3 border-cl-border-2 mb-0.5 inline-flex items-center gap-1 rounded border px-1.5 py-0.5">
                    <Icon name="lock" size={9} />
                    <Text as="span" size="mono" tone="faint">
                      DERIVED
                    </Text>
                  </span>
                  {source ? (
                    <Text as="div" size="mono" weight="semibold" className="tabular-nums">
                      {formatUsd(source.availableBalance.amountMinorUnits)}
                    </Text>
                  ) : (
                    <div
                      className="cl-skeleton ml-auto h-[16px] w-[70px] rounded"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Recipient picker */}
            <div className="mb-4">
              <Text as="div" size="label" tone="muted" className="mb-2">
                Recipient
              </Text>
              <ul className="flex flex-col gap-2">
                {recipients.map((recipient) => {
                  const selected = !manualMode && recipient.id === recipientId;
                  const closed = recipient.status === 'closed';
                  return (
                    <li key={recipient.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => selectRecipient(recipient)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left ${
                          selected
                            ? 'border-cl-accent bg-cl-accent-weak'
                            : 'border-cl-border-2 bg-cl-surface'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Avatar
                            initials={initialsFor(recipient.name)}
                            size={30}
                            tone={selected ? 'accent' : 'neutral'}
                          />
                          <span className="flex min-w-0 flex-col">
                            <Text as="span" size="body" weight="semibold" className="truncate">
                              {recipient.name}
                            </Text>
                            <Text as="span" size="mono" tone="faint">
                              {recipient.method.toUpperCase()} · {recipient.maskedAccount}
                            </Text>
                          </span>
                        </span>
                        {closed ? (
                          <Text
                            as="span"
                            size="label"
                            weight="semibold"
                            className="text-cl-neg flex-shrink-0"
                          >
                            Closed
                          </Text>
                        ) : (
                          <span className="text-cl-pos flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold">
                            <Icon name="check" size={12} />
                            Verified
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setManualMode(true);
                  setRecipientId(undefined);
                  setClientError(null);
                }}
                className="text-cl-accent-text mt-2 text-[12px] font-semibold"
              >
                Recipient not listed? Enter account details
              </button>
              {manualMode ? (
                <div className="mt-3 flex flex-col gap-3">
                  <TextField
                    label="Routing number"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    state={activeError?.field === 'recipient' ? 'error' : undefined}
                  />
                  <TextField
                    label="Account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    state={activeError?.field === 'recipient' ? 'error' : undefined}
                  />
                </div>
              ) : null}
            </div>

            {/* Amount + method, side by side. Amount is the prominent, tabular figure per the design. */}
            <div className="mb-4 flex items-end gap-3.5">
              <div className="flex-[1.2]">
                <TextField
                  label="Amount"
                  inputMode="decimal"
                  prefix="$"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    // A changed amount invalidates any prior cross-currency acknowledgement — the user
                    // must re-confirm the newly converted amount before sending (US-CW-008 AC-06).
                    setFxAcknowledged(false);
                  }}
                  state={activeError?.field === 'amount' ? 'error' : undefined}
                  className="font-mono text-[18px] font-semibold tabular-nums"
                />
              </div>
              <div className="flex-1">
                <Text as="div" size="label" tone="muted" className="mb-1.5">
                  Method
                </Text>
                <div className="relative">
                  <select
                    aria-label="Method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as 'ach' | 'wire')}
                    className="border-cl-border-2 bg-cl-surface text-cl-text focus:border-cl-accent focus:ring-cl-accent-weak w-full cursor-pointer appearance-none rounded-lg border py-[11px] pr-9 pl-3.5 text-[13px] outline-none focus:ring-3"
                  >
                    <option value="ach">ACH</option>
                    <option value="wire">Wire</option>
                  </select>
                  <span className="text-cl-text-3 pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <Icon name="chevron-down" size={12} />
                  </span>
                </div>
              </div>
            </div>

            <div>
              <TextField
                label="Memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="e.g. Q2 platform license — INV-20418"
              />
            </div>

            {/* Cross-currency: non-blocking banner + converted amount, confirmed before send (AC-06) */}
            {isCrossCurrency ? (
              <div className="mt-5">
                <Alert
                  tone="info"
                  title={`This recipient uses ${selectedRecipient?.currency}. Review the converted amount before sending.`}
                />
                {fx.data ? (
                  <div className="border-cl-border bg-cl-surface mt-3 rounded-lg border p-3">
                    <div className="flex justify-between py-1">
                      <Text as="span" size="label" tone="muted">
                        You send
                      </Text>
                      <Text as="span" size="mono">
                        {amountMinor !== null ? formatUsd(amountMinor) : '—'} USD
                      </Text>
                    </div>
                    <div className="flex justify-between py-1">
                      <Text as="span" size="label" tone="muted">
                        Exchange rate
                      </Text>
                      <Text as="span" size="mono">
                        1 USD = {fx.data.rate.rate} {fx.data.rate.toCurrency}
                      </Text>
                    </div>
                    <div className="flex justify-between py-1">
                      <Text as="span" size="label" tone="muted">
                        Recipient gets
                      </Text>
                      <Text as="span" size="mono" weight="semibold">
                        {formatMoney(
                          toMajorUnits(fx.data.convertedAmount),
                          fx.data.convertedAmount.currency,
                        )}{' '}
                        {fx.data.convertedAmount.currency}
                      </Text>
                    </div>
                    <label className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={fxAcknowledged}
                        onChange={(e) => setFxAcknowledged(e.target.checked)}
                      />
                      <Text as="span" size="label">
                        Confirm converted amount
                      </Text>
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Status/error banners live with the fields they explain */}
            {isTimeout ? (
              <div className="mt-4">
                <Alert
                  tone="info"
                  title="We're still confirming your payment. We'll update this in a moment — don't resubmit."
                />
              </div>
            ) : isExhausted ? (
              <div className="mt-4">
                <Alert
                  tone="negative"
                  title="Couldn't process this payment. Try again."
                  action="Retry"
                  onAction={submit}
                />
              </div>
            ) : activeError?.message ? (
              <div className="mt-4">
                <div role="alert" className="text-cl-neg text-[12px] font-medium">
                  {activeError.message}
                </div>
                {activeError.limitCta ? (
                  <Button variant="link" size="sm" className="mt-1 px-0">
                    Request limit increase
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* ── Right: the derived Review summary ─────────────────────────────── */}
          <div className="border-cl-border bg-cl-surface flex flex-[0.9] flex-col border-t p-6 md:border-t-0 md:border-l">
            <Text as="div" size="label" weight="semibold" tone="muted" className="mb-4">
              Review
            </Text>

            <div className="flex justify-between py-1.5">
              <Text as="span" size="label" tone="muted">
                Amount
              </Text>
              <Text as="span" size="body" weight="medium" className="font-mono tabular-nums">
                {amountMinor !== null ? formatUsd(amountMinor) : '—'}
              </Text>
            </div>
            <div className="flex justify-between py-1.5">
              <Text as="span" size="label" tone="muted">
                {method === 'ach' ? 'ACH' : 'Wire'} fee
              </Text>
              <Text as="span" size="body" weight="medium" className="font-mono tabular-nums">
                {formatUsd(0)}
              </Text>
            </div>
            <div className="flex justify-between py-1.5">
              <Text as="span" size="label" tone="muted">
                Arrives
              </Text>
              <Text as="span" size="body" weight="medium">
                {arrivalEstimate(method)}
              </Text>
            </div>

            <div className="bg-cl-border my-2.5 h-px" />

            <div className="flex justify-between pb-3">
              <Text as="span" size="body" weight="semibold">
                Total debit
              </Text>
              <Text as="span" size="body" weight="semibold" className="font-mono tabular-nums">
                {amountMinor !== null ? formatUsd(amountMinor) : '—'}
              </Text>
            </div>
            <Text as="div" size="label" tone="faint" className="mb-5 leading-relaxed">
              Balance after this payment:{' '}
              <span className="font-mono">
                {projectedBalanceMinor !== null ? formatUsd(projectedBalanceMinor) : '—'}
              </span>{' '}
              (derived).
            </Text>

            <div className="mt-auto">
              <Button
                type="button"
                fullWidth
                onClick={onReview}
                loading={createPayment.isPending}
                disabled={isTimeout}
              >
                Review &amp; send
              </Button>
              {createPayment.isPending ? (
                <Text as="p" size="label" tone="muted" className="mt-2 text-center">
                  Processing…
                </Text>
              ) : null}
              <Text as="p" size="mono" tone="faint" className="mt-3 text-center">
                idempotency-key {idempotency.key.slice(0, 8)}…
              </Text>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Send ${amountMinor !== null ? formatUsd(amountMinor) : ''} to ${
          selectedRecipient?.name ?? 'this recipient'
        }?`}
        body="This transfers funds immediately and can't be undone. Recovering it would require a reversing entry."
        confirmLabel="Send payment"
        onConfirm={onConfirm}
      />
    </div>
  );
}

import type { ConnectedAccount, ConnectionStatus, VerifyOutcome } from '@clearline/contracts';
import {
  MICRO_DEPOSIT_AMOUNTS_MINOR_UNITS,
  MICRO_DEPOSIT_MAX_ATTEMPTS,
  SEED_CONNECTED_ACCOUNTS,
  type SeedConnectedAccount,
} from '../fixtures/connected-accounts.fixture';

/** The institutions a mocked Plaid Link connection can return, cycled so repeat connects differ. */
const PLAID_INSTITUTIONS = [
  'Mercury',
  'Bank of America',
  'Wells Fargo Business',
  'Brex Cash',
] as const;

interface StoredAccount {
  id: string;
  institutionName: string;
  last4: string;
  method: 'plaid' | 'manual';
  status: ConnectionStatus;
  /** The two correct micro-deposit amounts for a manual account; empty for Plaid accounts. */
  microDeposits: readonly number[];
  attemptsUsed: number;
}

export type ConnectManualOutcome =
  | { outcome: 'ok'; account: ConnectedAccount }
  | { outcome: 'invalid_routing' }
  | { outcome: 'invalid_account' }
  | { outcome: 'already_connected' };

export type VerifyResult =
  | { outcome: 'not_found' }
  | { outcome: 'not_pending' }
  | { outcome: VerifyOutcome; account: ConnectedAccount; attemptsRemaining: number };

export type SimpleAccountOutcome =
  { outcome: 'ok'; account: ConnectedAccount } | { outcome: 'not_found' };

/**
 * In-memory connected-bank-account backend for US-CW-038. Accounts connect either through a mocked
 * Plaid Link (lands verified) or by manual routing/account entry, which begins a two micro-deposit
 * challenge: the account is `pending_verification` until the correct amounts are entered (AC-05), and
 * locks after three wrong attempts (AC-06). Removal never touches an in-flight payment — it only drops
 * the account so no future transfer can use it (AC-07). A Plaid account can be pushed into
 * `reconnect_required` (the demo's ITEM_LOGIN_REQUIRED) and recovered via reconnect (AC-08). State is
 * per-instance; the app binds the shared singleton and tests construct isolated instances.
 */
export class ConnectedAccountsService {
  private readonly accounts = new Map<string, StoredAccount>();
  private counter = 0;
  private plaidCursor = 0;

  constructor(seed: readonly SeedConnectedAccount[] = SEED_CONNECTED_ACCOUNTS) {
    for (const account of seed) {
      this.accounts.set(account.id, {
        id: account.id,
        institutionName: account.institutionName,
        last4: account.last4,
        method: account.method,
        status: account.status,
        microDeposits: account.method === 'manual' ? [...MICRO_DEPOSIT_AMOUNTS_MINOR_UNITS] : [],
        attemptsUsed: 0,
      });
    }
  }

  list(): ConnectedAccount[] {
    return [...this.accounts.values()].map((account) => this.toWire(account));
  }

  /** Simulate a successful Plaid Link connection — the account lands verified (AC-04). */
  connectViaPlaid(): ConnectedAccount {
    const institutionName = PLAID_INSTITUTIONS[this.plaidCursor % PLAID_INSTITUTIONS.length]!;
    this.plaidCursor += 1;
    const id = this.nextId('acct');
    const stored: StoredAccount = {
      id,
      institutionName,
      last4: this.mintLast4(),
      method: 'plaid',
      status: 'connected',
      microDeposits: [],
      attemptsUsed: 0,
    };
    this.accounts.set(id, stored);
    return this.toWire(stored);
  }

  /**
   * Begin a manual connection (AC-05). Routing must be 9 digits and the account number 4–17 digits; a
   * duplicate of an already-connected account (same last four) is refused rather than silently added.
   * The account starts `pending_verification` with the two micro-deposits it must be verified against.
   */
  connectManually(routingNumber: string, accountNumber: string): ConnectManualOutcome {
    if (!/^\d{9}$/.test(routingNumber)) return { outcome: 'invalid_routing' };
    if (!/^\d{4,17}$/.test(accountNumber)) return { outcome: 'invalid_account' };

    const last4 = accountNumber.slice(-4);
    const duplicate = [...this.accounts.values()].some((account) => account.last4 === last4);
    if (duplicate) return { outcome: 'already_connected' };

    const id = this.nextId('acct');
    const stored: StoredAccount = {
      id,
      institutionName: 'Manual bank account',
      last4,
      method: 'manual',
      status: 'pending_verification',
      microDeposits: [...MICRO_DEPOSIT_AMOUNTS_MINOR_UNITS],
      attemptsUsed: 0,
    };
    this.accounts.set(id, stored);
    return { outcome: 'ok', account: this.toWire(stored) };
  }

  /**
   * Check the two micro-deposit amounts against a pending manual account (AC-05/06). Correct amounts
   * (order-insensitive) verify it; a mismatch consumes one of three attempts and locks the account once
   * they run out — a locked account must be removed and reconnected to try again.
   */
  verifyMicroDeposits(id: string, amounts: readonly number[]): VerifyResult {
    const account = this.accounts.get(id);
    if (!account) return { outcome: 'not_found' };
    if (account.status !== 'pending_verification') return { outcome: 'not_pending' };

    const expected = [...account.microDeposits].sort((a, b) => a - b);
    const provided = [...amounts].sort((a, b) => a - b);
    const matches =
      expected.length === provided.length && expected.every((value, i) => value === provided[i]);

    if (matches) {
      account.status = 'connected';
      return { outcome: 'verified', account: this.toWire(account), attemptsRemaining: 0 };
    }

    account.attemptsUsed += 1;
    const attemptsRemaining = Math.max(0, MICRO_DEPOSIT_MAX_ATTEMPTS - account.attemptsUsed);
    if (attemptsRemaining === 0) {
      account.status = 'verification_locked';
      return { outcome: 'locked', account: this.toWire(account), attemptsRemaining: 0 };
    }
    return { outcome: 'mismatch', account: this.toWire(account), attemptsRemaining };
  }

  /** Remove an account (AC-07). Idempotent-safe: returns not_found if it's already gone. */
  remove(id: string): SimpleAccountOutcome {
    const account = this.accounts.get(id);
    if (!account) return { outcome: 'not_found' };
    this.accounts.delete(id);
    return { outcome: 'ok', account: this.toWire(account) };
  }

  /** Recover a Plaid account from `reconnect_required` after re-authentication (AC-08). */
  reconnect(id: string): SimpleAccountOutcome {
    const account = this.accounts.get(id);
    if (!account) return { outcome: 'not_found' };
    account.status = 'connected';
    return { outcome: 'ok', account: this.toWire(account) };
  }

  /** Demo/e2e control: push a Plaid account into ITEM_LOGIN_REQUIRED so the reconnect flow is visible. */
  forceReconnectRequired(id: string): SimpleAccountOutcome {
    const account = this.accounts.get(id);
    if (!account) return { outcome: 'not_found' };
    account.status = 'reconnect_required';
    return { outcome: 'ok', account: this.toWire(account) };
  }

  private toWire(account: StoredAccount): ConnectedAccount {
    return {
      id: account.id,
      institutionName: account.institutionName,
      last4: account.last4,
      method: account.method,
      status: account.status,
      ...(account.method === 'manual' && account.status === 'pending_verification'
        ? { verificationAttemptsRemaining: MICRO_DEPOSIT_MAX_ATTEMPTS - account.attemptsUsed }
        : {}),
    };
  }

  private mintLast4(): string {
    return String(1000 + (this.counter % 9000)).padStart(4, '0');
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}_${this.counter}`;
  }
}

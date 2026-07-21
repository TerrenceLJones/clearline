import { describe, expect, it } from 'vitest';
import { ConnectedAccountsService } from './connected-accounts.service';
import {
  MICRO_DEPOSIT_AMOUNTS_MINOR_UNITS,
  SEED_CONNECTED_ACCOUNTS,
} from '../fixtures/connected-accounts.fixture';

function service() {
  return new ConnectedAccountsService();
}

describe('ConnectedAccountsService', () => {
  it('lists the seeded accounts', () => {
    expect(service().list()).toHaveLength(SEED_CONNECTED_ACCOUNTS.length);
  });

  it('connects a Plaid account already verified (AC-04)', () => {
    const svc = service();
    const account = svc.connectViaPlaid();
    expect(account.method).toBe('plaid');
    expect(account.status).toBe('connected');
    expect(account.last4).toHaveLength(4);
    expect(svc.list().some((a) => a.id === account.id)).toBe(true);
  });

  describe('manual connection + micro-deposit verification (AC-05/06)', () => {
    it('starts pending and verifies with the correct amounts', () => {
      const svc = service();
      const connect = svc.connectManually('021000021', '1234567890');
      expect(connect.outcome).toBe('ok');
      if (connect.outcome !== 'ok') return;
      expect(connect.account.status).toBe('pending_verification');
      expect(connect.account.last4).toBe('7890');
      expect(connect.account.verificationAttemptsRemaining).toBe(3);

      const verify = svc.verifyMicroDeposits(connect.account.id, [
        ...MICRO_DEPOSIT_AMOUNTS_MINOR_UNITS,
      ]);
      expect(verify.outcome).toBe('verified');
      if (verify.outcome === 'verified') expect(verify.account.status).toBe('connected');
    });

    it('verifies regardless of the order the two amounts are entered', () => {
      const svc = service();
      const connect = svc.connectManually('021000021', '1234567890');
      if (connect.outcome !== 'ok') throw new Error('setup');
      const [a, b] = MICRO_DEPOSIT_AMOUNTS_MINOR_UNITS;
      const verify = svc.verifyMicroDeposits(connect.account.id, [b, a]);
      expect(verify.outcome).toBe('verified');
    });

    it('rejects a 9-digit-invalid routing number', () => {
      expect(service().connectManually('123', '1234567890').outcome).toBe('invalid_routing');
    });

    it('refuses a duplicate of an already-connected account (same last four)', () => {
      const svc = service();
      // Seed account acct_svb ends in 3355.
      expect(svc.connectManually('021000021', '9999993355').outcome).toBe('already_connected');
    });

    it('locks verification after three wrong attempts (AC-06)', () => {
      const svc = service();
      const connect = svc.connectManually('021000021', '1234567890');
      if (connect.outcome !== 'ok') throw new Error('setup');
      const id = connect.account.id;

      const first = svc.verifyMicroDeposits(id, [1, 2]);
      expect(first.outcome).toBe('mismatch');
      if (first.outcome === 'mismatch') expect(first.attemptsRemaining).toBe(2);

      const second = svc.verifyMicroDeposits(id, [3, 4]);
      expect(second.outcome).toBe('mismatch');
      if (second.outcome === 'mismatch') expect(second.attemptsRemaining).toBe(1);

      const third = svc.verifyMicroDeposits(id, [5, 6]);
      expect(third.outcome).toBe('locked');

      // A locked account no longer accepts verification.
      expect(svc.verifyMicroDeposits(id, [...MICRO_DEPOSIT_AMOUNTS_MINOR_UNITS]).outcome).toBe(
        'not_pending',
      );
    });
  });

  it('removes an account so it no longer appears (AC-07)', () => {
    const svc = service();
    const removed = svc.remove('acct_chase');
    expect(removed.outcome).toBe('ok');
    expect(svc.list().some((a) => a.id === 'acct_chase')).toBe(false);
    expect(svc.remove('acct_chase').outcome).toBe('not_found');
  });

  it('recovers a Plaid account from reconnect_required (AC-08)', () => {
    const svc = service();
    expect(svc.forceReconnectRequired('acct_chase').outcome).toBe('ok');
    expect(svc.list().find((a) => a.id === 'acct_chase')?.status).toBe('reconnect_required');

    const reconnected = svc.reconnect('acct_chase');
    expect(reconnected.outcome).toBe('ok');
    expect(svc.list().find((a) => a.id === 'acct_chase')?.status).toBe('connected');
  });
});

import { describe, expect, it } from 'vitest';
import type { Permission } from '@clearline/contracts';
import { permissionsForRole } from '@clearline/domain-auth';
import { navIdForPath, navItemsForPermissions, navPathForId } from './nav-items';

function canFor(role: Parameters<typeof permissionsForRole>[0], isAdmin = false) {
  const perms = permissionsForRole(role, { isAdmin });
  return (permission: Permission) => perms.includes(permission);
}

describe('navItemsForPermissions', () => {
  it('gives an Employee only My Expenses and My Cards (US-CW-006 AC-01)', () => {
    const items = navItemsForPermissions(canFor('employee'));
    expect(items.map((i) => i.label)).toEqual(['My Expenses', 'My Cards']);
  });

  it('gives a Finance Manager expenses/cards plus Approvals and Reconciliation (AC-02)', () => {
    const labels = navItemsForPermissions(canFor('finance_manager')).map((i) => i.label);
    expect(labels).toContain('Approvals');
    expect(labels).toContain('Reconciliation');
    expect(labels).not.toContain('Budget Management');
    expect(labels).not.toContain('Audit Log');
  });

  it('gives a Controller all Finance Manager links plus Budget and Audit (AC-03)', () => {
    const labels = navItemsForPermissions(canFor('controller')).map((i) => i.label);
    expect(labels).toContain('Budget Management');
    expect(labels).toContain('Audit Log');
  });

  it('adds Team for an Admin without any approval links (orthogonality)', () => {
    const labels = navItemsForPermissions(canFor('employee', true)).map((i) => i.label);
    expect(labels).toContain('Team');
    expect(labels).not.toContain('Approvals');
  });
});

describe('navPathForId / navIdForPath', () => {
  it('maps an id to its path and back', () => {
    expect(navPathForId('approvals')).toBe('/approvals');
    expect(navIdForPath('/approvals')).toBe('approvals');
  });

  it('resolves the home path to expenses', () => {
    expect(navIdForPath('/')).toBe('expenses');
  });

  it('highlights the section for a nested route without "/" matching everything', () => {
    expect(navIdForPath('/approvals/exp_4471')).toBe('approvals');
  });

  it('returns undefined for an unknown path', () => {
    expect(navIdForPath('/nowhere')).toBeUndefined();
  });
});

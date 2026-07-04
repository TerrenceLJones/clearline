import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageTitle } from './usePageTitle';

describe('usePageTitle', () => {
  it('sets the document title suffixed with the site name', () => {
    renderHook(() => usePageTitle('Sign in'));

    expect(document.title).toBe('Sign in · Clearline');
  });

  it('updates the title when it re-renders with a new value', () => {
    const { rerender } = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: 'Sign in' },
    });

    rerender({ title: 'Sign up' });

    expect(document.title).toBe('Sign up · Clearline');
  });
});

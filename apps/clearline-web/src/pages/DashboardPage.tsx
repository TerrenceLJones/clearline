import { usePageTitle } from '../hooks/usePageTitle';

/** Stub redirect target for US-CW-001's post-login navigation — the real spend dashboard is separate epic scope. */
export function DashboardPage() {
  usePageTitle('Spend Dashboard');
  return <div>Welcome back.</div>;
}

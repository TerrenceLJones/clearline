import type { IconName } from '@clearline/icons';
import { EmptyState } from '@clearline/ui';
import { usePageTitle } from '../hooks/usePageTitle';

export interface PlaceholderPageProps {
  title: string;
  icon: IconName;
  body: string;
}

/**
 * A minimal stand-in for a role-gated section this epic exposes in the nav but doesn't own (My Cards,
 * Reconciliation, Budget Management, Audit Log, Team). It exists so the role-scoped nav links resolve
 * and the RequirePermission guard is demonstrable for every gated route; the real content lands in
 * the epic that owns each section.
 */
export function PlaceholderPage({ title, icon, body }: PlaceholderPageProps) {
  usePageTitle(title);
  return <EmptyState icon={icon} title={title} body={body} />;
}

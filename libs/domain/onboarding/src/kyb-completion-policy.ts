/**
 * Whether an onboarding record reflects a genuinely completed KYB — business info captured, at least
 * one beneficial owner recorded, and at least one identity document verified. The mock backend's
 * approval outcome is deliberately lenient (US-CW-004 approves on business info alone, for app
 * access), so this stricter check gates the one thing that must not be conferred on an unfinished
 * application: account ownership (US-CW-030). A bare submit that skips the wizard may reach the app,
 * but it cannot be elevated to Controller + Owner.
 */
export function isKybComplete(facts: {
  hasBusiness: boolean;
  ownerCount: number;
  documentCount: number;
}): boolean {
  return facts.hasBusiness && facts.ownerCount > 0 && facts.documentCount > 0;
}

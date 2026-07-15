import type { DemoBeaconPageConfig } from '@clearline/demo-beacon';
import { DEMO_USER_PASSWORD } from '@clearline/mock-backend/fixtures';
import {
  EXAMPLE_SIGNUP_EMAIL,
  buildVerifyEmailSection,
  type VerifyTarget,
} from '../dev/beacon/shared';
import { resetSection } from '../dev/beacon/global.beacon';

/**
 * Sign-up guide: how to start a fresh KYB onboarding run. Pass the account the viewer just submitted
 * (`target`) so the verify action mints the link for *their* email; the page supplies it once it's on
 * the "check your email" wall. Before submission there's no account yet, so it falls back to the
 * example throwaway address.
 */
export function buildSignUpBeacon(target?: VerifyTarget): DemoBeaconPageConfig {
  return {
    pageId: 'signup',
    title: 'Create an account',
    summary: 'A fresh sign-up starts a new KYB onboarding flow (the demo account skips it).',
    sections: [
      {
        kind: 'flows',
        title: 'Try this',
        flows: [
          {
            id: 'sign-up',
            title: 'Sign up as a new business',
            steps: [
              { text: `Use any new email, e.g. \`${EXAMPLE_SIGNUP_EMAIL}\`.` },
              { text: `Pick a strong password, e.g. \`${DEMO_USER_PASSWORD}\`.` },
              {
                text: 'Submit — the demo can’t send a real email, so use the button below to verify.',
              },
              {
                text: 'Verifying signs you in and opens the KYB wizard at the business-info step.',
              },
            ],
          },
        ],
      },
      buildVerifyEmailSection(target),
      resetSection,
    ],
  };
}

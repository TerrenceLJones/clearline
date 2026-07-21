import type { DemoBeaconPageConfig } from '@clearline/demo-beacon';
import { resetSection } from '../../dev/beacon/global.beacon';

/**
 * Company Profile demo guide (US-CW-036). Registered by CompanyProfilePage so it overrides the
 * layout-level settings guide while mounted (last-registered wins) and the settings guide resurfaces
 * on unmount. It teaches the one thing this org-config page is about: the KYB-verified identity is
 * locked (read-only, with a Verified badge and a support path) while the operational fields —
 * primary contact, business address, fiscal-year start — are editable behind the shared
 * unsaved-changes footer. This page is Organization-group, so it only renders for a Controller,
 * Admin, or Owner; the API refuses everyone else with a 403.
 */
export const companyBeacon: DemoBeaconPageConfig = {
  pageId: 'settings.company',
  title: 'Company Profile',
  summary:
    'Keep the company record current: edit the **primary contact**, **business address**, and ' +
    '**fiscal-year start** behind the sticky unsaved-changes footer. The **KYB-verified** legal ' +
    'name and EIN are locked — shown as read-only text with a Verified badge, not editable inputs.',
  sections: [
    {
      kind: 'flows',
      title: 'Try this',
      flows: [
        {
          id: 'edit-operational',
          title: 'Edit the operational details',
          steps: [
            {
              text: 'Change the **primary contact email** or **address** — a sticky Save/Discard bar appears.',
            },
            {
              text: '**Save changes** persists and shows a "Company profile updated" toast; **Discard** reverts every field.',
            },
            {
              text: 'Change the **fiscal-year start month** — the note reminds you it applies next budget period, not retroactively.',
            },
          ],
        },
        {
          id: 'verified-locked',
          title: 'The KYB-verified identity is locked',
          steps: [
            {
              text: 'The **legal business name** and **EIN** render as read-only text — there is no input to edit them (AC-02).',
            },
            {
              text: 'The **Verified** badge sits by the EIN, with a note pointing to support for corrections.',
            },
          ],
        },
      ],
    },
    resetSection,
  ],
};

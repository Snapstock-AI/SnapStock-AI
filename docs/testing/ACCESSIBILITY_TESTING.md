# Accessibility testing (baseline / audit, not a WCAG conformance claim)

`e2e/tests/a11y.spec.ts` runs axe-core (rules tagged wcag2a, wcag2aa, wcag21a, wcag21aa) on login, signup,
forgot-password, landing, dashboard, scans, scan result, inventory, alerts, shelves, analytics and settings, in the
desktop (1280 px) and mobile (360 px) projects. It also checks keyboard-only login, tab order, that every visible
input/select has an accessible name, that buttons/links have names, no horizontal scroll at 360 and 1024 px, 44x44 px
touch targets on the scan controls, and that freshness status is text, not colour alone.

Findings fixed (see DEFECTS BUG-10): unlabeled settings inputs, freshness select triggers, mobile logo link,
placeholder-only search, 40 px scan controls. One accepted exclusion: decorative, aria-hidden 25 %-opacity step numerals
on the landing page, excluded by exact selector (WCAG 1.4.3 exempts pure decoration; axe cannot tell).

Observations not turned into failures: each dashboard page renders two `<h1>` elements (layout header and page
header); "Forgot password?" sits between the email and password fields in tab order. Pages that need extra state
(camera dialog, invitations, onboarding, verify/reset pages) and admin pages were not audited. Automated tools find only
part of the issues; screen-reader and keyboard review is manual test M-08.

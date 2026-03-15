# Engineering Guardrails

These guardrails come from debugging the reflection workflow through API integration
tests and Docker-backed Playwright runs.

## Mutation Flows

For user-visible create and edit flows:

- Do not rely only on mocked frontend tests.
- Add API integration coverage for the real mutation route.
- Add at least one narrow browser E2E flow when the user journey includes:
  - create then immediate redirect
  - modal save then parent-page update
  - date-window or permission-sensitive visibility

Typical examples:

- `PATCH` preference updates
- `POST` create flows that immediately open the new record
- `PATCH` summary/editor flows

## Client State

After a successful mutation:

- Prefer updating local authoritative state immediately.
- Do not depend on a full-session refresh for the saved value to appear.

Use full refreshes sparingly. They are acceptable for coarse account-level changes,
but they are fragile for modal saves and immediate create-to-detail transitions.

## Browser-Visible API Behavior

When adding or changing mutation routes:

- Verify CORS preflight allows the actual browser method.
- Test the route from a browser-backed path at least once when the route uses
  `PATCH`, `PUT`, or `DELETE`.

An `OPTIONS` success alone is not enough; the browser still needs the actual
method allowed in `access-control-allow-methods`.

## Visibility Windows

Be careful with time-window and relationship-window logic.

Test these cases explicitly:

- newly created relationship plus recent lookback access
- create followed immediately by read
- boundary dates at the start and end of a visible period

Avoid combining multiple boundaries unless the product rule truly requires it.
If a policy says "last N days", do not silently narrow it further with
relationship creation time unless that behavior is intentional and documented.

## Accessible UI Targeting

Repeated actions need stable accessible targeting.

Prefer:

- specific labels like `Open Reflection for Jordan Ellis`
- dialog assertions based on dialog role/name
- route changes or form-field visibility for post-create assertions

Avoid depending on:

- the first matching `Open` or `Save` action on a page
- duplicated heading text across page regions
- assumptions that custom-styled controls expose default HTML semantics

## Theme Discipline

Avoid raw Chakra default color schemes in new or touched UI:

- `green`
- `orange`
- `blue`
- `gray`
- `red`
- other library defaults

Prefer app theme tokens and app-defined color schemes. Reflection surfaces already
have a targeted test for this; extend that pattern when modernizing adjacent areas.

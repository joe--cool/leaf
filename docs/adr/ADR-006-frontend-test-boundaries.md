# ADR-006: Frontend Test Boundaries

- Status: Accepted
- Date: 2026-03-27

## Context

The web app uses Chakra UI components that depend on Zag focus and interaction behavior. In the current React 19 + JSDOM stack, those browser-level semantics are not modeled reliably enough for high-confidence keyboard, focus, portal, and disclosure interaction tests.

We also want to preserve the intended product UI semantics instead of redesigning controls just to satisfy the test environment.

## Decision

We will keep the intended Chakra/UI semantics and split test responsibilities by layer:

- `Vitest` + `JSDOM` own:
  - pure domain logic
  - route and API wiring
  - render, loading, empty, and error smoke coverage
  - state and payload transitions that do not depend on real browser focus, keyboard, or portal behavior
- `Playwright` owns:
  - keyboard and focus semantics
  - radio, checkbox, switch, and disclosure interactions
  - dialog, popover, menu, and other portal-backed flows
  - high-risk end-to-end journeys such as onboarding and unified tracked-item creation/editing

`Vitest` may use a narrow test-only shim at the `@zag-js/focus-visible` boundary. It must not mock Chakra components wholesale or globally rewrite focus behavior to manufacture passing interaction tests.

## Consequences

- Product controls remain semantically correct and accessible in the shipped UI.
- Browser interaction confidence moves into a layer that models those interactions faithfully.
- JSDOM tests stay fast and deterministic because they no longer try to simulate behavior the environment does not implement well.
- New interaction-heavy tests should default to `Playwright`, not `App.test.tsx`.

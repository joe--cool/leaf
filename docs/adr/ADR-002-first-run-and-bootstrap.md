# ADR-002: First-Run Setup and Bootstrap Strategy

- Status: Accepted
- Date: 2026-03-07

## Context

leaf must support both secure first-use setup and quick trial onboarding.

## Decision

1. First admin creation is allowed only when database user count is zero.
2. Optional `SETUP_TOKEN` can be required for first-admin creation.
3. Optional bootstrap env mode can create an admin automatically for scripted/demo scenarios.
4. Local startup helper can generate one-time setup token and print to terminal only.
5. First-run web setup may optionally enable a seeded demo workspace for the initial admin.

## Rationale

- DB-empty gate is a standard pattern for first-run setup.
- Setup token adds protection against accidental/remote unauthorized bootstrap.
- Env bootstrap supports CI, demos, and automated installations.
- Terminal-only token output avoids leaking secrets into persistent app logs.
- Relative-date demo seeding keeps the trial workspace representative instead of aging into stale examples.

## Consequences

Positive:

- Supports both secure and fast onboarding workflows.
- Better operational flexibility for different deployment contexts.

Tradeoffs:

- More configuration branches to document and test.
- Operators need to understand secure vs demo mode differences.
- Demo seed data becomes product surface area that must be updated with new user-visible features.

## Alternatives considered

1. Always auto-create default admin: rejected (weak security posture).
2. Always manual setup with no automation path: rejected (hurts usability/testing).
3. Setup only through direct DB seeding: rejected (poor operator UX).

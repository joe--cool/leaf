# ADR-003: Docker-First Onboarding Strategy

- Status: Accepted
- Date: 2026-03-07

## Context

New users should be able to evaluate leaf quickly without manually wiring dependencies.

## Decision

1. Provide Docker Compose as the primary onboarding path.
2. Compose stack includes Postgres, API, Web, and Mailpit.
3. API container performs schema sync on startup for local/dev convenience.
4. Use health checks and service dependencies for predictable startup order.
5. Allow runtime override of public origin/API URL for LAN hostname access.

## Rationale

- One-command startup lowers trial friction.
- Bundled services remove local dependency setup burden.
- Health checks reduce flakiness during initial startup.
- Runtime overrides support common self-hosting LAN scenarios.

## Consequences

Positive:

- Faster onboarding and more consistent local environments.
- Easier troubleshooting and demos.

Tradeoffs:

- Startup scripts and compose defaults must clearly distinguish dev vs production practices.
- Schema push-on-start is convenient but not ideal for strict production change control.

## Alternatives considered

1. Source-only onboarding first: rejected due to higher setup friction.
2. External managed dependencies only: rejected for portability/open-source friendliness.
3. Production-grade migration-only workflow in quickstart: deferred to advanced deployment docs.

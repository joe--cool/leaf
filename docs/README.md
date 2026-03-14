# leaf Docs

This folder contains the product, design, and architecture documentation for `leaf`.

## Start Here

- [Design Doc](./DESIGN.md)
  North-star product and system design direction.
- [User Journeys](./USER_JOURNEYS.md)
  Desired target-state journeys for members, guides, notifications, retrospectives, and accountability workflows.

## Architecture Decision Records

- [ADR Index](./adr/README.md)
  Overview of all architecture decision records.
- [ADR-001: Authentication and Session Model](./adr/ADR-001-auth-and-sessions.md)
- [ADR-002: First-Run Setup and Bootstrap Strategy](./adr/ADR-002-first-run-and-bootstrap.md)
- [ADR-003: Docker-First Onboarding Strategy](./adr/ADR-003-docker-first-onboarding.md)
- [ADR-004: Member / Guide Relationship Model](./adr/ADR-004-member-guide-relationship-model.md)
- [ADR-005: Transparency, Auditability, and Governance](./adr/ADR-005-transparency-audit-and-governance.md)

## Suggested Reading Order

1. [Design Doc](./DESIGN.md)
2. [User Journeys](./USER_JOURNEYS.md)
3. [ADR Index](./adr/README.md)
4. Individual ADRs as needed

## Notes

- `DESIGN.md` and `USER_JOURNEYS.md` are north-star documents and may describe desired behavior that is not yet fully implemented.
- ADRs capture specific design decisions and may be `Accepted` or `Proposed` depending on maturity.

## Implementation structure

- API route registration is split by domain under `apps/api/src/routes/` so auth/setup, member/item flows, reviewer/admin flows, and validation can evolve independently.
- Web page modules live under `apps/web/src/pages/`, reusable shell and navigation pieces live under `apps/web/src/components/`, and `apps/web/src/App.tsx` is intentionally limited to shell/orchestration concerns.
- Web scheduling constants, shared app types, and schedule summarization logic stay outside page components so UI composition code is not mixed with schedule interpretation rules.

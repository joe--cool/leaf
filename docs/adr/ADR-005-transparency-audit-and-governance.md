# ADR-005: Transparency, Auditability, and Governance

- Status: Proposed
- Date: 2026-03-13

## Context

leaf is intended to foster accountability. That requires participants to understand what others can see, what actions they can take, and what changed over time. The system also needs to handle delegated behavior such as guide actions and parent impersonation without creating hidden control paths.

As the product moves toward richer permissions, multiple guides, and parent/child support, auditability and transparent governance become product requirements rather than implementation details.

## Decision

1. Treat transparency by default as a core product principle.
2. Provide a first-class audit log with a dedicated user-facing page.
3. Attribute guide actions and impersonated actions visibly.
4. Prefer hiding unauthorized controls in the UI over showing blocked actions after the fact.
5. Use modular RBAC for administrative governance instead of a single monolithic admin role.
6. Let admin capabilities focus on policy, safety, support, and governance rather than automatic visibility into all personal data.

## Rationale

- Accountability breaks down when visibility and control are ambiguous.
- Audit history provides clarity without forcing heavy approval workflows.
- Explicit attribution is necessary when guides or parents act on behalf of members.
- Hiding unauthorized controls reduces confusion and keeps the product aligned with member control.
- Modular RBAC supports support/admin operations without overgranting access.

## Consequences

Positive:

- Participants can trust the system more easily.
- Sensitive actions such as impersonation become easier to reason about and review.
- Admin access can be tailored to actual operational needs.

Tradeoffs:

- Audit storage, filtering, and UI complexity increase.
- RBAC design becomes more involved than a simple admin/non-admin split.
- Some policy questions must be resolved explicitly rather than left implicit in implementation.

## Alternatives considered

1. Minimal audit logging for backend operations only: rejected because the product needs user-visible accountability.
2. A single all-powerful admin role: rejected because it conflicts with the desired governance posture.
3. Allow unauthorized actions but block them on submit: rejected because it creates avoidable confusion and undermines the clarity of permissions.

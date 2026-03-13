# ADR-004: Member / Guide Relationship Model

- Status: Proposed
- Date: 2026-03-13

## Context

leaf started with a simpler reviewer/reviewee model. The desired product direction is broader: a user may track their own work, guide one or more other users, or do both. The system also needs to support multiple guides, parent/child scenarios, reciprocal accountability partnerships, privacy boundaries, and guide-specific visibility.

The product needs a clearer relationship model that can scale beyond a single reviewer pattern without hard-coding household assumptions into every workflow.

## Decision

1. Use `Member` and `Guide` as the canonical product terms.
2. Model accountability relationships as directional, even when support is reciprocal.
3. Treat multiple guides per member as first-class.
4. Support relationship templates including `Active Guide`, `Passive Guide`, `Parent`, and `Accountability Partner`.
5. Keep control with the member by default, with parent/admin exceptions governed explicitly by policy and permissions.
6. Allow members to hide specific items from specific guides while still signaling that hidden items exist.
7. Default non-parent guide history access to future-only.

## Rationale

- `Member` / `Guide` is more flexible and product-friendly than reviewer/reviewee terminology.
- Directional relationships make permissions, visibility, and reciprocity easier to reason about.
- Multiple-guide support is necessary for household, caregiver, and broader accountability use cases.
- Templates reduce configuration friction while still allowing transparency and later refinement.
- Member-centered control fits the product’s accountability-with-transparency posture better than a supervisor-first model.

## Consequences

Positive:

- A single relationship model can support households, peers, and other accountability scenarios.
- Permissions and visibility become easier to explain.
- The product can support active vs passive guide experiences cleanly.

Tradeoffs:

- Data model and UI complexity will increase relative to the current reviewer-only approach.
- Parent/child and age-based permission transitions require explicit policy handling.
- Hidden-item logic introduces score and digest visibility nuances.

## Alternatives considered

1. Keep `reviewer` / `reviewee` terminology and extend it: rejected because it narrows the product language and feels overly supervisory.
2. Model reciprocal support as one shared relationship: rejected because directional permissions and visibility are clearer and safer.
3. Optimize for a single primary guide only: rejected because it does not match the intended household and support use cases.

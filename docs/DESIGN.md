# leaf Design Doc

## 1. Purpose

`leaf` is an accountability product for people who want consistent, timely, and transparent follow-through without relying on memory, ad hoc check-ins, or constant supervision.

The product begins with small-household use cases, but it should generalize to any setting where one person is tracking commitments and one or more other people are helping with visibility, support, or accountability.

This document is a working design north star. It describes the intended product model and system direction. It is not limited to what is already implemented.

## 2. Product Vision

`leaf` should help:

- a `Member` stay consistent, timely, and transparent
- a `Guide` stay effective without having to remember every follow-up manually

The product is not meant to be a proof-heavy compliance workflow. It should feel lightweight for day-to-day use while still making accountability visible and auditable.

## 3. Product Principles

- Transparency by default
- Member control by default
- Directional relationships, even when support is reciprocal
- Lightweight action for members
- Oversight without bureaucratic review workflows
- Explicit privacy boundaries
- First-class auditability
- Extensible household-first model

These principles should win when local UX or implementation decisions conflict.

## 4. Core Roles And Relationship Model

### Canonical terms

- `Member`: a person tracking their own commitments
- `Guide`: a person supporting, reviewing, or overseeing a member
- `Active Guide`: a guide with operational responsibilities and escalation visibility
- `Passive Guide`: a guide with summary and context visibility but limited or no operational controls

A single user may be both a member and a guide. Reciprocal support should be represented as two directional relationships.

### Relationship templates

The product should support relationship templates from the start:

- `Active Guide`
- `Passive Guide`
- `Parent`
- `Accountability Partner`

Templates should be transparent, editable, and explain what they allow before creation.

### Multiple guides

Multiple guides per member are first-class. The product should not assume one guide or one household authority figure.

### Parent / child relationships

Parent relationships are special-case templates, not the default model for all relationships.

The intended parent template should support:

- delegated child account creation
- parent invitations for additional parents of the same child
- optional impersonation with clear visual indication
- admin-governed impersonation policy

Once a member turns 18, they should be able to change parent permissions themselves.

### Visibility and privacy

Members should be able to hide specific tracked items from specific guides.

Guides should still know hidden items exist, but should not be shown the hidden items themselves. Guide-visible scoring and status must be calculated only from visible items.

For non-parent guides, the default history model should be future-only. Members may later grant broader access to:

- tracked item history
- retrospective history
- audit and account history

Parents should always have visibility into a child's retrospectives and audit log.

## 5. Core Experience Architecture

The product should separate action-oriented experiences from administrative ones.

### Main product surfaces

- `Dashboard`
- `My Items`
- `Members`
- `Routines`
- `Notifications inbox`

### Administrative surfaces

- profile and account settings
- relationship permissions and visibility settings
- notification preferences
- retrospectives history
- audit log

Notification history belongs in the header `Notifications inbox`. User-level notification and digest configuration belongs under profile and account settings.

The member-facing tracking experience and guide-facing tracking experience should not be identical pages. They should share domain concepts and reusable components, but optimize for different jobs.

## 6. Key User Journeys

The detailed journey narrative lives in [USER_JOURNEYS.md](./USER_JOURNEYS.md). At the design level, the intended journey set is:

1. Create a workspace and invite initial participants
2. Add a member, including child setup where relevant
3. Establish a guide relationship using a transparent template
4. Create recurring and one-time tracked items in a unified flow
5. Work from an occurrence-first member experience
6. Let guides operate from an urgency-first oversight workspace
7. Configure notifications and escalations by relationship and item context
8. Run person-centric digests across multiple timeframes
9. Capture scheduled or manual retrospectives with collaborative discussion
10. Inspect permissions and changes through profile settings and audit history

## 7. Tracking Model

### Items and occurrences

The product should be occurrence-first for action, even though routines remain important for management.

Members should be able to create:

- recurring items
- one-time items

using the same creation flow.

### Core occurrence states

- `upcoming`
- `overdue`
- `complete`
- `skipped`
- `missed`

Rules:

- `overdue` begins after the due time passes
- `missed` happens automatically after a configurable threshold
- the default miss threshold should be none
- any permitted actor may later set the current state to `complete` or `skipped`

`Skipped` should be neutral in scoring.

### Notes

There should be two distinct note types:

- item-instance notes attached to occurrences
- retrospective notes attached to periodic reflection artifacts

Members and active guides should be able to add item-instance notes when permitted. Guide-created notes and actions must be visibly attributed.

## 8. Navigation And UX Direction

### Member view

`My Items` should be occurrence-first, with clear action scopes such as:

- `Now`
- `This Week`
- `All Routines`
- explicit upcoming one-time visibility

The product should not force scope selection before action.

### Guide view

`Members` should be a guide-specific workspace optimized for:

- urgent and overdue work
- escalation visibility
- recent completions and misses
- member trend and context

This should not simply be the member page with extra controls.

### Dashboard

The dashboard should support users who are both members and guides. It should summarize both roles and drill into deeper pages.

## 9. Notifications, Escalations, And Digests

### Notifications

First-class channels should include:

- in-app
- email
- desktop/browser

Users should choose channels during onboarding and be able to revise them later.

In-app and desktop/browser notifications should share acknowledgement state where it makes sense. Notifications should support:

- read/acknowledge
- open item
- quick actions

### Escalations

Escalation should be configurable at:

- relationship level
- category/type level
- individual item level

Members should control whether guides can override escalation settings.

Escalation should:

- notify guides
- change visible item state
- appear in review/retrospective context as text

### Digests

Digests should be person-centric, not item-centric.

Members and guides should configure digest cadence independently while being able to see each other's configuration.

Supported target digest types:

- daily
- weekly
- monthly
- quarterly
- manually generated custom timeframe

Digest structure may vary by timeframe, but the intended baseline is:

- status
- accountability percentage
- trend/supporting detail
- escalations
- retrospectives

## 10. Status, Scoring, And Reporting

### Accountability score

The core accountability signal should be:

- a human-readable status label
- an accountability percentage

The default score model should use equal weighting across occurrences. Reporting and dashboard views should be configurable by the viewer without changing the shared underlying default.

The accountability score should reflect:

- outcomes
- timeliness

Retrospectives should not directly alter the accountability percentage.

### Retrospective scores

Retrospectives should have separate participant-entered 1–10 scores. Each participant can change only their own score. These edits should be audit logged.

## 11. Retrospectives

Retrospectives are a separate product system, not proof-of-completion.

In the product UI, this surface should read as `Looking Back` or cadence-based labels such as `Weekly reflection` rather than exposing the internal retrospective term everywhere.

They should support:

- configurable scheduled retrospectives
- manual retrospectives
- backfilled retrospectives for past scheduled periods

Scheduled reflection cadence should be configured from the member's profile/settings surface, not from the looking-back capture surface itself.

No retrospective artifact should exist if no one added any content.

Each retrospective should contain:

- one primary period summary that can be edited over time to reflect the current shared understanding of how the period went
- an attached discussion log of separate reflective notes that does not overwrite the primary summary

It belongs to the member, but all current participants with access may participate.

## 12. Auditability And Governance

The product should include a first-class audit log with a dedicated page.

The audit log should show:

- what changed
- when it changed
- who changed it
- whether impersonation was involved

Users should be able to filter by dimensions such as user and action type.

Unauthorized actions should not appear as available controls in the UI. The product should prefer absence of controls over visible-but-blocked operations.

### Admin model

The target admin model should use modular RBAC instead of a single monolithic admin role.

Likely default capability bundles:

- workspace admin
- support admin
- policy admin

Admin responsibilities should center on policy, safety, support, and governance rather than automatic access to all personal accountability data.

## 13. Technical Direction

The desired product still fits the current technical direction:

- API-first architecture
- web app as the primary user-facing surface
- shared contracts/types across clients
- optional secondary clients such as CLI and notifier

The architecture should continue to support:

- multiple clients
- relationship-scoped permissions
- real-time or near-real-time state sync
- rich notification routing
- auditability across user-initiated, guide-initiated, and impersonated actions

## 14. Current Implementation Snapshot

The current repository already includes a useful starting point, including:

- local auth and optional OAuth
- first-run admin setup
- tracked item creation with multiple schedule types
- basic guide/admin relationships
- digest preferences
- a CLI and macOS notifier

The current implementation does not yet fully realize the intended north-star relationship, permission, retrospective, scoring, and audit models described above.

## 15. Documentation Map

- Desired journeys: [USER_JOURNEYS.md](./USER_JOURNEYS.md)
- ADRs: [adr/README.md](./adr/README.md)

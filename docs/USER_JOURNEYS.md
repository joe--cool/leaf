# leaf User Journeys

This document is a working north-star product vision for the desired user journeys in `leaf`.

It is intentionally future-facing. It describes the experience we want to support, the relationship model we want to enable, and the principles that should guide product and implementation decisions over time.

## Vision

`leaf` is an accountability system, not just a task tracker.

The product should help a `Member` become more consistent, timely, and transparent, while helping a `Guide` stay informed and effective without having to remember every check-in manually.

The initial wedge is a small household, but the product should generalize to any accountability relationship where one person is tracking commitments and one or more other people are providing support, visibility, or oversight.

## Principles

- Transparency by default. Accountability works best when everyone understands what is visible, what is configurable, and what changed.
- Control belongs to the member. Guides may be granted meaningful powers, but the member should control those powers unless a special relationship or admin policy says otherwise.
- Relationships are directional. Reciprocal support is modeled as two relationships, not one ambiguous shared role.
- Action should be lightweight. Members should be able to act quickly on what matters now.
- Oversight should reduce friction, not add bureaucracy. Guides should get useful visibility and escalation support without turning the product into an approval workflow.
- Privacy should be explicit. Members may hide items from specific guides, but guides should know that hidden items exist.
- Auditability should be built in. Important changes, impersonation, and administrative activity should be visible in a first-class audit trail.

## Core Terms

- `Member`: a user tracking their own commitments, routines, or one-time items
- `Guide`: a user supporting, reviewing, or overseeing a member
- `Active Guide`: a guide who can receive escalations and, if permitted, act operationally
- `Passive Guide`: a guide who primarily receives summaries and visibility, not operational controls

A user may be both a member and a guide. A reciprocal accountability partnership is represented as two directional relationships.

## Relationship Model

### Relationship setup

Either side should be able to initiate a relationship.

Relationship creation should use templates with clear permission explanations and allow later refinement. The initial template set should include:

- `Active Guide`
- `Passive Guide`
- `Parent`
- `Accountability Partner`

The UI should be explicit about what each template allows. Relationship setup should favor clear summaries, inline help, and transparent post-setup editing over hidden permission complexity.

### Multiple guides

Multiple guides per member are first-class from the start.

Guides may be active or passive. Active or passive status should affect what they can do and how they are notified, not just how often they hear from the system.

### Member control

The member should control what powers guides have. Guides should not see options they are not allowed to use.

Recommended relationship permission groups:

- `Can act on items`
- `Can manage routines`
- `Can manage accountability settings`
- `Can impersonate`

These are grouped permissions rather than one broad power and rather than a fully granular permission matrix.

### History visibility

For non-parent guides, the default should be future-only access.

When a new non-parent guide is added, the member should be able to decide whether that guide sees:

- only history from after the relationship begins
- all past history

This rule should apply consistently across:

- item history
- retrospective history
- audit and account activity history

### Hidden items

Members should be able to hide specific tracked items from specific guides.

Guides should be told that some items are hidden from their view, but should not see the identity of those items. The guide-facing score and status for that member should be based only on visible items.

## Parent / Child Model

Parent and child should be a first-class relationship type, but not the only one the product assumes.

Parent relationships should support:

- delegated child account setup
- parent-created invitations for another parent of the same child
- optional impersonation, governed by admin policy
- always-visible impersonation indicators when impersonation is active

Before adulthood, parent access follows the configured relationship and workspace policy. Once a member turns 18, they should be able to change parent permissions themselves.

Parents should always be able to see:

- the child’s audit log
- the child’s retrospectives

## Navigation And Surfaces

The product should separate action-oriented surfaces from administrative ones.

### Main app surfaces

- `Dashboard`: overview across both member and guide roles, with drill-down into the pages below
- `My Items`: the member’s action surface
- `Members`: the guide’s oversight workspace
- `Routines`: the definition and configuration surface for tracked items
- `Notifications inbox`: a unified in-app notification mailbox and history

### Administrative surfaces

- member profile and settings
- relationship settings and permissions
- notification preferences within profile and account settings
- retrospectives history
- audit log

The member tracking view and the guide tracking view should be distinct experiences, even if they share components underneath. The member view should optimize for action and momentum. The guide view should optimize for oversight, urgency, and support.

## Member Journeys

### 1. Join and set up accountability

The first-run experience should support a blended onboarding model:

- one person can create the workspace and invite others
- members can join deliberately through invitation and consent
- parent relationships can support delegated child setup

The initial workspace creator should primarily create the workspace and invite others, not configure every long-term setting up front.

Users should generally only discover people they already have a relationship with. Otherwise, invitation should be email-based.

### 2. Start tracking work

Members should be able to create both recurring routines and one-time items through the same creation flow.

The preferred onboarding path should start with templates, with starting from scratch still available. Template entry should be life-area first, with examples such as:

- school
- medication
- exercise
- chores and responsibilities
- general accountability

Reviewer-proposed or preloaded routines should be supported when the member has granted permission.

### 3. Work from an occurrence-first action surface

`My Items` should be organized around occurrences that need action, not around a library of routine definitions.

The primary scopes should be:

- `Now`
- `This Week`
- `All Routines`
- explicit visibility for upcoming one-time items

Members should not have to choose a scope before taking action.

### 4. Complete, skip, and note occurrences quickly

Members should be able to:

- mark an occurrence complete
- mark an occurrence skipped
- add a note to an occurrence whether or not they complete it

Item-instance notes should be lightweight and editable. Audit logging should record that a change happened, but the product does not need to preserve note diff history.

### 5. Understand personal status transparently

Members should be able to see the same accountability status model that guides see, subject to privacy rules about hidden items from specific guides.

The member should also be able to inspect, guide by guide:

- what each guide can see
- what each guide can do
- what notifications and digests each guide receives

## Guide Journeys

### 6. Review a portfolio of people

The guide should have a dedicated `Members` workspace rather than a copied version of the member action page.

The guide’s workspace should be urgency-first, with:

- member status and trend at the top
- overdue, escalating, and missed items first
- upcoming work next
- recent completions, skips, notes, and retrospectives as supporting context

Passive guides should still have meaningful transparency, but should not have operational controls.

### 7. Support a member without taking over

When allowed, active guides should be able to:

- mark occurrences complete or skipped
- add item-instance notes
- create or manage routines
- configure accountability settings

When a guide acts on behalf of a member, attribution should always be visible.

Guides should only see controls they are allowed to use.

### 8. Respect hidden items while retaining transparency

On a guide-facing member page, guides should see a clear privacy-preserving indicator that some items are hidden when applicable.

Guides should not see titles, categories, or counts of those hidden items. Guide-visible status and scoring should be calculated only from visible data.

## Item And Occurrence Model

Tracked work should be understood through occurrence state, not only through routine definition.

Target occurrence states:

- `upcoming`
- `overdue`
- `complete`
- `skipped`
- `missed`

Rules:

- `overdue` begins after the due time passes
- `missed` is assigned automatically after a configurable threshold
- the default miss threshold should be none
- any user with permission can later set the occurrence’s current state to `complete` or `skipped`

`Skipped` should be neutral in accountability scoring.

The system does not need an item-level state transition log beyond current state. The audit log is responsible for making important changes visible.

## Escalations

Escalation should be configurable at the relationship level and overridable at the category or item level.

Members should control, at the profile level, whether guides can override escalation settings. Any such changes should be visible in audit history.

Escalation should do three things:

- notify one or more guides
- change the item’s visible status
- appear as addendum text in the review and retrospective context

Guide notification preferences should be flexible enough to support patterns like:

- immediate escalation for medication
- no escalation for workouts
- daily escalation for school, except item-level overrides

## Notifications

Notification setup should be part of onboarding, with reasonable templates and the ability to customize later.

First-class channels should include:

- in-app
- email
- desktop/browser

Users should be able to choose one or more channels.

In-app and desktop/browser notifications should share acknowledgement state where it makes sense, so a notification viewed or acknowledged in one place does not continue to look pending in the other.

Notifications should support:

- read and acknowledge
- open item
- quick actions such as complete or skip

Item state and actionable notification state should update in real time across sessions and devices.

## Digests

Digests should be person-centric, not item-centric.

Members and guides should configure digest cadence independently, while still being able to see each other’s digest configuration.

Target digest types:

- daily
- weekly
- monthly
- quarterly
- manually generated custom timeframe

Digest structure may vary by timeframe, but should generally lead with:

- overall status
- accountability percentage
- trend and supporting detail
- escalations
- retrospectives

## Status And Scoring

### Accountability score

The core accountability signal should be:

- a human-readable status label first
- an accountability percentage second

The default score model should use equal weighting across occurrences. Reporting and dashboarding should be configurable per viewer, so different users can view the same member through different lenses without changing the underlying default model.

The accountability percentage should be based on:

- outcomes
- timeliness

Retrospectives should not directly modify the accountability percentage.

### Retrospective score

Retrospective scoring should be separate from accountability scoring.

Within a retrospective, each participant should be able to enter and edit their own 1–10 score. Only that participant should be able to change their score.

Retrospective score changes should appear in the audit log.

## Retrospectives

Retrospectives are not proof-of-completion artifacts. They are scheduled or manual reflection artifacts owned by the member.

In the product UI, this should show up as `Looking Back` or cadence-based labels such as `Weekly reflection`, `Monthly reflection`, or `Daily reflection` rather than repeating the internal retrospective term everywhere.

### Cadence

Retrospectives should support:

- configurable schedules
- manual creation at any time
- backfilled creation for a past scheduled period

The member should configure scheduled reflection cadence from Profile. The Looking Back area should use those defaults rather than owning schedule configuration directly.

If nobody writes anything, there should be no empty retrospective artifact.

### Structure

A retrospective should contain:

- one primary summary for the period that can be edited as the shared picture changes
- an attached discussion log for separate reflective notes and follow-up comments

Anyone with access to that retrospective should be able to participate in the attached discussion.

### Visibility

Retrospectives belong to the member, but participants in the relationship can contribute if they have access.

Rules:

- parents always see all retrospectives
- non-parent guides can be limited to future-only retrospectives or granted access to all retrospectives
- former guides should not retain retrospective access

Retrospectives should be searchable, reviewable in a list, and included in digests.

## Audit Log

The audit log should be a first-class product surface with a dedicated page.

It should capture and expose:

- what changed
- when it changed
- who changed it
- whether impersonation was involved

Users should be able to filter audit history by dimensions such as:

- user
- action type
- related area

Parents should be able to see children’s audit logs. Admin visibility should be governed by role-based permissions.

## Admin Model

The north-star admin model should use modular RBAC rather than a single monolithic admin role.

Default capability bundles may include roles such as:

- workspace admin
- support admin
- policy admin

Admin powers should be shaped around policy, safety, support, and governance rather than default access to every personal routine by virtue of a single title.

## North-Star Journey Set

The desired journey set for the product should include:

1. Create a workspace and invite the first participants
2. Add a member, including delegated child setup when relevant
3. Establish a guide relationship using a transparent template
4. Create recurring and one-time tracked items through a unified flow
5. Work from a `Now` / `This Week` occurrence-first member experience
6. Let active guides support members from a guide-specific oversight surface
7. Configure escalations and notification channels per relationship and item context
8. Use person-centric digests to review status over different timeframes
9. Capture scheduled or manual retrospectives with collaborative discussion
10. Inspect permissions, visibility, and changes through profile settings and audit history

This document should evolve as the product matures, but these journeys define the intended direction.

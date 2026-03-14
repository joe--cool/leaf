# UX Review Backlog

This backlog translates the current docs and UI into a UX-focused implementation sequence.

Primary references:

- `docs/DESIGN.md`
- `docs/USER_JOURNEYS.md`
- `apps/web/src/App.tsx`

Item format:

- Record each new backlog item as a short titled section with:
- one problem statement that ties the gap back to the docs and current implementation
- a `Deliver:` list describing the intended scope of the increment
- a `Review before closing:` list describing the minimum acceptance review
- Size items at the user-journey or surface level: large enough to demo and verify in one pass, but not broken into tiny component tasks.

## Working rules

- Implement one item at a time.
- After an item is completed and validated, remove that item from this document rather than leaving it checked off.
- Run relevant tests after every completed item before closing the work.
- After every iteration, once the changes are signed off, add a UX review note here before moving on to the next iteration.
- Treat each item's `Review before closing` list as the minimum acceptance review.
- Keep first-run demo mode current with shipped UX: if a new surface needs meaningful data, update `apps/api/src/demoSeed.ts`, prefer relative past/future dates, and add or extend tests so the seeded workspace continues to exercise the feature.
- Keep the seeded workspace useful from the original account alone: demo mode should keep exposing member, active-guide, and passive-guide states without forcing user switching just to see core UX.

## What the review found

The current web app proves out account setup, routine creation, basic preferences, and admin mapping, but it does not yet match the intended product experience in the docs.

Main UX gaps:

- The member action surface is still routine-definition-first, not occurrence-first.
- The guide experience does not exist as a dedicated workspace.
- Dashboard content is inventory-oriented instead of role-aware and urgency-aware.
- Relationship setup and permissions are opaque compared with the docs.
- Notifications, digests, and accountability transparency are not first-class surfaces.
- Audit and retrospective history are missing as user-facing product surfaces.

## Notes on sizing

- Each item above is intentionally atomic at the surface level, not at the component level.
- This makes each task large enough to produce a visible UX improvement but small enough to validate in one pass.
- Recommended execution order is the same as the section order in this document.

## Open Items

### Ship a unified item creation flow with templates, one-time items, and better defaults

The docs call for one creation flow for recurring and one-time work, with life-area-first templates. The current `Routines` page is still a builder-heavy configuration form and does not support the intended onboarding path.

Deliver:

- Introduce a unified create flow that starts with a template or scratch path, then branches into recurring or one-time scheduling without leaving the flow.
- Add life-area-first starter templates that map to the documented examples and populate sensible titles, categories, cadence, and reminder defaults.
- Keep advanced schedule editing available, but move it behind progressive disclosure so the common path feels lightweight.

Review before closing:

- A new member can create a useful first tracked item in a few steps without understanding schedule internals.
- One-time work is created through the same flow as recurring work.
- The final item state is still fully editable after creation from the `Routines` surface.

### Make `My Items` a true occurrence-first action workspace

The current member page identifies urgency, but it still routes users back to `Routines` and does not let them actually work the queue from the action surface described in the docs.

Deliver:

- Add real occurrence cards for `Now`, `This Week`, and upcoming one-time work with inline complete, skip, and add-note actions.
- Make occurrence notes editable and visible from the action surface without forcing routine-level navigation.
- Separate routine management from occurrence action so members can stay in momentum mode unless they intentionally switch to configuration.

Review before closing:

- A user can handle their due work entirely from `My Items`.
- Skip and note behavior are visible in the UI and reflected consistently in status, summaries, and history.
- The action surface works with seeded overdue, due-today, and upcoming demo data.

### Turn the guide workspace into a real member review flow instead of summary cards

`Members` now has the right top-level direction, but it is still mostly a dashboard card stack. The docs call for a guide-specific oversight experience with member-level drill-in, attribution, and support workflows.

Deliver:

- Add a member detail flow from the `Members` workspace with urgency-first occurrence review, recent notes, and accountability context for one person.
- Expose only the controls the current guide is allowed to use, including support actions when permitted and observation-only states when not.
- Make guide actions visibly attributed in the member context and in the audit/history surfaces.

Review before closing:

- Guides can move from portfolio view to a focused single-member view without losing urgency context.
- Passive guides never see operational controls.
- Active-guide actions are demoable end to end and visibly attributed afterward.

### Replace the relationship page with editable permissions, visibility, and history controls

`Profile & Relationships` explains the model better than before, but most of the important settings are still descriptive rather than actionable. The docs call for explicit, editable guide-by-guide control.

Deliver:

- Add relationship editing for mode, permission groups, history window, and hidden-item visibility boundaries after a relationship is active.
- Let members inspect guide-by-guide what each person can see, do, and receive, including future-only versus full-history access.
- Clarify parent-specific rules and special visibility behavior without collapsing all relationships into a parent model.

Review before closing:

- A member can change a guide relationship after creation without admin intervention.
- The product clearly distinguishes template defaults from the current saved relationship state.
- Visibility limits remain explicit to both sides after edits.

### Build real notifications, escalations, and digest settings across the product

The current mailbox is a useful mock of the desired shape, but notifications, desktop alerts, and digest behavior are still synthesized in the client rather than configured and delivered as real product systems.

Deliver:

- Add persisted in-app notifications with read state, timestamps, and relationship-aware source events.
- Introduce relationship-level and item-level escalation settings that affect status, guide alerts, and review context.
- Expand notification preferences so members and guides can configure channels and cadence in the way described by the docs, while still seeing shared accountability implications.

Review before closing:

- Inbox state survives refresh and matches backend data.
- An escalation changes both guide visibility and the related item/member context.
- Notification settings are understandable from both member and guide perspectives.

### Turn retrospectives into a real capture and review workflow

The retrospective page currently presents generated summaries, but the docs describe retrospectives as a first-class reflection system with cadence, shared discussion, and visibility rules.

Deliver:

- Add scheduled and manual retrospective creation with clear time windows, audience, and prompts.
- Allow members and permitted guides to contribute retrospective notes in the same artifact instead of only viewing generated rollups.
- Make retrospective visibility consistent with relationship history rules and parent exceptions.

Review before closing:

- A retrospective can be created, revisited, and understood as a distinct artifact rather than a derived card.
- Relationship visibility rules affect which retrospectives appear.
- The demo workspace contains enough seeded history to exercise the workflow.

## Senior Engineer Review Items

### Replace simulated accountability read models with real occurrence and event primitives

Large parts of the UX currently depend on derived client-side summaries and reconstructed history from item/completion tables. That blocks the documented behavior for skipped states, missed states, attribution, real notifications, escalations, and auditability.

Deliver:

- Introduce a first-class occurrence/event model that can represent complete, skipped, missed, note-added, guide-action, escalation, and visibility-relevant changes.
- Persist attribution and timestamps in backend-owned records instead of reconstructing them opportunistically in the frontend.
- Update read models for dashboard, `My Items`, `Members`, audit log, notifications, and retrospectives to consume those primitives.

Review before closing:

- The backend can answer occurrence-first questions without relying on client inference.
- Audit, notification, and retrospective data come from durable event records.
- Existing seeded data and tests are updated to use the new model.

### Align the domain model and API surface with the documented member/guide product model

The codebase still leaks the older reviewer/reviewee framing in schema names, route structure, and normalization helpers, while several documented permission and visibility concepts are not truly modeled server-side.

Deliver:

- Rename or encapsulate reviewer/reviewee internals behind member/guide domain APIs so the product language and code structure stop drifting apart.
- Model the documented permission groups, history windows, relationship templates, and parent-specific rules explicitly in shared contracts.
- Remove frontend-only permission assumptions by making the API authoritative for relationship capabilities and visibility boundaries.

Review before closing:

- Shared types and API payloads read in member/guide terms.
- Relationship capabilities used by the UI are validated and enforced server-side.
- Migration or compatibility steps are documented where naming cannot change immediately.

### Break the monolithic app shell into route-owned data and journey tests

`apps/web/src/App.tsx` still owns too much fetching, derivation, and page orchestration. That makes journey work slower to land, harder to test, and easy to regress as the product grows.

Deliver:

- Move page-specific loading and view-model derivation out of `App.tsx` and into route/page modules or dedicated hooks/services.
- Add integration coverage for the main user journeys: onboarding, item creation, member actioning, guide review, relationship editing, notifications, and retrospectives.
- Tighten API tests around authorization, visibility boundaries, and attributed actions so the UX can trust backend behavior.

Review before closing:

- `App.tsx` is primarily shell and routing logic rather than the main product controller.
- New page behavior can be tested without booting the entire application state machine.
- The highest-risk permission and visibility journeys have backend and frontend coverage.

## UX Review Notes

- 2026-03-14: Replaced the admin-flavored first-run form with workspace setup, added tokenless invite acceptance at `/join/:token` with visible relationship consent details, and routed newly authenticated users through a role-aware welcome step that points them to item creation, guide invitation, or member review while keeping demo mode visibly useful.
- 2026-03-14: Added account-level `Retrospectives` and `Audit Log` surfaces with dedicated navigation, reflective accountability windows for self and guided members, and attributed history for account, relationship, invite, routine, and completion events without collapsing those views into admin tooling.
- 2026-03-14: Added shared accountability status, percentage, and trend summaries across `Overview`, `My Items`, and `Members`, while making guide-visible privacy limits explicit without exposing hidden-item details or counts.
- 2026-03-13: Reworked `Overview` into a role-aware dashboard centered on `Member Actions`, `Guide Attention`, and `Next Review`, with urgent summaries and recent shared completions ahead of background metrics.
- 2026-03-13: Added a dedicated `Members` workspace with guide-only navigation, urgency-ordered member cards, recent activity context, and observation-only states for passive relationships.
- 2026-03-13: Split the old `Tracked Items` surface into `My Items` and `Routines`, moved the member-facing page toward due and upcoming work, and kept routine creation and schedule management on the separate builder page.
- 2026-03-13: Replaced the old invite-and-counts account view with `Profile & Relationships`, including template-led relationship setup, explicit visibility/history explanations, and guide-by-guide permission cards for both incoming and outgoing relationships.
- 2026-03-13: Replaced the standalone `Notifications` page with a header mailbox beside the user menu, including unread badges, an inbox panel, live alerting for new entries, and profile-owned notification preferences.

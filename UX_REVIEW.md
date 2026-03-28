# UX Review Backlog

This backlog translates the current docs and UI into a UX-focused implementation sequence.

Primary references:

- `docs/DESIGN.md`
- `docs/USER_JOURNEYS.md`
- `docs/DEVELOPMENT.md`
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
- Before calling an iteration complete, run the full verification stack expected by `docs/DEVELOPMENT.md`, including complete web, API, and browser-backed coverage where applicable, not just a narrow targeted subset.
- Follow the layered testing expectations in `docs/DEVELOPMENT.md` so logic, API, and browser coverage land in the right place.
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

### Make `Looking Back` cadence settings drive real scheduled reflection timing

`Profile & Relationships` now lets members choose reflection cadence plus a weekly day or monthly day, but the current scheduling logic still behaves like a rolling 1-day, 7-day, or 30-day window. That creates a product mismatch: the UI suggests "same day each week" scheduling, while the code currently only honors the broad cadence type. This should be resolved before more `Looking Back` behavior builds on top of the current approximation.

Deliver:

- Use saved cadence settings to determine when a scheduled reflection is due, including same-day-each-week behavior and month-day behavior where supported.
- Align scheduled reflection date windows and due-state messaging with the configured cadence boundary instead of rolling 7-day or 30-day windows.
- Decide and document how timezone should affect scheduled reflection boundaries so profile settings, due states, and created reflection windows stay consistent.

Review before closing:

- A user who picks a weekly day gets the same day each week in both due-state logic and suggested scheduled reflection windows.
- Monthly scheduling behavior is explicit and consistent with the saved day-of-month rules.
- The resulting behavior is documented clearly enough that users and future implementers do not infer rolling-window logic from the UI.

### Analyze what it would take to enforce "no empty reflection artifact" creation

The docs still say a reflection artifact should not exist unless someone actually writes content, but the current `Looking Back` create flow auto-seeds a default summary and creates the artifact anyway. Before changing that behavior, we need a decision-oriented analysis of the product, API, demo-data, and migration impact so you can decide whether to bring the implementation into conformance now, defer it, or intentionally revise the rule.

Deliver:

- Trace the current create flow for scheduled and manual reflections across web, API, shared contracts, and seeded demo data.
- Identify the minimum product and technical changes required to enforce the no-empty-artifact rule, including whether creation should be blocked until authored content exists or whether draft/uncommitted reflection state is needed.
- Present the decision points and tradeoffs clearly enough to choose between implementation change, scoped deferral, or doc-rule revision.
- Recommend where this work belongs in the backlog relative to the remaining `Looking Back`, action-surface, and occurrence-model items.

Review before closing:

- The analysis names the specific files, routes, and user journeys that would need to change.
- The recommendation states whether this should be a near-term UX item or should wait for the occurrence/event-model work.
- The outcome is concrete enough that you can make a product decision without re-discovering the problem.

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

- 2026-03-27: Replaced the builder-first `Routines` form with a unified tracked-item flow that starts from life-area templates or scratch, branches into recurring versus one-time setup in place, keeps advanced scheduling/reminders behind disclosure, and adds in-surface item editing backed by a real `PUT /items/:id` update path.
- 2026-03-14: Replaced the admin-flavored first-run form with workspace setup, added tokenless invite acceptance at `/join/:token` with visible relationship consent details, and routed newly authenticated users through a role-aware welcome step that points them to item creation, guide invitation, or member review while keeping demo mode visibly useful.
- 2026-03-14: Added account-level `Looking Back` and `Audit Log` surfaces with dedicated navigation, reflective accountability windows for self and guided members, and attributed history for account, relationship, invite, routine, and completion events without collapsing those views into admin tooling.
- 2026-03-14: Replaced generated retrospective rollups with durable looking-back artifacts, added scheduled/manual creation, an editable period summary plus separate reflective notes, enforced history-window-based guide visibility for older reflections, and extended demo mode with seeded reflections that exercise the workflow immediately.
- 2026-03-14: Moved scheduled reflection cadence into `Profile & Relationships`, added onboarding guidance that points new users back to Profile for cadence setup, and kept `Looking Back` focused on capturing and reviewing reflections rather than configuring them.
- 2026-03-14: Added shared accountability status, percentage, and trend summaries across `Overview`, `My Items`, and `Members`, while making guide-visible privacy limits explicit without exposing hidden-item details or counts.
- 2026-03-13: Reworked `Overview` into a role-aware dashboard centered on `Member Actions`, `Guide Attention`, and `Next Review`, with urgent summaries and recent shared completions ahead of background metrics.
- 2026-03-13: Added a dedicated `Members` workspace with guide-only navigation, urgency-ordered member cards, recent activity context, and observation-only states for passive relationships.
- 2026-03-13: Split the old `Tracked Items` surface into `My Items` and `Routines`, moved the member-facing page toward due and upcoming work, and kept routine creation and schedule management on the separate builder page.
- 2026-03-13: Replaced the old invite-and-counts account view with `Profile & Relationships`, including template-led relationship setup, explicit visibility/history explanations, and guide-by-guide permission cards for both incoming and outgoing relationships.
- 2026-03-13: Replaced the standalone `Notifications` page with a header mailbox beside the user menu, including unread badges, an inbox panel, live alerting for new entries, and profile-owned notification preferences.

# UX Review Backlog

This backlog translates the current docs and UI into a UX-focused implementation sequence.

Primary references:

- `docs/DESIGN.md`
- `docs/USER_JOURNEYS.md`
- `apps/web/src/App.tsx`

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

## Recommended implementation order

### Introduce a first-class `Notifications` surface

Why:

- The docs define notifications as a main app surface, not only per-item reminder toggles.
- Current notification UX is limited to routine-level reminder settings and weekly digest preferences.

Root-level scope:

- Add a unified notifications page and navigation entry.
- Separate in-app notification history from notification preferences.
- Expose digest cadence and channel settings in a way that matches member and guide roles.

Review before closing:

- Check that notification history and notification settings are clearly distinct.
- Check that the page explains channels, cadence, and acknowledgement behavior in product language.
- Check that member and guide notification choices are understandable without reading docs.
- Check that the page still works when a user has no notifications yet.

Validation:

- A user can review notifications in one place.
- A user can understand and change how they are notified without editing a routine.

### Add accountability status, scoring, and hidden-item transparency

Why:

- The docs repeatedly reference accountability status, percentage scoring, trends, and privacy-preserving hidden-item indicators.
- The current UI shows counts and categories, but not status quality or transparent visibility boundaries.

Root-level scope:

- Introduce shared status components for labels, percentages, and trend summaries.
- Add hidden-item disclosure patterns for guide-facing views.
- Use the same accountability language across dashboard, member, and guide surfaces.

Review before closing:

- Check that status labels and percentages are consistent across all touched surfaces.
- Check that the meaning of `complete`, `skipped`, `missed`, and related accountability signals is understandable in context.
- Check that guide views disclose privacy limits without leaking hidden-item details.
- Check that status presentation supports fast scanning rather than forcing detailed reading.

Validation:

- Status is visible and understandable across key surfaces.
- Guide views make privacy limits explicit without leaking hidden-item details.

### Add user-facing `Retrospectives` and `Audit Log` surfaces

Why:

- Both are called out as administrative surfaces in the docs.
- Important transparency and governance expectations depend on these views existing.

Root-level scope:

- Add routes and navigation for retrospectives history and audit history.
- Surface attributed actions, relationship changes, and major account events.
- Keep these distinct from workspace admin functions.

Review before closing:

- Check that retrospectives and audit history are clearly different concepts in the UI.
- Check that attributed actions, relationship changes, and major events are legible and scannable.
- Check that these pages support transparency without feeling like raw admin logs.
- Check that navigation placement makes sense relative to profile, relationships, and admin.

Validation:

- A user can review past changes and accountability history without leaving the product.
- Guide, member, and parent transparency expectations have visible product support.

## Notes on sizing

- Each item above is intentionally atomic at the surface level, not at the component level.
- This makes each task large enough to produce a visible UX improvement but small enough to validate in one pass.
- Recommended execution order is the same as the section order in this document.

## UX Review Notes

- 2026-03-13: Reworked `Overview` into a role-aware dashboard centered on `Member Actions`, `Guide Attention`, and `Next Review`, with urgent summaries and recent shared completions ahead of background metrics.
- 2026-03-13: Added a dedicated `Reviewees` workspace with guide-only navigation, urgency-ordered member cards, recent activity context, and observation-only states for passive relationships.
- 2026-03-13: Split the old `Tracked Items` surface into `My Items` and `Routines`, moved the member-facing page toward due and upcoming work, and kept routine creation and schedule management on the separate builder page.
- 2026-03-13: Replaced the old invite-and-counts account view with `Profile & Relationships`, including template-led relationship setup, explicit visibility/history explanations, and guide-by-guide permission cards for both incoming and outgoing relationships.

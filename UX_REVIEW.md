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

### Split member work into `My Items` and `Routines`

Why:

- The docs call for `My Items` as the member action surface and `Routines` as the management surface.
- The current `Tracked Items` page mixes creation, schedule definition, reminder settings, preview, and list management into one page.

Root-level scope:

- Update navigation labels and route structure to expose both surfaces.
- Move occurrence/action UX into `My Items`.
- Keep routine definition and editing in `Routines`.

Review before closing:

- Check that labels, headings, and navigation consistently use `My Items` and `Routines` instead of the old mixed terminology.
- Check that the member action page is centered on due or actionable work, not routine configuration.
- Check that routine creation and management still work cleanly from the separate `Routines` page.
- Check that direct routing, navigation state, and empty states make sense on both pages.

Validation:

- A member can act on what is due now without entering the routine builder.
- A member can still create and edit routines from a separate management page.

### Create a dedicated `Reviewees` workspace for guides

Why:

- The docs explicitly say the guide experience should not be a copy of the member page.
- The current app only shows relationship counts and names, with no urgency-first oversight flow.

Root-level scope:

- Add a `Reviewees` route and navigation entry.
- Show per-member status cards with overdue, missed, upcoming, and recent activity signals.
- Hide operational controls unless the current relationship permits them.

Review before closing:

- Check that the page reads like a guide workspace rather than a renamed member page.
- Check that urgency ordering is visible and understandable without extra explanation.
- Check that passive or restricted guide states do not expose inappropriate controls.
- Check that empty and low-data states still explain what a guide should do next.

Validation:

- A guide can identify who needs attention first from one page.
- The page is meaningfully different from the member action surface.

### Redesign `Overview` into a role-aware dashboard

Why:

- The docs expect a dashboard that supports users who are both members and guides.
- The current dashboard mostly summarizes routine counts and relationship totals.

Root-level scope:

- Rework dashboard modules around `member actions`, `guide attention`, and `next review`.
- Surface urgent work, recent completions, and digest timing in a clearer hierarchy.
- Treat dual-role users as a first-class case.

Review before closing:

- Check that the first screen answers "what needs my attention now?" before showing background metrics.
- Check that both member and guide responsibilities are represented when a user has both roles.
- Check that visual hierarchy favors urgent and recent information over static counts.
- Check that dashboard modules link cleanly into the deeper pages they summarize.

Validation:

- A user can tell what needs action next in each role within one screen.
- The dashboard is useful even when the user is both a member and a guide.

### Replace basic invite settings with relationship setup and transparency

Why:

- The docs require relationship templates, permission summaries, and clear visibility rules.
- The current `Preferences` page only offers invite email, digest settings, and relationship counts.

Root-level scope:

- Add relationship creation flows using template choices such as `Active Guide`, `Passive Guide`, `Parent`, and `Accountability Partner`.
- Show what each guide can see, do, and receive.
- Add visibility/privacy explanations in the UI rather than leaving them implicit.

Review before closing:

- Check that each relationship template explains permissions in plain language before selection.
- Check that a member can inspect relationship capabilities after setup without guessing.
- Check that invite, relationship, and visibility language is consistent across pages.
- Check that privacy explanations are explicit where hidden-item or history rules matter.

Validation:

- A user can understand a relationship before creating it.
- A member can inspect guide-by-guide permissions after setup.

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

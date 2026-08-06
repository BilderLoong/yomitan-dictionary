# Ticket tracker

Local ask-matt tracker. Migrated from `TODO.md` and `PROJECT_NOTES.md` on
2026-08-06; split into feature buckets the same day. Work the frontier: any
ticket whose blockers are done can be grabbed.

## mwu-source-research — source evidence (HTML classes, markers, shapes)

| # | Ticket | Blocked by |
|---|---|---|
| 01 | classify-unknown-html-classes | None — can start immediately |
| 02 | audit-superscript-shapes | None — can start immediately |
| 03 | audit-line-break-shapes | None — can start immediately |
| 04 | settle-presentation-questions | None — can start immediately |
| 05 | investigate-media-and-dynamic-markers | None — can start immediately |
| 06 | validate-v-phr-acceptance | None — can start immediately |
| 07 | information-loss-detection | None — can start immediately |

## mwu-implementation — planning, rules, tooling

| # | Ticket | Blocked by |
|---|---|---|
| 01 | cxl-ref-variant-reference-soft-link | User decision (deferred 2026-08-06) |
| 02 | tag-generation-rules | None — can start immediately |
| 03 | survey-inspector-design | None — can start immediately |

## Resolved during migration

- "Is there any way to test the final render result?" — answered in TODO.md
  itself: the existing E2E import loop (`inspect:dict`). Not a ticket.
- TODO.md's broken relative link to the design-fixture status doc — dropped
  with the file; the doc remains at `docs/2026-08-03-design-fixture-status.md`.
- Production-builder implementation work is tracked in the archived
  first-slice OpenSpec change, not re-ticketed here.

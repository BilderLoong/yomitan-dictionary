# Ticket tracker

Local ask-matt tracker. Migrated from `TODO.md` and `PROJECT_NOTES.md` on
2026-08-06; split into feature buckets the same day. Work the frontier: any
ticket whose blockers are done can be grabbed.

## mwu-source-research — source evidence (HTML classes, markers, shapes)

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | classify-unknown-html-classes | None | resolved 2026-08-07 |
| 02 | audit-superscript-shapes | None | resolved 2026-08-07 |
| 03 | audit-line-break-shapes | None | resolved 2026-08-07 |
| 04 | settle-presentation-questions | None | resolved 2026-08-07 |
| 05 | investigate-media-and-dynamic-markers | None | resolved 2026-08-07 |
| 06 | validate-v-phr-acceptance | None | resolved 2026-08-07 |
| 07 | information-loss-detection | None | resolved 2026-08-07 |
| 08 | cxl-ref-relation-phrase-inventory | None | resolved 2026-08-13 (research; policy accepted via ADR 0006) |

## mwu-implementation — planning, rules, tooling

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | cxl-ref-variant-reference-soft-link | User decision — un-deferred 2026-08-07 by blanket overnight delegation (review when back) | resolved 2026-08-07 |
| 02 | tag-generation-rules | None | resolved 2026-08-07 (ADR 0005) |
| 03 | survey-inspector-design | None | resolved 2026-08-07 |
| 05 | accept-all-cxl-ref-relations | None | implemented 2026-08-13 (8 tracer bullets; ADR 0006) |

## cxl-ref-soft-links — implementation tracer bullets

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | emit-complete-cxl-relations | None | resolved 2026-08-13 |
| 02 | render-clean-relation-references | None | resolved 2026-08-13 |
| 03 | process-every-cxl-target | 01 | resolved 2026-08-13 |
| 04 | inherit-continuation-relations | 03 | resolved 2026-08-13 |
| 05 | resolve-alternate-collisions | 01 | resolved 2026-08-13 |
| 06 | report-cxl-outcomes | 03, 04 | resolved 2026-08-13 |
| 07 | record-accepted-cxl-policy | 02, 04, 05, 06 | resolved 2026-08-13 |
| 08 | prove-complete-cxl-policy | 07 | resolved 2026-08-13 |

All eight tracer bullets resolved 2026-08-13 (implementation complete; smoke-tested in Yomitan).

## Resolved during migration

- "Is there any way to test the final render result?" — answered in TODO.md
  itself: the existing E2E import loop (`inspect:dict`). Not a ticket.
- TODO.md's broken relative link to the design-fixture status doc — dropped
  with the file; the doc remains at `docs/2026-08-03-design-fixture-status.md`.
- Production-builder implementation work is tracked in the archived
  first-slice OpenSpec change, not re-ticketed here.

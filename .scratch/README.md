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

## mwu-implementation — planning, rules, tooling

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | cxl-ref-variant-reference-soft-link | User decision — un-deferred 2026-08-07 by blanket overnight delegation (review when back) | resolved 2026-08-07 |
| 02 | tag-generation-rules | None | resolved 2026-08-07 (ADR 0005) |
| 03 | survey-inspector-design | None | resolved 2026-08-07 |
| 05 | fixed-dynamic-functional-label-tag-metadata | None | resolved 2026-08-13 |

## mwu-functional-label-tags — fixed and dynamic Yomitan tag metadata

Parent specification: `mwu-implementation` issue 05.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | enforce-owner-local-functional-label-scope | None | resolved 2026-08-13 |
| 02 | emit-complete-fixed-functional-label-tag-bank | 01 | resolved 2026-08-13 |
| 03 | add-current-database-functional-label-inventory-audit | 02 | resolved 2026-08-13 |
| 04 | preserve-unknown-functional-labels-as-dynamic-tags | 02 | resolved 2026-08-13 |
| 05 | aggregate-and-stabilize-functional-label-build-output | 03, 04 | resolved 2026-08-13 |
| 06 | verify-rendered-tags-and-synchronize-project-decisions | 05 | resolved 2026-08-13 |

## mwu-ui-optimization — structured-content presentation

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | make-local-tags-match-host-ui | None | completed |
| 02 | clarify-structured-entry-header | 01 | completed |
| 03 | improve-definition-reading-path | 01 | completed |
| 04 | unify-phrase-flow-and-disclosure-hierarchy | 03 | completed |

## Resolved during migration

- "Is there any way to test the final render result?" — answered in TODO.md
  itself: the existing E2E import loop (`inspect:dict`). Not a ticket.
- TODO.md's broken relative link to the design-fixture status doc — dropped
  with the file; the doc remains at `docs/2026-08-03-design-fixture-status.md`.
- Production-builder implementation work is tracked in the archived
  first-slice OpenSpec change, not re-ticketed here.

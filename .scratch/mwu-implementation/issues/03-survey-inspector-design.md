# 03 — Design the repeatable survey inspector

**What to build:** A read-only survey tool that inspects one source word and
reports its DOM structure in survey vocabulary — DOM paths, class tokens,
ownership candidates, parser status — plus an inventory mode that reports
structure/class coverage and example word names. Unknown or unrecognized HTML
is reported, never silently discarded.

**Blocked by:** None — can start immediately

**Status:** resolved — 2026-08-07 on `worktree-1`; shipped as
`bun run survey:inspect --words <words...>` (`tests/survey_inspector.ts` +
`src/survey/inspector.ts` + `src/survey/catalog.ts`).

- [x] Two modes supported: inspect one word (DOM paths, class tokens,
      ownership candidates, parser status) and inventory (structure/class
      coverage, example word names)
- [x] Output follows the survey's three-section contract: interesting
      information / not needed / not yet noticed-or-recognized
- [x] Unknown or unrecognized HTML is reported with its owner and level,
      never silently discarded
- [x] Read-only: emits no Yomitan entries and never mutates the source
      database
- [x] Reuses the living survey's information-unit vocabulary and ownership
      rule (nearest semantic owner)

## Implementation notes (2026-08-07)

- `inspectWordHtml(word, rowId, html)` walks every element and emits one
  `SurveyFinding` per classified element with the survey contract fields:
  word, informationName, unitLevel, boundTo (nearest semantic owner),
  sourceSelectorOrTag (tag + full class tokens), ownerPath (DOM path up to
  the nearest semantic container), parserStatus, findingSection, notes.
- `src/survey/catalog.ts` maps every class token from the living survey
  catalog (including the 2026-08-07 additions: `.pn` → called-also-number,
  `.l` → pronunciation-note, `.mw_t_a_link`/`.mw_t_i_link`/`.iw` →
  cross-reference, `.illustrations`/`.caption`/`.table-image`/
  `.table-section`/`.date` media units) to its unit and level; presentation
  wrappers go to `notNeeded`; unknown tags report as
  `unclassified-visible-content` with `unrecognized` status and their owner
  — never dropped.
- Ownership uses the nearest semantic container rule (mean/.dro/.vg/.sb/.dt/
  .un/...): the `boundTo` field is the nearest semantic owner and `unitLevel`
  is derived from the owner chain, mirroring the survey README.
- `buildInventory(surveys)` aggregates per-selector unit/status/section,
  row counts, and example word names; unknown selectors are listed explicitly
  at the end of the run and in `build/survey-inventory.json`.
- Read-only: the DB is opened `readonly`; the tool writes only the JSON
  report under `build/` and never emits Yomitan entries.
- Smoke-tested on what/o/take/set/hand: all elements classified, zero
  unknown selectors on those rows.

## How to find these examples

From `packages/merriam_webster_unabridged`:

```
bun run survey:inspect --words what o take set hand
```

Real output for `what` (row 464223) — three-section contract:

```
=== what (row 464223) ===
interesting: 1181 | notNeeded: 267 | notYetNoticed: 0
[interesting] headword-display L1 @ h1.hword → mean
[interesting] part-of-speech L1 @ span.fl → mean
[interesting] sense-number L3 @ span.sn.sense-1.a.(1) → div.sense.has-sn
[interesting] example-sentence L6 @ span.ex-sent.t.no-aq.sents.sents-block → span.ex-sent-group
[notNeeded] presentation L4 @ span.sb-0 → div.sb
```

Inventory aggregates into `build/survey-inventory.json`; example entries:

```
jq -c '.inventory.entries[] | select(.unit=="target-highlight") | {selector, rows: .rowCount, words: .exampleWords[0:3]}' build/survey-inventory.json
# {"selector":"span.mw_t_wi","rows":840,"words":["take","set","hand"]}
# {"selector":"span.mw_t_sp","rows":329,"words":["take","set","hand"]}
```

Unknown selectors are listed explicitly at the end of every run (and in the report) with their owner — never silently discarded. Code: `src/survey/inspector.ts` (walk + classify + ownership), `src/survey/catalog.ts` (class→unit map mirroring the living survey), runner `tests/survey_inspector.ts`.

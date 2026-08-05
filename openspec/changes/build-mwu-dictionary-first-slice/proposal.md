## Why

The repository has an older automatic builder and a large hand-authored design
fixture, but neither is the production contract for the first implementation.
The old builder assumes too much correspondence between one SQLite row and one
Yomitan term, while the fixture contains provisional presentation choices that
must remain free to change.

The first production version should solve the smaller, foundational problem:
given explicit target words, decide which canonical entries and searchable
relationships exist, ensure every link has a canonical target, and export an
importable dictionary with inspectable diagnostics.

## What Changes

- Replace the old build entry point and flags with a selection-only CLI:
  `--words <word...>` for one or more shell arguments and
  `--words-file <path>` for a newline-delimited file. The two sources may be
  combined. There is no stdin or implicit full-database mode.
- Add a deterministic source-key index and Level 1 planner for
  `main-canonical-entry`, `alternative-spelling-canonical-entry`,
  `drp-phrase-canonical-entry`, `main-to-alternative-spelling-soft-link`,
  `vr-mean-alternate-soft-link`, `phrase-alternate-soft-link`,
  `bare-affix-soft-link`, and dedicated dependency rows.
- Treat the old builder types and flattened parsing assumptions as replaceable.
  No compatibility adapter or fallback path is required.
- Convert each planned canonical owner into valid, readable Yomitan structured
  content using a conservative first-version renderer. Preserve useful visible
  definition text and report unsupported structure without claiming the final
  Level 1-6 presentation design.
- Assemble canonical records and dictionary-deinflection soft-link records,
  emit a deterministic `build-report.json`, validate the archive schema, and
  export an importable Yomitan ZIP.
- Make the seven Level 1 behavior families explicit, isolated test contracts
  with positive cases, negative cases, evidence retention, deduplication, and
  dependency-failure coverage.
- Keep the eleven researched source families as regression and acceptance
  evidence, not as hardcoded CLI input or the only words the builder accepts.
- Reclassify the 136-record hand-authored fixture as provisional reference
  evidence. It is not a source of truth, production snapshot, required record
  count, or final visual contract.

## Capabilities

### New Capabilities

- `mwu-level-1-entry-generation`: Decide canonical ownership, searchable
  identity, approved soft-link-entry relationships, deduplication, and selected-build
  dependency closure.
- `mwu-entry-conversion`: Extract readable first-version definition content for
  one planned canonical owner while retaining source identity and reporting
  unsupported structure.
- `mwu-dictionary-build`: Accept explicitly requested words, assemble canonical
  and soft-link records, write the build report, export the deterministic ZIP,
  and verify the selected build.

### Modified Capabilities

None.

## Impact

- Affects `packages/merriam_webster_unabridged`, especially the CLI, SQLite
  selection, source-key decoding, Level 1 planning, minimal conversion, record
  assembly, reporting, export, and tests.
- Reuses the existing SQLite, Cheerio, Commander, and
  `yomichan-dict-builder` dependencies; no new runtime dependency is expected.
- May replace or remove `src/index.ts`, `SenseNode`, `TermEntryData`, the old
  `--limit`/`--additional-words-list-file` interface, and conversion code that
  conflicts with the approved first-version design.
- Does not implement a full-database build, stdin input, the final Level 1-6
  semantic renderer, final visual styling, a final tag bank, pronunciation
  audio, First Known Use, or unsurveyed media support.

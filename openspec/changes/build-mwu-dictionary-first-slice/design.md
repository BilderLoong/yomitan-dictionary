## Context

The repository currently has two useful but non-authoritative artifacts:

- an older automatic builder that reads `word(id, w, m)`, parses a limited
  sense tree, and exports a ZIP;
- a 136-record hand-authored Yomitan fixture that demonstrates researched
  source relationships and possible presentation choices.

Neither constrains the first production implementation. The old builder may be
replaced rather than adapted. The fixture remains useful evidence, but it is
incomplete and its visual and structural decisions may change.

The approved Level 1 ownership document remains the semantic authority for
which canonical entries and soft links exist. The living HTML survey remains
the evidence catalog. This change implements only the first dependable vertical
slice: explicit word selection, Level 1 planning, conservative readable
definitions, record assembly, reporting, and ZIP export.

## Goals / Non-Goals

**Goals:**

- Build only words explicitly supplied through `--words` and/or
  `--words-file`.
- Correctly plan `main-canonical-entry`,
  `alternative-spelling-canonical-entry`, `drp-phrase-canonical-entry`,
  `main-to-alternative-spelling-soft-link`, `vr-mean-alternate-soft-link`,
  `phrase-alternate-soft-link`, `bare-affix-soft-link`, and dedicated
  dependency rows.
- Ensure every emitted soft link resolves to at least one canonical spelling
  present in the generated archive.
- Produce valid, readable structured definitions without claiming the final
  six-level presentation design.
- Keep identity planning, dependency closure, conversion, record assembly, and
  report generation pure, immutable, deterministic, and independently tested.
- Emit a deterministic build report and importable Yomitan ZIP.
- Replace obsolete implementation assumptions directly, without a compatibility
  layer.

**Non-goals:**

- Reading target words from stdin.
- Building every row or providing an implicit full-database mode.
- Completing the final Level 1-6 semantic model and visual renderer.
- Matching the hand-authored fixture's structure, styles, or 136-record count.
- Treating the eleven researched source families as a hardcoded build list.
- Generating the final tag bank, audio, First Known Use, images, or tables.
- Emitting entries from raw `alt` rows or unapproved relationship shapes.

## Command-Line Contract

The production command accepts two optional selection sources:

```text
bun run src/index.ts --words give in "take the word"
bun run src/index.ts --words-file words.txt
bun run src/index.ts --words give in --words-file words.txt
```

`--words <word...>` accepts one or more shell arguments. A multiword term must
be quoted so it remains one argument. `--words-file <path>` reads one target per
line. The file and flag sources may be combined.

Input normalization is intentionally small:

- trim leading and trailing whitespace from each supplied value;
- ignore blank file lines;
- retain case, punctuation, internal spaces, hyphens, and diacritics;
- deduplicate exact Unicode target spellings while retaining first-seen order.

If neither option supplies a nonblank target, the command prints usage and
exits unsuccessfully. A missing or unreadable file is fatal. The old `--limit`
and `--additional-words-list-file` options are removed. The command never falls
back to an unbounded database scan.

Target words name requested roots. Dedicated rows discovered through approved
relationships are loaded automatically as dependencies and are distinguished
from roots in the report.

## System Shape

```text
--words / --words-file
          |
          v
1. CLI selection adapter
   exact ordered root spellings
          |
          v
2. Source-row index and Level 1 planner
   canonical entries, soft links, dependencies
          |
          v
3. Conservative canonical conversion
   readable owner-local structured definitions
          |
          v
4. Record assembly and report generation
   canonical records, soft-link records, build-report.json
          |
          v
5. Schema validation and ZIP export
```

SQLite reads, CLI parsing, file reads, report writes, and ZIP export remain at
the edges. The planner, converter, assembler, and report model receive plain
data and return new values without mutating their inputs.

## Stage 1: Source Selection and Level 1 Planning

The source adapter builds a lightweight deterministic index of row IDs and
decoded `word.w` keys. It does not parse every `word.m` HTML payload.

For the requested roots and discovered dependencies, the planner applies the
approved ownership rules:

1. a local `<mean>` matching the current row owns a `main-canonical-entry`;
2. a different local `<mean>` with no dedicated row owns an embedded canonical
   lexical entry;
3. a different local `<mean>` with a dedicated row defers canonical ownership
   to that row and does not copy its definition;
4. every definition-bearing `.drp` phrase owns a canonical phrase entry while
   remaining related to its parent;
5. only approved main-to-alternative-spelling, VR mean alternate, phrase
   alternate, and bare-affix evidence
   creates soft links;
6. dedicated target rows are added transitively until every link resolves.

Canonical identity and soft-link identity are separate. Canonical records with
the same searchable spelling are not merged. Exact soft-link routes are
deduplicated only by lookup spelling, target spelling, and effective rule chain
while retaining every evidence occurrence in the report.

## Stage 2: Conservative Canonical Conversion

The first version does not attempt the final six-level semantic presentation.
It converts only source structures that Stage 1 has already identified as
canonical owners.

For each canonical entry plan, conversion SHALL:

- retain the canonical searchable spelling and source identity supplied by the
  planner;
- extract readable visible definition content from that owner's own
  definition-bearing subtree, not from a neighboring `<mean>` or phrase;
- preserve useful text order and basic block boundaries in supported Yomitan
  structured-content nodes;
- retain useful visible link text while discarding GoldenDict-only navigation
  targets;
- leave the Yomitan reading field empty;
- preserve unsupported but visible content once as neutral fallback rather
  than silently dropping it;
- record conversion findings without claiming complete or lossless semantic
  coverage.

The converter does not implement final example collapsing, origin sections,
six-level numbering, global tags, or final styling in this version. Those are
future conversion work built on top of the verified Level 1 pipeline.

## Stage 3: Record Assembly and Build Reporting

The assembler emits:

- one structured-content term record for every successfully converted canonical
  plan;
- one dictionary-deinflection record for every serialized `soft-link-entry` plan;
- no copied canonical definition inside a soft-link record;
- deterministic ordering with direct canonical results before soft links for
  the same lookup spelling.

The deterministic `build-report.json` records:

- CLI roots in effective order and whether each came from `--words` or the
  words file;
- loaded rows, dedicated dependencies, and dependency reasons;
- every independent `<mean>` ownership decision;
- canonical entry and soft-link-entry plans;
- every serialized or reused soft-link route and all retained evidence;
- alternative-local qualifiers and definition-like evidence;
- rejected identities, missing roots or dependencies, conversion findings, and
  fatal errors;
- output record totals and archive path.

The build writes a successful ZIP only when every requested root is readable,
every required canonical owner is available, every emitted soft link resolves,
and every emitted record satisfies the supported Yomitan schema.

## Test Design

Tests are organized around domain behavior rather than the old function names
or the hand-authored term bank. Small explicit row/HTML fixtures exercise pure
planning functions. Tests inspect plans and diagnostics directly instead of
using one large output snapshot.

Every Level 1 family has focused positive, negative, evidence, and
deduplication coverage:

1. **Canonical lexical entries:** Cases 1/2/3, separate same-spelling means,
   conservative searchable identity, and missing identity.
2. **Canonical defined phrases:** one independent phrase plan, parent
   retention, adjacent phrase boundaries, and example-only/undefined-run-on
   negatives.
3. **Source-row soft links:** Case 2 and Case 3 routes, empty rule chains,
   retained evidence, and no definition copying.
4. **Mean-local alternate links:** correct local target, qualifier and metadata
   retention, and rejection when local content establishes a distinct meaning.
5. **Phrase-local alternate links:** correct phrase owner, `alternative` rule,
   qualifier retention, and no definition copying.
6. **Bare-affix aliases:** confirmed prefix/suffix/infix/marked-alternate cases,
   ordinary-hyphen negatives, exact route reuse, and evidence retention.
7. **Dedicated dependency rows:** transitive closure, repeated dependencies,
   cycles, missing owners, deterministic row-ID deduplication, and root versus
   dependency reporting.

Separate integration tests cover:

- `--words` only, `--words-file` only, and combined selection;
- quoted multiword arguments, blank lines, exact deduplication, and stable
  first-seen ordering;
- no-input, unreadable-file, missing-root, and missing-dependency failures;
- deterministic report and semantic term-bank output across repeated builds;
- supported index/term-bank schemas and absence of dangling links;
- browser import and representative lookup smoke tests.

The hand-authored fixture may provide individual examples for regression tests,
but its full JSON, styling, and record count are not acceptance oracles.

## Error Handling

Expected source variation is represented as explicit result data.

- No input, unreadable input files, missing roots, missing canonical
  dependencies, absent lexical identity, empty canonical definitions, schema
  violations, database failures, and ZIP failures are fatal.
- A fatal attempt writes `build-report.json` when possible and does not publish
  a successful ZIP.
- Unsupported visible content becomes one neutral fallback plus one finding; it
  is not silently discarded and does not fail an otherwise readable entry.
- I/O failures remain at the adapter boundary and are never swallowed.

## Implementation Sequence

1. Replace the CLI contract and add selection tests.
2. Implement the lightweight source-row index.
3. Implement the seven Level 1 behavior families test-first.
4. Implement conservative canonical definition conversion.
5. Implement Yomitan record assembly and deterministic reporting.
6. Add SQLite/file/ZIP adapters and end-to-end CLI tests.
7. Validate deterministic output, schemas, browser import, and representative
   searches.
8. Remove old code directly superseded by the verified path and update the
   research documents with observed production behavior.

The old builder remains available only until the new path proves the selected
build end to end. It is then removed rather than retained as a fallback.

## Deferred Work

- the complete Level 1-6 semantic model and polished structured-content
  renderer;
- final design-fixture replacement or redesign;
- full-database selection and performance work;
- final tag-bank promotion and `.sgram` policy;
- pronunciation audio, First Known Use, images, tables, and other media;
- unapproved raw `alt`, cross-reference-only, and derivative entry shapes;
- complete `v_phr` inference and presentation acceptance beyond smoke evidence.

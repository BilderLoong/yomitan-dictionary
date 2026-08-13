# MWU Dictionary Build

## Purpose

Build deterministic selected-word Merriam-Webster Unabridged dictionaries with closed canonical dependencies and valid Yomitan archives.

## Requirements

### Requirement: Build only explicitly requested words

The production CLI SHALL accept target words through `--words <word...>` and
an optional newline-delimited `--words-file <path>`. It SHALL combine both
sources, trim boundary whitespace, ignore blank file lines, deduplicate exact
Unicode spellings, and preserve first-seen order. It SHALL NOT read target
words from stdin or fall back to an implicit full-database build.

#### Scenario: Multiple flag words

- **WHEN** the command runs with `--words give in "take the word"`
- **THEN** the requested roots are `give`, `in`, and `take the word` in that
  order

#### Scenario: Words file

- **WHEN** a readable words file contains one target per line with blank lines
  and boundary whitespace
- **THEN** nonblank trimmed targets are selected in file order

#### Scenario: Combined and deduplicated selection

- **WHEN** the same exact spelling occurs in `--words` and the words file
- **THEN** it is planned once at its first occurrence while distinct case,
  punctuation, spacing, hyphens, and diacritics remain distinct

#### Scenario: No selected words

- **WHEN** neither option supplies a nonblank target
- **THEN** the command prints usage, exits unsuccessfully, and does not scan or
  export the full database

#### Scenario: Unreadable words file

- **WHEN** `--words-file` cannot be read
- **THEN** the build reports the file error and does not publish a successful
  ZIP

### Requirement: Resolve selected roots and canonical dependencies

The builder SHALL resolve each requested target through the deterministic
decoded source-row index, load its HTML on demand, and add every dedicated row
required by Level 1 dependency closure. It SHALL distinguish requested roots
from added dependencies.

#### Scenario: Missing root

- **WHEN** an explicitly requested word has no readable source row
- **THEN** the report identifies that root as missing and the build does not
  publish a successful ZIP

#### Scenario: Dedicated dependency

- **WHEN** a root relationship targets a canonical spelling owned by another
  row
- **THEN** that row is loaded once, its reason is recorded, and its canonical
  definition is included

#### Scenario: Closed selected build

- **WHEN** selection and dependency planning succeeds
- **THEN** every serialized soft-link target has at least one canonical record
  in the selected archive

### Requirement: Assemble canonical and soft-link records

The builder SHALL emit one valid structured-content term record for every
successfully converted `main-canonical-entry`,
`alternative-spelling-canonical-entry`, or `drp-phrase-canonical-entry` plan
and one dictionary-deinflection term record for every serialized
`soft-link-entry` plan. It SHALL NOT copy canonical definitions into soft-link
records.

#### Scenario: Main or alternative-spelling canonical entry

- **WHEN** an independent `<mean>` owns a `main-canonical-entry` or
  `alternative-spelling-canonical-entry` plan
- **THEN** its converted owner-local definition is emitted under its canonical
  searchable spelling

#### Scenario: DRP phrase canonical entry

- **WHEN** `take a bath` owns a `drp-phrase-canonical-entry` plan
- **THEN** the archive contains an independently searchable canonical
  `take a bath` record

#### Scenario: Main-to-alternative-spelling soft link

- **WHEN** root `o` has an approved route to a dedicated canonical `oh` record
- **THEN** the `main-to-alternative-spelling-soft-link` record targets `oh`, contains no copied
  definition, and the archive also contains canonical `oh`

#### Scenario: Phrase alternate soft link

- **WHEN** `take up the word` points to canonical `take the word`
- **THEN** the `phrase-alternate-soft-link` record targets `take the word` with
  the `alternative` rule and contains no copied definition

#### Scenario: Bare-affix soft link

- **WHEN** `il` is derived from marked alternate `il-` targeting `in-`
- **THEN** one `bare-affix-soft-link` targets canonical `in-` with the
  `alternative` rule

### Requirement: Emit complete functional-label tag metadata

Every successful archive SHALL contain `tag_bank_1.json`. It SHALL contain the
complete reviewed fixed functional-tag catalog, including tags not used by the
current selected build. Each fixed record SHALL have its reviewed name,
`partOfSpeech` category, deterministic catalog order, clear note, and score
zero.

The archive SHALL add a dynamic tag-bank record only when its source build
encounters that dynamic functional tag. A dynamic record SHALL have category
`unmappedPartOfSpeech`, order `9000`, a note that includes the exact normalized
source label, and score zero. It SHALL not add speculative dynamic records.

Every nonempty token in every serialized `definitionTags` field SHALL resolve
to exactly one emitted tag-bank record. The builder SHALL keep `termTags`
empty; sense-local structured-content labels are not tag-bank records.

#### Scenario: Selected build with only fixed labels

- **WHEN** a selected build uses only reviewed functional labels
- **THEN** its archive contains the complete fixed catalog and no dynamic
  tag-bank record

#### Scenario: Selected build with an unknown label

- **WHEN** a selected build encounters `future label`
- **THEN** its archive contains the complete fixed catalog and the one dynamic
  record `?future_label`

#### Scenario: Definition-tag metadata coverage

- **WHEN** a canonical record has `definitionTags = v transitive`
- **THEN** the archive contains exactly one tag-bank record for `v` and one
  tag-bank record for `transitive`

### Requirement: Rank canonical records by selected-root ownership

The builder SHALL assign popularity `100` to a canonical record when its
searchable term exactly equals the decoded `word.w` spelling of one selected
root row. It SHALL assign popularity `0` to other canonical records, including
different spellings emitted from a root row and canonical records loaded only
as dedicated dependency rows. Soft-link records SHALL retain popularity
`-100`.

#### Scenario: Direct canonical record has the highest rank

- **WHEN** a canonical plan's term equals a selected root row's decoded
  `word.w`
- **THEN** its serialized term-bank record has popularity `100`
- **WHEN** a canonical plan's term does not equal any selected root spelling
- **THEN** its serialized term-bank record has popularity `0`
- **AND** an emitted soft-link record has popularity `-100`

### Requirement: Prefer direct canonical records

For the same lookup spelling, the builder SHALL use deterministic record
ordering so direct canonical records precede soft-link routes. Independent
same-spelling canonical records SHALL remain distinct.

#### Scenario: Direct and linked results

- **WHEN** a spelling owns canonical definitions and also participates in
  soft-link-entry relationships
- **THEN** direct canonical records appear first in stable source order and the
  linked routes remain available

### Requirement: Emit one deterministic first-version build report

The builder SHALL write `build-report.json` for every attempted build when the
output directory is writable. The report SHALL contain:

- effective CLI roots in order;
- loaded root rows, added dependency rows, and dependency reasons;
- every independent `<mean>` ownership decision;
- `main-canonical-entry`, `alternative-spelling-canonical-entry`,
  `drp-phrase-canonical-entry`, and `soft-link-entry` plans;
- every serialized or reused soft-link-entry route, rule chain, qualifier, and source
  evidence;
- alternative-local metadata and distinct-meaning rejections;
- conversion findings, missing roots or dependencies, rejected owners, and
  fatal errors;
- a functional-label summary with the fixed-tag count, dynamic-finding count,
  and dynamic-tag aggregates;
- canonical-entry, soft-link-entry, dependency, finding, and output-record totals;
- the successful archive path when one is produced.

For a selected build, conversion details SHALL retain each
`unmapped-functional-label` finding with its source owner. For a full-database
build, the report MAY omit per-entry conversion details, but it SHALL retain
the functional-label summary. Each dynamic-tag aggregate SHALL include the
tag, normalized label, total occurrence count, and at most five deterministic
row-and-term samples. Dynamic-tag aggregates and samples SHALL have stable
semantic ordering.

#### Scenario: Successful report

- **WHEN** a selected build succeeds
- **THEN** the report describes every root, dependency, planned relationship,
  finding, and emitted record in deterministic order

#### Scenario: Failed report

- **WHEN** a missing root, missing dependency, empty canonical definition, or
  schema error makes the build fatal
- **THEN** the report records the failure and no successful ZIP containing
  partial or dangling records is published

#### Scenario: Reused main-to-alternative-spelling route

- **WHEN** bare-affix evidence reuses an existing exact
  `main-to-alternative-spelling-soft-link` route
- **THEN** the report retains both evidence occurrences and identifies the one
  serialized route

#### Scenario: Bounded full-build dynamic summary

- **WHEN** a full build encounters seven occurrences of the same unknown
  functional label
- **THEN** its report keeps the count `7` and at most five deterministic
  samples even though it omits per-entry conversion details

### Requirement: Audit the current functional-label inventory without building a dictionary

The package SHALL provide `bun run inventory:functional-labels`. The command
SHALL open the source database in read-only mode and scan canonical owners with
the same owner-local functional-label rule used by conversion. It SHALL write
deterministic JSON to `build/functional-label-inventory.json`. It SHALL not
modify the source database or export a dictionary archive.

Every inventory row SHALL include the normalized label, occurrence count,
canonical-owner-kind counts, one deterministic row-and-term sample, mapping
status, and resolved tags. The command SHALL finish writing its report and
exit unsuccessfully if any label is unmapped or if a source-row scan error
occurs. Repeated audits of the same source snapshot SHALL produce equal
semantic JSON content and ordering.

#### Scenario: Complete current inventory

- **WHEN** the audit runs against the current MWU database snapshot
- **THEN** it reports 98 normalized owned labels, all fixed, with zero
  unmapped labels and zero scan errors

#### Scenario: Unmapped inventory label

- **WHEN** the audit encounters a current owner-local label without a fixed
  mapping
- **THEN** it writes the inventory evidence and exits unsuccessfully

### Requirement: Export a deterministic valid archive

The builder SHALL use the existing dictionary-builder dependency and supported
Yomitan schemas. Identical database input and effective target order SHALL
produce equal semantic term-bank, tag-bank, and build-report content and
ordering.

#### Scenario: Repeated selected build

- **WHEN** the same selected roots are built twice from identical source data
- **THEN** semantic term-bank records, tag-bank records, and build-report data
  are equal in content and order

#### Scenario: Archive validation

- **WHEN** a successful ZIP is inspected
- **THEN** its index, term-bank, and tag-bank files conform to the
  repository-supported Yomitan schemas, every definition-tag token has
  emitted metadata, and the archive contains no dangling soft links

### Requirement: Verify Level 1 behavior independently

The automated suite SHALL contain focused tests for `main-canonical-entry`,
`alternative-spelling-canonical-entry`, `drp-phrase-canonical-entry`,
`main-to-alternative-spelling-soft-link`, `vr-mean-alternate-soft-link`,
`phrase-alternate-soft-link`, `bare-affix-soft-link`, and dedicated dependency
rows. Each family SHALL cover its positive behavior, relevant negative
behavior, retained evidence, deterministic deduplication, and serialized or
fatal outcome without depending on the complete hand-authored fixture.

#### Scenario: Isolated domain test

- **WHEN** one Level 1 behavior is tested
- **THEN** the test constructs the smallest source rows and HTML needed for
  that behavior and asserts the domain plan and diagnostics directly

#### Scenario: Fixture disagreement

- **WHEN** production behavior satisfies the approved ownership/link rules but
  differs from the provisional fixture
- **THEN** the test is not failed solely to preserve the fixture snapshot

### Requirement: Verify the selected build end to end

Integration tests SHALL cover flag-only, file-only, and combined selection;
missing-input and missing-row failures; deterministic reporting; archive
schemas; and browser import of a representative selected build.

#### Scenario: Browser import

- **WHEN** a representative first-version ZIP is imported with the established
  browser harness
- **THEN** import progress completes, no import error is shown, and the
  installed dictionary count increases

#### Scenario: First-version boundary

- **WHEN** the representative selected build passes
- **THEN** the result proves the Level 1 ownership/link and conservative
  conversion slice only, not final six-level presentation or full-database
  coverage

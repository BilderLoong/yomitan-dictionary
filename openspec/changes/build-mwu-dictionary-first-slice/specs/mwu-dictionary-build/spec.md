## ADDED Requirements

### Requirement: Build the representative first slice
The builder SHALL support an exact-word build containing the MWU rows for `what`, `turn`, `take`, and `run` so the complete pipeline can be validated before processing the full database.

#### Scenario: Default first-slice selection
- **WHEN** the first-slice build is run against an MWU SQLite database containing the four words
- **THEN** only the exact selected source rows and the searchable entries derived from their defined phrases are included

#### Scenario: Missing selected word
- **WHEN** one of the required selected words has no source row
- **THEN** the build returns a diagnostic identifying the missing word and does not claim that the first slice completed successfully

### Requirement: Assemble searchable lexical records
The builder SHALL emit one canonical record per Level 1 lexical identity and one searchable record per independently defined phrase or defined phrase-local alternative. Phrase-local alternatives SHALL use dictionary-deinflection records pointing to the canonical phrase rather than duplicate structured definitions. The builder SHALL deduplicate only exact Unicode searchable-expression and source-identity pairs, without case-folding or removing punctuation or diacritics, and SHALL not create records from example-only expressions, raw alternate-table rows alone, or undefined `.uro` run-ons.

#### Scenario: Parent and phrase records
- **WHEN** the converted `take` entry includes `take a bath` as a defined phrase
- **THEN** the archive contains a searchable `take a bath` record and the rendered `take` record still contains its phrase section

#### Scenario: Raw alternate metadata
- **WHEN** an expression occurs only in the SQLite `alt` table and has no owned MWU definition
- **THEN** the builder does not create a dictionary entry from that row alone

### Requirement: Emit Yomitan-compatible term records
The builder SHALL serialize definitions as Yomitan structured content, SHALL leave the term-bank reading field empty for MWU pronunciations, and SHALL emit machine-readable lookup rules separately from inline visual labels.

#### Scenario: Phrasal-verb rule
- **WHEN** a canonical defined phrase has validated interposed-object evidence
- **THEN** its searchable term record contains the `v_phr` rule while its part-of-speech and usage labels remain structured definition content

#### Scenario: Ordinary expression
- **WHEN** a multiword expression has no validated interposed-object evidence
- **THEN** its record does not receive `v_phr`

### Requirement: Export a deterministic dictionary archive
The builder SHALL use the existing Yomitan dictionary builder to produce a schema-valid ZIP whose record ordering and structured content are deterministic for the same SQLite input and selected words.

#### Scenario: Repeated build
- **WHEN** the first-slice dictionary is built twice from identical input
- **THEN** the serialized semantic records and build report are identical in content and order

#### Scenario: Archive validation
- **WHEN** the generated ZIP is inspected by the repository's Yomitan validation test
- **THEN** its index and term-bank files conform to the supported Yomitan dictionary schema

### Requirement: Emit a deterministic build report
The builder SHALL write one deterministic `build-report.json`. The report SHALL contain build totals, counts by recognized information unit, ignored-unit counts, unrecognized source findings, rejected rows, conversion errors, a complete inventory of emitted `v_phr` candidates, and a phrase-alternative metadata audit.

#### Scenario: Build statistics
- **WHEN** a dictionary build completes
- **THEN** the report contains source-row, accepted-row, rejected-row, lexical-entry, phrase-entry, alternate-entry, ignored-unit, unrecognized-unit, and `v_phr` candidate totals

#### Scenario: Interposed-object candidate inventory
- **WHEN** the builder emits `v_phr` for a canonical phrase
- **THEN** the report includes its canonical term, source word, owner path, evidence example, highlighted components, intervening text, and emitted-rule status for manual review

#### Scenario: Phrase-alternative metadata audit
- **WHEN** the builder creates a dictionary-deinflection record for a phrase-local alternative
- **THEN** the report records its canonical expression, alternative expression, qualifier, and any alternative-local pronunciation, part of speech, usage restriction, inflection, definition, or unrecognized content

#### Scenario: Build with unrecognized content
- **WHEN** a selected source row converts successfully but contains preserved unrecognized content
- **THEN** the ZIP is produced and the build report records that content by source word and position without presenting the build as lossless

#### Scenario: Rejected lexical row
- **WHEN** a selected row lacks the information required to establish a lexical identity
- **THEN** the build report identifies the rejected row and the builder does not silently emit a partial canonical record

### Requirement: Verify representative behavior before expansion
The first-slice build SHALL have automated parser, renderer, record-assembly, findings, and archive-structure tests, and SHALL define manual Yomitan checks for the representative hierarchy and phrase behaviors before the full database path is changed.

#### Scenario: Acceptance verification
- **WHEN** the automated first-slice tests pass and the generated archive is imported into Yomitan
- **THEN** `what`, `turn`, `take`, and `run` can be compared with their GoldenDict source structure, including retained phrases, pronunciations, ordered attachments, and `v_phr` behavior where supported

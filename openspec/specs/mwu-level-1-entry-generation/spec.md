# MWU Level 1 Entry Generation

## Purpose

Generate deterministic Level 1 canonical-entry and soft-link plans from selected MWU source rows, preserving ownership evidence and closing dedicated dependencies.

## Requirements

### Requirement: Index source rows without parsing the full database

The generator SHALL build a deterministic index of source row IDs and decoded
`word.w` keys before planning selected entries. Building the index SHALL NOT
require parsing every `word.m` HTML payload.

#### Scenario: Encoded dedicated key

- **WHEN** a source key such as `o%27` decodes to `o'`
- **THEN** the index identifies that row as the dedicated owner for searchable
  headword `o'`

#### Scenario: Unfamiliar source-key encoding

- **WHEN** a selected ownership comparison requires a source-key decoding form
  not covered by an approved rule
- **THEN** generation records a diagnostic and does not silently normalize the
  key

### Requirement: Extract searchable identity conservatively

For each independent `<mean>`, the generator SHALL preserve the original rich
headword display and derive a separate searchable headword. It SHALL remove
only confirmed homograph markup, confirmed U+00B7 syllabification markers, and
leading or trailing HTML boundary whitespace. It SHALL preserve meaningful
case, punctuation, hyphens, diacritics, and internal spaces.

#### Scenario: Syllabified display

- **WHEN** the visible headword is `pro·cess`
- **THEN** the searchable headword is `process` and the rich display still
  contains `pro·cess`

#### Scenario: Affix punctuation

- **WHEN** the visible searchable headword is `in-`, `-in`, or `-o-`
- **THEN** its boundary hyphens remain part of the canonical searchable
  spelling

#### Scenario: Unknown headword markup

- **WHEN** the headword contains unfamiliar markup or a possible presentation
  character not covered by an approved extraction rule
- **THEN** the generator preserves it for display, records an actionable
  finding, and does not silently remove it from searchable identity

### Requirement: Apply canonical entry ownership per independent mean

The generator SHALL apply exactly one canonical ownership case to every
independent definition-bearing `<mean>` in each selected row.

#### Scenario: Main canonical entry

- **WHEN** a `<mean>` searchable headword equals the decoded current `word.w`
- **THEN** that `<mean>` emits one `main-canonical-entry` owned by the current
  row

#### Scenario: Separate same-spelling means

- **WHEN** a row contains several independent `<mean>` blocks with the same
  searchable spelling
- **THEN** each block emits a separate canonical entry and generation does not
  merge them by spelling

#### Scenario: Alternative-spelling canonical entry from an embedded mean

- **WHEN** a definition-bearing `<mean>` headword differs from the current
  `word.w` and no dedicated row exists for that headword
- **THEN** the embedded `<mean>` emits one
  `alternative-spelling-canonical-entry` using its own searchable headword

#### Scenario: Alternative-spelling target deferred to a dedicated row

- **WHEN** a definition-bearing `<mean>` headword differs from the current
  `word.w` and a dedicated row exists
- **THEN** the embedded occurrence emits no entry, and the dedicated row later
  emits the target as a `main-canonical-entry`

#### Scenario: Missing lexical identity

- **WHEN** a selected definition-bearing structure lacks enough confirmed
  information to establish searchable lexical identity
- **THEN** generation rejects that structure with a diagnostic instead of
  emitting a partial canonical entry

#### Scenario: Unresolved mean diagnostic

- **WHEN** an independent `<mean>` lacks a local `.hword` or its searchable
  identity is blank after approved normalization
- **THEN** generation records an `unresolved-mean` finding and does not emit a
  resolved ownership decision or empty canonical term

#### Scenario: Definition-free mean diagnostic

- **WHEN** a `<mean>` has a searchable identity but no local definition-bearing
  `.dt` outside its `.dro` phrase collections
- **THEN** generation records a `definition-free-mean` finding and does not
  emit a `main-canonical-entry` or `alternative-spelling-canonical-entry`

### Requirement: Share sequences for same-spelling canonical records

The generator SHALL assign one Yomitan sequence number to each canonical
searchable term. Separate canonical records with the same searchable spelling
SHALL remain distinct records but SHALL reuse the sequence assigned to the
first canonical occurrence of that spelling. Soft-link records SHALL receive
their own sequence allocation after canonical records.

#### Scenario: Same spelling as the source word

- **WHEN** a source row contains several definition-bearing `<mean>` blocks
  whose searchable spelling equals the decoded `word.w`
- **THEN** each block emits a separate canonical record and all of those
  records use the same Yomitan sequence number

#### Scenario: Different canonical spellings

- **WHEN** canonical records with different searchable spellings are emitted
  in order
- **THEN** each new spelling receives the next sequence number in
  first-emission order

### Requirement: Generate drp-phrase-canonical-entries

Every `.drp` phrase with its own source-owned definition tree SHALL emit one
canonical Level 1 entry. The same parsed phrase SHALL remain related to and
rendered inside its parent entry.

#### Scenario: Defined parent phrase

- **WHEN** the `take` row contains the defined phrase `take a bath`
- **THEN** `take a bath` emits one `drp-phrase-canonical-entry` and the parent
  `take` entry retains its phrase section

#### Scenario: Adjacent phrases

- **WHEN** a `.dro` collection contains adjacent definition-bearing `.drp`
  phrases
- **THEN** each phrase retains its own boundary and generation does not merge
  their identities or definitions

#### Scenario: Example-only expression

- **WHEN** a multiword expression occurs only inside an example
- **THEN** it does not emit a canonical phrase entry

#### Scenario: Phrase owner retains direct nodes

- **WHEN** a phrase's owned sibling range contains direct text or comment nodes
  before the next `.drp`
- **THEN** the phrase owner HTML retains those nodes while excluding the
  adjacent phrase's range

### Requirement: Generate only approved soft-link-entry relationships

The generator SHALL model a `SoftLinkEntryPlan` as a lookup spelling,
canonical target spelling, approved relationship kind, optional qualifier,
dictionary-deinflection rule chain, and source evidence. A soft-link entry
SHALL NOT own or copy the target definition.

Approved relationship sources SHALL be
`main-to-alternative-spelling-soft-link`, `vr-mean-alternate-soft-link` from
a `.va` attached directly to a mean, `phrase-alternate-soft-link` from a `.va`
attached to a defined `.drp`, derived `bare-affix-soft-link`, and
`cxl-ref-variant-reference-soft-link` from a `.cxl-ref` variant reference in a
cross-reference-only `<mean>` block. Raw `alt` rows, inflections, undefined
`.uro` run-ons, examples, and `.cxl-ref` references outside the confirmed
variant family SHALL NOT create soft-link entries.

#### Scenario: Main-to-alternative-spelling soft link with an embedded target

- **WHEN** the `in` row owns an embedded canonical `in-` `<mean>`
- **THEN** generation emits a
  `main-to-alternative-spelling-soft-link` from `in → in-` with source
  evidence and the `alternative` deinflection rule chain

#### Scenario: Main-to-alternative-spelling soft link with a dedicated target

- **WHEN** the `o` row hosts an `oh` `<mean>` whose canonical definition
  belongs to the dedicated `oh` row
- **THEN** generation emits a
  `main-to-alternative-spelling-soft-link` from `o → oh` with source evidence
  and the `alternative` deinflection rule chain

#### Scenario: VR mean alternate soft link

- **WHEN** `il-` is an explicit local alternative of canonical `in-`
- **THEN** generation emits a `vr-mean-alternate-soft-link` from `il- → in-`,
  retains its qualifier and evidence, and uses the `alternative` deinflection
  rule

#### Scenario: Phrase alternate soft link

- **WHEN** `take up the word` qualifies for a `phrase-alternate-soft-link`
  targeting `take the word`
- **THEN** generation emits a `phrase-alternate-soft-link` from
  `take up the word → take the word`, retains `or less commonly`, and uses the
  `alternative` deinflection rule

#### Scenario: Raw alternate index row

- **WHEN** a spelling occurs only in `alt(id, w)`
- **THEN** it emits neither a canonical entry nor a soft link in this change

#### Scenario: Cross-reference-only mean variant reference

- **WHEN** the `o` row hosts a definition-free `O` `<mean>` whose `.cxl-ref`
  reads `variant spelling of oh`
- **THEN** generation emits a `cxl-ref-variant-reference-soft-link` from
  `O → oh` whose deinflection rule chain is the relation phrase
  `variant spelling of`, whose target row joins the canonical dependencies,
  and which replaces any same-route `.va` link while merging its evidence

### Requirement: Extract cxl-ref targets and rules conservatively

For a cross-reference-only `<mean>`, the generator SHALL derive the soft-link
target from the `.cxt` anchor's `bword://` href — stripping the scheme and any
trailing `[homograph]` suffix — and SHALL NOT use the visible anchor text,
which may carry a homograph prefix such as `1ibadite`. The `.cxn` reference
qualifier SHALL remain relationship evidence, not part of the target spelling.
The generator SHALL emit `cxl-ref-variant-reference-soft-link` rules only for
`.cxl` relation text that case-insensitively matches `variant` or `spelling`;
confirmed phrases include `variant spelling of`, `variant of`, `archaic
variant of`, `obsolete variant of`, `dialectal variant of`, `Scottish variant
of`, `chiefly Scottish variant of`, and `chiefly British spelling of`.
Inflection references (`plural of`, `past tense of`, and similar),
`taxonomic synonym of`, `synonym of`, and `and of` continuations SHALL remain
reported findings without soft-link rules until their own rules are approved.
The generator SHALL skip the link when the extracted target equals the lookup
spelling or when no decoded source row exists for the target.

#### Scenario: Target from the bword href, not visible text

- **WHEN** a cross-reference-only `<mean>` shows visible `1ibadite` with a
  `.cxt` href `bword://ibadite[1]`
- **THEN** the target spelling is `ibadite` and the visible homograph prefix
  does not enter the target

#### Scenario: Non-variant reference phrases

- **WHEN** the `.cxl` relation text reads `plural of`, `synonym of`,
  `taxonomic synonym of`, or an `and of` continuation
- **THEN** generation records a finding and emits no soft-link rule

#### Scenario: Self and missing targets

- **WHEN** the extracted target equals the lookup spelling, or no decoded
  source row exists for the target
- **THEN** generation skips the link and records the reason

### Requirement: Keep soft-link rule chains non-empty

The generator SHALL serialize every soft-link entry with a non-empty
dictionary-deinflection rule chain: `alternative` for spelling-alternative
links (`main-to-alternative-spelling-soft-link`, `vr-mean-alternate-soft-link`,
`phrase-alternate-soft-link`, `bare-affix-soft-link`) and the confirmed
relation phrase for `cxl-ref-variant-reference-soft-link`. A SHALL NOT
serialize a soft link with an empty rule chain. The chain is the only
dictionary-side lever that keeps Yomitan's shortest-inflection-chain sort key
from tying the link's pulled target with the queried spelling; an empty chain
lets a pulled different-spelling canonical entry (for example the `o` row's
letter entry) outrank the same-spelling entry (for example `oh` or `O`) when
the build-root popularity is higher.

#### Scenario: Same spelling ranks first

- **WHEN** Yomitan looks up `oh` or `O` in an archive that selected the `o`
  row as a root
- **THEN** the same-spelling canonical entries (`oh`, `O`) rank above the
  pulled `o` entries because the pulling links (`o → oh`,
  `O → o`) carry a non-empty rule chain

### Requirement: Audit alternative-local metadata

The generator SHALL retain each local alternative's qualifier and any local
pronunciation, part of speech, usage restriction, inflection,
definition-like content, or unrecognized content as relationship evidence. It
SHALL NOT serialize a lightweight shared-definition soft link when that
evidence establishes a distinct definition owner.

#### Scenario: Qualified phrase alternative

- **WHEN** a proposed `phrase-alternate-soft-link` contains only its spelling
  and qualifier
- **THEN** the approved soft link is emitted and the qualifier remains in the
  relationship evidence and build report

#### Scenario: Alternative with distinct meaning

- **WHEN** a proposed alternative contains source-owned definition content
  that differs from the canonical target relationship
- **THEN** the generator reports the mismatch and withholds that soft link
  until reconnaissance defines the correct representation

### Requirement: Derive bare-affix-soft-links from confirmed source roles

For every source-confirmed marked prefix, suffix, infix, or marked alternate, the generator SHALL derive one additional `bare-affix-soft-link` by removing
only boundary hyphens. A newly serialized bare lookup SHALL point to the same
canonical target with the `alternative` rule. When an exact
`main-to-alternative-spelling-soft-link` already supplies that lookup and
target, the generator SHALL reuse the existing route and its rule chain
instead. The rule SHALL NOT apply to ordinary hyphenated words or arbitrary
substrings.

#### Scenario: Marked alternate bare lookup

- **WHEN** marked alternate `il-` points to canonical `in-`
- **THEN** generation also emits a `bare-affix-soft-link` from `il → in-` with
  the `alternative` rule

#### Scenario: Prefix, suffix, and infix shapes

- **WHEN** MWU confirms `in-`, `-in`, or `-i-` as an affix identity
- **THEN** the derived bare spelling is respectively `in`, `in`, or `i`, while
  the canonical displayed spelling keeps its hyphens

#### Scenario: Existing exact route

- **WHEN** a `main-to-alternative-spelling-soft-link` already supplies the
  exact bare lookup and canonical target
- **THEN** the generator reuses that route and its rule chain instead of
  serializing a duplicate `bare-affix-soft-link`

### Requirement: Close the selected build over canonical dependencies

The generator SHALL begin with the requested root rows and add dedicated rows
required to supply canonical records for emitted soft-link targets. Dependency
discovery SHALL be deterministic, deduplicated by row ID, and repeated until
every emitted soft link resolves to at least one canonical spelling present in
the selected archive.

#### Scenario: Dedicated alternative-spelling target outside the roots

- **WHEN** a requested root emits a
  `main-to-alternative-spelling-soft-link` to a headword owned by a non-root
  dedicated row
- **THEN** that row is included as a canonical dependency and its inclusion
  reason is recorded

#### Scenario: Repeated dependency

- **WHEN** several source relationships require the same dedicated row
- **THEN** the dependency row is processed once while every relationship
  remains available as report evidence

#### Scenario: Missing canonical dependency

- **WHEN** an approved soft link has no readable canonical owner
- **THEN** the acceptance build records a fatal diagnostic and does not emit a
  successful archive containing that dangling link

### Requirement: Preserve exact identities and inspectable evidence

Canonical entries SHALL retain their source row and `<mean>` identities.
Serialized soft links SHALL be deduplicated only when their exact Unicode
lookup spelling, target spelling, and effective deinflection rule chain are
equal. Case, punctuation, spacing, and diacritics SHALL NOT be normalized for
deduplication. A `cxl-ref-variant-reference-soft-link` whose lookup and target
match an existing route SHALL replace that route's relationship and rule chain
and merge the existing evidence.

For every independent `<mean>`, the generator SHALL report source row ID and
key, `<mean>` position, searchable headword, ownership decision, decision rule,
and dedicated target row when applicable. For every emitted or reused soft
link, it SHALL report all source evidence.

#### Scenario: Repeated hosted target

- **WHEN** a source row contains repeated `<mean>` blocks for the same
  different target spelling
- **THEN** one equivalent soft-link record is serialized and every source
  occurrence remains in the report

#### Scenario: Same spelling, different canonical identity

- **WHEN** several canonical entries share one searchable spelling but differ
  in source lexical identity
- **THEN** all canonical records remain distinct and a spelling-based Yomitan
  soft link leaves every matching record eligible to resolve

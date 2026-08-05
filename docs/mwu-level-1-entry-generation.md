# MWU Level 1 Entry Generation

Status: approved canonical-entry rule. Confirmed `soft-link-entry` creation
rules are recorded at the end without making them canonical entries.

This document defines how MWU SQLite rows and their HTML produce the two Level
1 serialized entry shapes: canonical entries and `soft-link-entry` records. It complements the
[MWU HTML survey](mwu-html-survey/README.md), which defines the six source
levels and the information units that may belong to them.

## Scope

This document answers two questions:

> Which definition-bearing source structures own canonical Level 1 entries?

> Which confirmed source relationships create Level 1 `soft-link-entry`
> records pointing to canonical terms?

The canonical algorithm does not turn alternate spellings, source-row lookup
routes, cross-reference-only forms, or other aliases into definition owners.
Instead, confirmed relationships create `soft-link-entry` records. These
entries may point to canonical Level 1 entries, but they do not own or copy the
canonical definition tree.

## Domain language

The following names are the domain language used when discussing Level 1
generation and grouping the archive term-bank tests. The serialized runtime
values remain the technical implementation vocabulary shown in the last
column; this naming layer makes the source rule easier to identify in tests
and design discussions.

| Domain name | Meaning | Code representation |
| --- | --- | --- |
| `main-canonical-entry` | A canonical entry emitted when a `<mean>` spelling matches the current decoded `word.w` spelling. | `CanonicalEntryPlan.kind = "main-canonical-entry"` |
| `alternative-spelling-canonical-entry` | A canonical entry for an alternative spelling emitted from a definition-bearing embedded `<mean>` when no dedicated row exists. This is also a conversational name for the Case 3 target family, although the embedded Case 3 occurrence emits no record. | `CanonicalEntryPlan.kind = "alternative-spelling-canonical-entry"` |
| `drp-phrase-canonical-entry` | A canonical entry owned by a definition-bearing `.drp` phrase. | `CanonicalEntryPlan.kind = "drp-phrase-canonical-entry"` |
| `main-to-alternative-spelling-soft-link` | A source row's decoded `word.w` lookup spelling pointing to a different hosted `<mean>` spelling. | `SoftLinkEntryPlan.kind = "soft-link-entry"`; relationship = `"main-to-alternative-spelling-soft-link"` |
| `vr-mean-alternate-soft-link` | An explicit variant relationship from an alternate attached to an independent `<mean>`. `vr` is the domain label; the current MWU source marker is `.va`. | `SoftLinkEntryPlan.kind = "soft-link-entry"`; relationship = `"vr-mean-alternate-soft-link"` |
| `phrase-alternate-soft-link` | An explicit alternate attached to a defined `.drp` phrase, pointing to that phrase's canonical spelling. | `SoftLinkEntryPlan.kind = "soft-link-entry"`; relationship = `"phrase-alternate-soft-link"` |
| `bare-affix-soft-link` | An additional lookup route produced by removing only the boundary hyphen from a marked affix alternate. | `SoftLinkEntryPlan.kind = "soft-link-entry"`; relationship = `"bare-affix-soft-link"` |

Case 3 is a defer rule, not a separately emitted entry kind: the embedded
alternative spelling is skipped because its dedicated word row owns the
spelling, and that dedicated row later emits the target as a
`main-canonical-entry`. The name `alternative-spelling-canonical-entry` is
still useful when referring to the target family across Case 2 and Case 3.

## Terms

### Source word row

A row in the SQLite `word(id, w, m)` table:

- `id` identifies the source article;
- `w` is the source lookup key;
- `m` is the MWU HTML document.

A source word row is not a Level 1 entry. One row may contain several
independent lexical entries.

### Independent `<mean>`

An independent `<mean>` is an MWU headword/POS block with its own lexical
identity. Its `.hword` supplies the entry's spelling, while the remainder of
the block supplies its Level 1 metadata and Level 2–6 definition tree.

Several `<mean>` blocks may use the same spelling. They remain separate Level
1 entries when MWU presents them as separate lexical blocks.

### Canonical Level 1 entry

A canonical Level 1 entry owns one parsed MWU definition tree. It normally
becomes one canonical Yomitan term-bank record. A `soft-link-entry` may point
to its term, but it does not become another owner of the definition.

### Soft-link Level 1 entry

A `soft-link-entry` is a Level 1 entry that owns a searchable relationship
rather than a definition tree. It contains a lookup spelling and a canonical
target spelling. Its Yomitan definition is a dictionary-deinflection tuple
that resolves the target term without copying the target's structured
definition.

The lookup spelling may also have its own canonical entries. For example, `in`
keeps its ordinary canonical definitions while separate `soft-link-entry`
records point from `in` to `In`, `IN`, `in-`, and `-in`.

### Dedicated word row

A dedicated word row is a row whose decoded source key represents the
spelling of an embedded `<mean>`. For example, the source key `o%27`
represents the displayed headword `o'`.

Dedicated-row ownership is based only on the existence of that row. We do not
compare the dedicated row's definitions with the embedded `<mean>`.

## Level 1 generation information-unit catalog

These information units describe the source evidence and generated entry kind
used by the Level 1 algorithm. Some are source or relationship metadata rather
than visible dictionary content. They are still named information units so the
parser, build report, and documentation use the same vocabulary.

| Information unit | What it describes | Source evidence | Generation effect |
| --- | --- | --- | --- |
| `source-word-row` | One MWU source article and its lookup spelling. | SQLite `word(id, w, m)` | Supplies the source boundary and the `word.w` spelling used for `main-canonical-entry` ownership and `main-to-alternative-spelling-soft-link` generation. |
| `lexical-entry` | One independent headword/POS block with its own definition tree. | `<mean>` and `.hword` | Becomes a `main-canonical-entry` or `alternative-spelling-canonical-entry` when its ownership case permits emission. Same-spelling blocks remain separate. |
| `searchable-headword` | The lookup spelling extracted from a local `.hword`, after removing confirmed presentation-only homograph markup and confirmed syllabification markers, then trimming only leading/trailing HTML boundary whitespace. | `.hword`, `sup` | Is compared with the decoded `word.w` key and becomes the canonical target spelling. Meaningful punctuation, internal spaces, and diacritics remain significant. Unrecognized headword markup must be reported rather than silently normalized. |
| `syllabification-marker` | A display-only marker showing syllable boundaries inside a printed headword. | Plain `·` text inside `.hword` (currently observed as U+00B7 MIDDLE DOT in `lit·tle`) | `·` is the only confirmed marker so far, not an exhaustive list. Preserve confirmed markers in `headword-display`; remove them from `searchable-headword` only after recognition; report unfamiliar candidates. |
| `dedicated-word-row` | The existence of a source row for a searchable headword. | `word.w` index; encoded keys such as `o%27` | Makes the dedicated row the canonical owner for a different-spelling embedded `<mean>`; no semantic comparison is performed. |
| `source-row-membership` | A different-spelling `<mean>` headword hosted inside a source word row. | `word.w`, `<mean>`, `.hword` | Creates a `main-to-alternative-spelling-soft-link` from the decoded `word.w` to the target headword, whether the target is Case 2 or Case 3. |
| `alternate-form` | An explicit local alternate expression attached to a lexical entry or phrase. | `.vr`, `.vl`, `.va` | Creates a confirmed alternate soft-link domain form from the alternate expression to its local canonical headword while preserving the qualifier. The current `.va` mean and phrase rules are named `vr-mean-alternate-soft-link` and `phrase-alternate-soft-link`. |
| `phrase` | A defined multiword lexical unit with its own definition tree. | `.dro`, `.drp` | Creates a `drp-phrase-canonical-entry`; the parent retains the phrase section. Phrase-local `.va` creates a `phrase-alternate-soft-link`. |
| `soft-link-entry` | A Level 1 searchable relationship with no copied definition tree. | Derived from a confirmed source relationship | Serializes one of the approved soft-link domain forms as a dictionary-deinflection tuple targeting a canonical term spelling. |
| `alt-index-row` | An alternate lookup index row whose semantic target relationship has not yet been classified. | SQLite `alt(id, w)` | Possible future `soft-link-entry` evidence; skipped by the current build. |

## Canonical generation algorithm

### Level 1 entries generated from `<mean>` structures

Before parsing articles, build an index of all dedicated source word keys.
Then process every selected source row and every independent `<mean>` in source
order.

For each `<mean>`:

1. Extract its searchable headword from `.hword`: remove the homograph
   superscript, remove only confirmed display-only syllabification markers,
   and trim only leading/trailing whitespace introduced by the HTML wrapper.
   Report any unfamiliar headword markup or punctuation candidate instead of
   silently removing it.
2. Preserve the original rich `.hword` separately for display. Meaningful
   punctuation such as `in-`, `-in`, `o'`, and `o-`, as well as internal spaces,
   remains in the searchable spelling.
3. Compare that spelling with the current row's decoded `word.w` key.
4. Apply exactly one of the following ownership cases.

#### Case 1: The `<mean>` spelling matches the current row

Domain name: `main-canonical-entry`.

Create a canonical Level 1 entry from the `<mean>`.

Every matching `<mean>` is emitted separately. Matching spelling does not
authorize merging entries with different POS blocks, homograph identities, or
source boundaries.

Example: the `what` row contains separate `<mean>` blocks for pronoun,
adverb, adjective, noun, and conjunction. Each block becomes a separate Level
1 entry for `what`.

#### Case 2: The spelling differs and no dedicated row exists

Domain name: `alternative-spelling-canonical-entry`.

Create a canonical Level 1 entry from the embedded `<mean>`, using the
`<mean>`'s own spelling rather than the current row's lookup key.

Example: if the `in` row contains definition-bearing `<mean>` blocks for
`in-` and `-in`, and neither spelling has a dedicated word row, the `in` row
owns and emits those canonical entries.

An `alt` row is not required. The definition-bearing `<mean>` is the semantic
evidence for the entry.

#### Case 3: The spelling differs and a dedicated row exists

Domain name: `alternative-spelling-canonical-entry` for the target family;
this case itself is only a defer rule and emits no entry from the embedded
occurrence.

Do not create a canonical entry from the embedded `<mean>`. Skip that source
occurrence and let the dedicated word row generate the entry.

Examples:

- the `o` row may contain an `oh` `<mean>`, but the dedicated `oh` row owns it;
- the `oh` row may contain an `o` `<mean>`, but the dedicated `o` row owns it;
- the `o` row may contain `o'`, but the dedicated `o%27` row owns it after
  source-key decoding.

The dedicated row always wins. The builder does not compare HTML, definitions,
POS, pronunciation, or parsed semantic content before skipping the embedded
occurrence.

### Miscellaneous canonical Level 1 sources

#### Defined `.drp` phrases

Domain name: `drp-phrase-canonical-entry`.

Every `.drp` phrase with its own source-owned definition tree becomes a
canonical Level 1 entry. The same parsed phrase object is also retained inside
the parent entry's `.dro` phrase section.

Examples:

- `take a bath` becomes an independent canonical entry and remains visible
  under `take`;
- `take the word` becomes an independent canonical entry and remains visible
  under `take`.

Adjacent `.drp` phrases are separate entries and are never merged.

#### Future definition-bearing lexical structures

When a new source structure is encountered, it becomes a canonical Level 1
entry only after reconnaissance confirms that it has its own lexical identity
and source-owned definition tree. Its information remains bound to the level
where MWU presents it.

## Role of the `alt` table

The `alt(id, w)` table is lookup/index metadata that points a lookup spelling
to a source article. It does not determine canonical semantic ownership.

Therefore:

- an `alt` row alone does not create a canonical Level 1 entry;
- an embedded definition-bearing `<mean>` can create a canonical entry without
  an `alt` row;
- an `alt` row does not override the dedicated-word-row precedence rule;
- an `alt` row may become evidence for a `soft-link-entry` in a future design;
- the current build skips `alt` rows during `soft-link-entry` generation.

## Structures that do not create canonical Level 1 entries

The following structures remain attached to their nearest semantic owner or
are handled by `soft-link-entry` generation:

- Level 2 verb groups such as transitive and intransitive divisions;
- Level 3–5 numbered, lettered, and parenthesized senses;
- Level 6 examples, notes, comparisons, and references;
- expressions that appear only inside examples;
- inflected forms;
- undefined `.uro` derivatives such as `abandoner` under `abandon`;
- raw `alt` rows;
- `phrase-alternate-soft-link` candidates that share another phrase's definition;
- cross-reference-only `<mean>` blocks without their own definition tree;
- an additional bare-affix lookup route, such as using `in` to find `in-` or
  `-in`.

This exclusion is only from canonical-entry generation. Some excluded forms
may later become `soft-link-entry` records pointing to a canonical Level 1
entry.
The ordinary word `in` can still own its canonical definition while the same
search spelling also participates in separate `soft-link-entry` records for
`in-` and `-in`.

### TODO: Cross-reference-only mean soft-link generation

The current Level 1 planner uses a local `.dt` as evidence that a `<mean>`
owns a canonical definition. It does not currently inspect `.cxl-ref` when
planning `soft-link-entry` records. The renderer recognizes `cxl-ref`, but
that recognition happens only after a canonical plan already exists.

The first `O` mean in the `o` source row is the motivating case:

```text
O -> oh
```

Its content says `variant spelling of oh`, but it has no local definition
tree. It should not create a third `alternative-spelling-canonical-entry`.
However, the cross-reference may be useful relationship evidence and should
be evaluated as a possible soft-link source.

Before implementing this, decide and test:

- whether a cross-reference-only `<mean>` creates a new soft-link
  relationship or reuses an existing relationship kind;
- how the direction and target are extracted from `.cxl-ref`;
- how to deduplicate it with an equivalent `.va` relationship from the
  dedicated target row, such as the existing `O -> oh` evidence; and
- how to preserve source evidence while keeping the canonical-entry rule
  definition-bearing.

This is intentionally a planning TODO, not a rule that the current builder
already implements.

## Source-key comparison

Canonical ownership needs the source lookup key and the displayed headword to
be compared in the same representation. At minimum, encoded source keys such
as `o%27` must be decoded to `o'`.

The ownership comparison must not remove hyphens, punctuation, diacritics, or
other meaningful spelling distinctions merely to make strings match. Any
additional source-key decoding rule must be verified against the database and
recorded before implementation.

Whitespace introduced by the HTML wrapper is not part of the term. Trim only
leading and trailing whitespace from the extracted searchable headword; do not
collapse or remove meaningful internal spaces in phrases.

The current evidence confirms only the U+00B7 MIDDLE DOT in `lit·tle` as a
syllabification marker. Other visual markers may exist. Until they are
surveyed and confirmed, they must remain visible in `headword-display` and
must be reported as unknown headword markup rather than normalized away.

## Required build diagnostics

The build report should make every ownership decision inspectable. For each
independent `<mean>`, record:

- source row ID and `word.w`;
- source `<mean>` position;
- extracted searchable headword;
- decision: `emit-current`, `emit-embedded`, or `defer-to-dedicated-row`;
- dedicated target row ID when the entry is deferred;
- the rule that caused the decision.

These diagnostics detect unexpected source relationships without changing the
precedence rule.

## Reference flow

```text
Build an index of dedicated word rows

For each word row:
    For each independent <mean>:
        term = searchable spelling from the <mean>'s own .hword

        If term matches the current decoded word.w:
            emit one canonical Level 1 entry
        Else if a dedicated word row exists for term:
            skip this occurrence and defer to the dedicated row
        Else:
            emit one canonical Level 1 entry from this embedded <mean>

    For each defined .drp phrase:
        emit one canonical Level 1 entry
        retain the phrase in the parent entry

After canonical generation:
    generate approved soft-link-entry records separately
```

## Confirmed invariants

1. A `word` row is a source article, not a Level 1 entry.
2. A single source row may emit many canonical Level 1 entries.
3. Separate same-spelling `<mean>` blocks are not merged.
4. A different-spelling embedded `<mean>` is emitted when no dedicated row
   exists.
5. A dedicated word row always owns its spelling, without semantic comparison.
6. The `alt` table does not gate canonical entry generation.
7. Every defined `.drp` phrase owns one canonical Level 1 entry and remains in
   its parent phrase section.
8. Canonical definitions are parsed once; aliases and alternatives must point
   to them instead of copying their definition trees.
9. Canonical records with the same searchable term share one Yomitan sequence
   number. The first canonical occurrence assigns the sequence; later
   same-spelling records reuse it. This means all canonical records matching a
   source row's decoded `word.w` spelling share a sequence, while distinct
   terms receive later sequence numbers.

### Canonical term-bank sequence grouping

The Yomitan sequence field groups canonical records by searchable spelling; it
is not a unique record counter. When one source row contains several
independent `<mean>` blocks whose searchable spelling equals its decoded
`word.w`, each block remains a separate canonical record but all of those
records reuse the sequence assigned to the first occurrence. Canonical terms
with different spellings receive the next sequence in first-emission order.

Soft-link records are emitted after canonical records and retain their own
sequence allocation. Their target spelling does not merge them into the
canonical target's sequence group.

### Canonical term-bank popularity ranking

The term-bank popularity field is a selected-root rank, not a count of
definitions. Compare each canonical term with the decoded `word.w` spelling
of the selected root rows. A canonical record receives:

- `100` when its searchable term exactly equals one selected root row's
  `word.w` spelling;
- `0` when its searchable term is a different spelling, including a canonical
  record emitted from a dedicated dependency row;
- `-100` only for a `soft-link-entry`.

This keeps the direct canonical record for a requested lookup spelling ahead
of dependency records while preserving every independent canonical
definition. A dependency row receives rank `100` only when that same spelling
is also selected as a root.

## Soft-link-entry generation

`soft-link-entry` is the second kind of Level 1 entry. It makes a lookup form
resolve one canonical term spelling without owning or copying that canonical
term's definition tree.

Confirmed creation sources are:

- `main-to-alternative-spelling-soft-link` for different-spelling `<mean>`
  headwords hosted by a source word row;
- `vr-mean-alternate-soft-link` for `.va` alternatives attached directly to a
  mean;
- `phrase-alternate-soft-link` for `.va` alternatives attached to defined
  phrases.

Cross-reference-only `<mean>` blocks remain candidates whose creation rules are
not yet approved. The `alt` table is also a possible future source of
`soft-link-entry` records, but it is intentionally skipped for now because we
have not defined which `alt` relationships are semantically safe to emit. Bare
lookup for marked prefixes, suffixes, and infixes is already covered when those
forms appear as hosted `<mean>` headwords; it is not a separate
spelling-normalization rule.

Every `soft-link-entry` must come from a confirmed creation rule. Its lookup
spelling, canonical target, qualifier, and source evidence must remain
inspectable.

### Confirmed main-to-alternative-spelling soft-link

This domain rule is represented by a `SoftLinkEntryPlan` with
`relationship = "main-to-alternative-spelling-soft-link"` and is serialized
as a `soft-link-entry` record.

Every distinct searchable `<mean>` headword hosted by a source word row is a
lookup target of that row's decoded `word.w` spelling. When the target spelling
differs from `word.w`, create a `soft-link-entry` whose lookup spelling is
`word.w` and whose canonical target is the `<mean>` headword.

This relationship is independent of canonical ownership:

- for Case 2, the target canonical entry is generated from the embedded
  `<mean>`;
- for Case 3, the target canonical entry is generated from its dedicated word
  row;
- both cases still receive the same source-row lookup relationship.

For the `o` source row, this produces distinct target relationships including:

```text
o -> O
o -> o-
o -> -o
o -> -o-
o -> o'
o -> oh
```

For the `in` source row, this includes:

```text
in -> In
in -> IN
in -> in-
in -> -in
```

Repeated `<mean>` blocks with the same target spelling produce one serialized
`soft-link-entry` for that exact lookup-target pair, while the build report
retains every source `<mean>` as evidence. A dedicated target row does not
suppress the entry.

### Confirmed vr-mean-alternate soft-link

This domain rule is represented by a `SoftLinkEntryPlan` with
`relationship = "vr-mean-alternate-soft-link"` and is serialized as a
`soft-link-entry` record. `vr` is the domain label for this variant
relationship; the current MWU source marker is `.va`.

An alternate form explicitly attached to an independent `<mean>` points to
that local `<mean>` headword. The alternate form becomes a `soft-link-entry`;
it does not own or copy the local definition tree.

For the `in` source row, the observed header alternatives produce:

```text
il-  -> in-
im-  -> in-
ir-  -> in-
ino- -> in-
```

The local variant qualifier, such as `or` or `or less commonly`, remains
attached to the relationship. The alias may also have its own canonical entry
elsewhere; that does not suppress the explicit lexical-alias
`soft-link-entry`.

#### Confirmed bare-affix soft-link

This domain rule is represented by a `SoftLinkEntryPlan` with
`relationship = "bare-affix-soft-link"` and is serialized as a
`soft-link-entry` record.

The fixture also adds the requested bare lookup routes:

```text
il  -> in-
im  -> in-
ir  -> in-
ino -> in-
```

Both marked and bare forms use the dictionary-deinflection rule `alternative`.
For a marked form, the rule records that the explicit local spelling is an
alternative of the canonical affix. For a bare form, it also describes the
additional lookup route created by removing the boundary hyphen. This is a
deliberate search convenience: it lets a user search the unmarked spelling
without removing the hyphens from the canonical displayed affix or copying its
definition.

### Confirmed phrase-alternate soft-link

This domain rule is represented by a `SoftLinkEntryPlan` with
`relationship = "phrase-alternate-soft-link"` and is serialized as a
`soft-link-entry` record.

A `.va` alternate attached to a defined `.drp` phrase becomes a
`soft-link-entry` targeting that phrase's canonical `.drp` spelling. The
canonical phrase retains the single parsed definition tree, and the parent
entry retains the phrase section.

For `take the word`, this produces:

```text
take up the word -> take the word
```

The local qualifier `or less commonly` remains attached to the
`soft-link-entry` evidence.

All confirmed sources produce the same Level 1 kind, `soft-link-entry`. The
build report still distinguishes source-row membership from explicit lexical
alias evidence so every generated entry can be traced back to its rule.

Yomitan's dictionary-deinflection representation contains a target term string
and an inflection-rule chain; it does not contain a target term-bank record ID.
Consequently, a serialized `soft-link-entry` resolves a canonical spelling and
may return every matching canonical Level 1 record for that spelling. The
intermediate model may retain more precise source identities for diagnostics,
but it cannot rely on Yomitan to select one same-spelling POS or homograph
record by ID.

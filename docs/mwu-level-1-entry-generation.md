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
| `cxl-ref-variant-reference-soft-link` | A soft-link relationship from a cross-reference-only `<mean>` headword to the target spelling named by its `.cxl-ref` variant reference (for example `O` → `oh`). | `SoftLinkEntryPlan.kind = "soft-link-entry"`; relationship = `"cxl-ref-variant-reference-soft-link"` |

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

### Cross-reference-only `<mean>`

A cross-reference-only `<mean>` has no local definition tree (no `.dt`
outside `.dro`); its content is a `.cxl-ref` variant reference such as
`variant spelling of oh`. It never owns a canonical Level 1 entry. Its
headword is still a searchable lookup spelling, and the confirmed variant
reference emits a `cxl-ref-variant-reference-soft-link` targeting the
referenced spelling.

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
| `variant-reference` | A source statement identifying the local headword as a spelling variant of another entry. | `.cxl-ref`, `.cxl`, `.cxt` | In a cross-reference-only `<mean>`, creates a `cxl-ref-variant-reference-soft-link` from the headword to the referenced spelling. |
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

This exclusion is only from canonical-entry generation.
Cross-reference-only `<mean>` blocks emit `cxl-ref-variant-reference-soft-link`
records instead of canonical entries; other excluded forms may later become
`soft-link-entry` records pointing to a canonical Level 1 entry.
The ordinary word `in` can still own its canonical definition while the same
search spelling also participates in separate `soft-link-entry` records for
`in-` and `-in`.

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
10. `.cxl-ref` never grants canonical ownership; a cross-reference-only
    `<mean>` may emit a `cxl-ref-variant-reference-soft-link` pointing to the
    referenced spelling.

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
  phrases;
- `cxl-ref-variant-reference-soft-link` for `.cxl-ref` variant references in
  cross-reference-only `<mean>` blocks.

The `alt` table is also a possible future source of
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

### Confirmed cxl-ref-variant-reference soft-link

This domain rule is represented by a `SoftLinkEntryPlan` with
`relationship = "cxl-ref-variant-reference-soft-link"` and is serialized as a
`soft-link-entry` record.

A cross-reference-only `<mean>` — one whose content is a `.cxl-ref` variant
reference and which has no local definition tree — emits no canonical entry.
Its searchable headword is the lookup spelling, and the referenced spelling
from the `.cxl-ref` is the canonical target. The first `O` mean in the `o`
source row is the motivating case:

```text
O -> oh
```

Target extraction uses the `.cxt` anchor's `bword://` href, not the visible
anchor text: strip the scheme and the trailing `[homograph]` suffix (for
example `bword://ibadite[1]` becomes `ibadite`). The visible text may carry a
homograph prefix such as `1ibadite` and must not be used for the target. The
`.cxn` reference qualifier (for example `2a` in `variant of acoustics 2a`) is
relationship evidence, not part of the target spelling.

Only the confirmed variant family of relation phrases is emitted: `.cxl` text
case-insensitively matching `variant` or `spelling`, such as `variant
spelling of`, `variant of`, `archaic variant of`, `obsolete variant of`,
`dialectal variant of`, `Scottish variant of`, `chiefly Scottish variant of`,
and `chiefly British spelling of`. Inflection references (`plural of`, `past
tense of`, and similar), `taxonomic synonym of`, `synonym of`, and `and of`
continuations remain reported findings without soft-link rules until their own
rules are approved.

The serialized record's dictionary-deinflection tuple carries the relation
phrase as its rule name, so the resolved entry displays the relation: for the
`O` mean this produces `[[oh, ["variant spelling of"]]]`. The
`definition-free-mean` finding remains for diagnostics.

Eligibility and dependency:

- the `<mean>` must be cross-reference-only (no local `.dt` outside `.dro`);
  a mean with its own definition tree keeps `.cxl-ref` as rendered content and
  emits no link;
- skip the link when the extracted target equals the lookup spelling or when
  no source row exists for the target in the decoded index;
- the target row joins `requiredDependencyIds` exactly like a dedicated-row
  deferral, so the target becomes a canonical term and the final
  `missing-dependency` check passes.

Deduplication: one serialized `soft-link-entry` per `(lookup, target)` route.
When an existing route (for example the `oh` row's `vr-mean-alternate-soft-link`
evidence for `O`) covers the same lookup and target, the
`cxl-ref-variant-reference-soft-link` replaces that route's relationship and
rule name and merges the existing evidence, because the variant reference is
the more specific statement of the relationship.

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

## Structured-content rendering

This section defines how the canonical owner HTML is converted into Yomitan
structured content. It is the production counterpart of the hand-authored
`design-fixtures/what/term_bank_1.json`: the fixture records the intended
visual design, and this contract states how the parser reproduces it from
source HTML.

The conversion lives in `src/conversion/convertCanonical.ts` (facade) and
`src/conversion/renderStructuredContent.ts` (pure renderer). The renderer is
pure: it maps `CanonicalEntryPlan.source.ownerHtml` to
`RenderedCanonicalContent { content, definitionTags, findings, visibleText }`
with no I/O. `ConvertedCanonical` adds the plan and the final
`definitionTags` (`null` for means without `.fl`, `phrase` for defined
phrases without their own `.fl`).

### Root shape

Every canonical record's content root is an `mwu-entry` `div` (data:
`content = mwu-entry`, `level = 1`, `unit = lexical-entry`) containing, in
source order:

1. `mwu-header` — homograph number, headword display, entry qualifier,
   pronunciation, inflection group, and local alternate forms;
2. the definition body — verb-subtype labels and the nested sense list;
3. defined phrase sections (`dro`) as collapsed `details`; when the owner is
   the phrase itself (a `drp-phrase-canonical-entry`), the phrase body is
   rendered flat as `definition-flow` instead of being wrapped in `details`;
4. the origin section as a collapsed `details`;
5. the related-to section (synonym discussion) as a collapsed `details`;
6. any remaining visible source content rendered loosely.

### Information units

The renderer recognizes the following source classes and emits the named
units. Levels follow the six-level source model (1 entry, 2 verb group,
3 sense, 4 subsense, 5 definition, 6 note/example/reference). Styling is
delivered by the dictionary stylesheet `styles.css` (selectors on
`data-sc-content`); the renderer emits no inline styles.

| Source evidence | Unit | Tag and styling |
| --- | --- | --- |
| `.hword > sup` | `homograph-number` | `span`, superscript, 0.75em |
| `.hword` when display differs from the searchable term | `headword-display` > `syllabification-marker` | `div`/`span`, italic |
| `.lbs` / `.lb` | `entry-qualifier` | `span` |
| `.prs` / `.pr` | `pronunciation` | `span`, italic, margin-left; source-supported readings are wrapped in `/…/`; `¦` normalized to `ˈ`, zero-width spaces removed; annotation prose (segments with `.mw_t_it` markup, whether containing or contained by a `.pr`) and inter-element punctuation (`.addPunct`, `.pun`) are preserved outside reading delimiters; ambiguous text receives no invented IPA delimiters |
| `.mw` inside `.pr` / `.prt-a` | `pronunciation-reading` | `span`, nowrap; each source-supported reading fragment gets its own `/…/` boundary and remains nested under the owning pronunciation unit |
| explanatory text inside `.pr` / `.prt-a` | `pronunciation-note` | `span`, normal muted text outside IPA delimiters; preserve ambiguous source text rather than inventing reading markup |
| `.vg-ins`, `.il`, `.if`, `.ix` | `inflection-group`, `inflection-label`, `inflection-marker` | `div`/`span`, italic labels; header forms retain their ordered group, while sense-local form text stays in one source-order flow |
| `.prt-a`, `.mw` | `form-pronunciation` | `span`, italic; preserve every alternate-form reading and its local qualifier in source order |
| `.vr` (header, phrase, and run-in inside sense bodies), `.vl`, `.va` | `alternate-form`, `variant-qualifier` | block `div` in header/phrase contexts, inline `span` for run-in variants inside senses; italic |
| `.vd` | `verb-subtype` | `div`, bold |
| `.sgram` | `grammar-label` | `span`, italic |
| `.sl` / `.sls > .sl` / `.lb` | `tag` (category `usage` or `definition`, sourceUnit `sense-label` or `definition-label`) | `span`, italic, title = label; local structured content only, never global tag-bank metadata |
| `.sn` with `.num`/`.letter`/`.sub-num` | `mwu-level` `ol` + `sense-number`/`subsense-letter`/`definition-number` `li` | nested `ol`, decimal / lower-alpha / decimal |
| `.dt` | `definition` | `span`, or `div` when it contains block units |
| `.uns` / `.un` / `.mdash` / `.unText` | `usage-note` | `div`, italic, margin-left 1em; the em dash gets a trailing space; nested `.un` notes are each emitted as their own `usage-note`, with examples scoped to the note that owns them |
| `.vis` / `.vi` / `.ex-sent-group` / `.ex-sent` | `example-sentence`, `extra-examples` | `div`, margin-left 1em; first example visible, the rest collapsed in a `details` with an `N more examples` summary |
| `.mw_t_wi` | `target-highlight` | `span`, orange background, bold |
| `.aq` / `.auth` / `.aqdate` | `example-source` | `div`, italic, 0.9em, margin-left 1em; one attribution per example, matched to its own `ex-sent-group` (never inherited from a sibling) |
| `.source` / `.auth` not under `.aq` | `example-source-inline` | `span`, italic; an attribution or citation kept inline within its sentence at normal size |
| `.dx-jump` / `.mw_t_dxt` | `comparison-reference` + `cross-reference` (relation `compare`) | `div` / `span`, underline |
| `.cxl-ref` / `.cxl` / `.cxt` | `variant-reference` + `cross-reference` (relation `variant`) | `span` |
| `.mw_t_mat`, `.mw_t_sx`, `.mw_t_sc` outside synonym entry heads | `cross-reference` (relations `origin`, `see`, `related`) | `span`, underline |
| `.ca`, `.intro`, `.cat`, `.ucat` | `called-also` | `span` |
| `.sdsense`, `.sd` | definition continuation (no separate unit) | inline |
| `.see-in-addition` | `see-in-addition` | `div` |
| `.urefs .ur` | `usage-discussion-reference` | `span`/`div`, source-order text; preserve the visible target but emit no interactive link and do not copy the target discussion |
| `.section[data-id=origin]` | `origin` details + `origin-section-title` + `origin-text` | `details` (collapsed) / `summary` / `div` |
| `.section[data-id=related-to]` | `related-item` details + `synonym-discussion` | `details` (collapsed) / `div`; the body keeps an introductory synonym-term-group, term-specific synonym-entry units, examples, sources, and a separate see-in-addition line |
| `.syn` introductory `.mw_t_sc` run | `synonym-term-group` + `synonym-term` | `div` / `span`; preserve each compared term and its source punctuation as one local group, without making the term clickable |
| `.syn` prose before the first repeated term | `synonym-introduction` | `div`; owns the comparison introduction and its local examples; a named pointer such as `take` remains an ordinary related cross-reference inside it |
| `.syn` source-boundary-confirmed `.mw_t_sc` terms | `synonym-entry` + `synonym-explanation` + `synonym-term` | `div` / inline `span`; each term owns its explanation, target highlights, attributions, and one-visible-plus-collapsed-extra example flow |
| `.syn` embedded `.mw_t_sc` terms inside an entry explanation | `cross-reference` | `span`; preserve the term in the same prose flow and do not create a second entry |
| `.uro` / `.ure` | `undefined-run-on` + `run-on-form` | `div` parent-only relation with inline form, pronunciation, POS, labels, and inflection markers; no independent record or soft link |
| `.dro` / `.drp` | `phrase` details + `definition-flow` | `details` (collapsed) / `div` |

Internal navigation targets are discarded (`bword://`, `gdlookup://`, and
`sound://` hrefs never survive); visible link text is kept. `em`/`mw_t_it`
become italic `span` nodes with `data-content = emphasis` (Yomitan's
structured-content generator drops unknown tags, so `<em>` is never emitted
as a tag), `strong`/`b` become bold `data-content = strong` spans, `sup`
becomes `data-content = superscript-reference` spans, and `p` is
transparent. `.mw_t_bc` is rendered as
plain colon text. `First Known Use` paragraphs and `.entry-status` images are
excluded from output, matching the information-unit catalog's ignore list.

The `tag` unit in this table is a local structured-content marker. It must not
be confused with Yomitan's term or definition tag-bank fields: labels such as
`archaic`, `British`, `slang`, and `of a blade` stay beside the exact owner
that they qualify. A usage-discussion reference follows the same fidelity
rule: its visible source pointer remains, but it has no false navigation
affordance.

### Sense hierarchy

Senses are collected from `.sense` and `.sen` containers whose nearest `.sb`
is the current one, in document order. Each container's marker path comes
from its `.sn` (`.num` → level 3, `.letter` → level 4, `.sub-num` → level 5).
A sense without its own marker at a level inherits the previous sense's
marker at that level — this reproduces MWU's `1a(1)`, `1a(2)`, `1b(1)` runs
and the `hand` shape where a numbered `.sen` is followed by lettered
`.sense` containers. Bare senses (no `.sn`) render directly into the parent
flow. The resolved paths are grouped into nested `ol` lists: level 3 uses
`decimal`, level 4 `lower-alpha`, level 5 `decimal`; each `li` carries its
source marker in `data.sourceMarker`.

Each sense's content is wrapped in a `definition-flow` `div` at the sense's
level. Verb subtypes (`.vd`) are emitted as bold `verb-subtype` blocks before
the sense list they own; `.sls` group labels render before the senses they
qualify. `.vg` blocks inside `.dro` are rendered by the phrase section and
excluded from the definition section, so phrase content is parsed exactly
once.

### Example groups

One `.vis` (or a bare `.ex-sent-group`) is one local example group: its first
example renders as a visible `example-sentence` `div`, and every later
example is collapsed into an `extra-examples` `details` with a
`N more examples` summary. Attributions (`— Author`) stay attached to their
own example. The `→` arrow prefix of a source example is presentation
metadata and is dropped.

### Undefined run-ons and local form flow

An undefined `.uro` derivative is rendered as a compact child of its parent
entry. Its form, pronunciation, part of speech, labels, and inflection markers
remain in source order, for example:

```text
in–ness /ˈin-nəs/ noun, plural -es
```

The derivative has no independent definition tree, so it never creates a
canonical record or soft link. A sense-local form such as `turns` remains
ordinary inline text. Its `plural` label and the `menses` cross-reference stay
in the same responsive flow:

```text
c turns plural : menses
```

The renderer must not introduce a block break merely because the source uses
separate inline spans for the form and label.

### Synonym discussion

The related section is one collapsed `related-item` disclosure by default.
When opened, its `synonym-discussion` body has this semantic shape:

```text
synonym-term-group: seize, grasp, clutch, snatch, grab
synonym-entry: seize
synonym-entry: grasp
synonym-entry: clutch
synonym-entry: snatch
synonym-entry: grab
see-in-addition: attract, receive
```

The introductory explanation may contain `take` as a normal cross-reference;
`take` is not an additional synonym entry. Each synonym entry owns its
explanation, linked terms, target highlights, examples, and attributions.
Each local example group shows one example first and collapses additional
examples behind the normal extra-example disclosure. The presentation is
text-led and dictionary-like: linked term headings, readable prose, indented
examples, subtle separators, and responsive wrapping rather than generic
nested containers or a card grid.

The source markup is not itself a reliable entry boundary: MWU can place
multiple `.mw_t_sc` anchors in one description. For example, the displayed
`twirl adds to the ideas of spin and whirl those of dexterity ...` is one
`synonym-entry`; `twirl` is its local head and `spin`/`whirl` are inline
`cross-reference` units. Entry boundaries are inferred from the surrounding
source sentence/example structure, not from the presence of a matching anchor
alone.

### Part-of-speech tags

The `.fl` label maps to the Yomitan `definitionTags` field (the WTY-style
chip shown beside the definition):

- `noun` → `n`, `adjective` → `adj`, `verb` → `v`, `adverb` → `adv`,
  `pronoun` → `pron`, `conjunction` → `conj`, `preposition` → `prep`,
  `interjection` → `interj`, `abbreviation` → `abbr`, `symbol` → `symbol`,
  `prefix` → `prefix`, `suffix` → `suffix`, `combining form` → `comb`;
- verb subtypes collapse to `v` (`transitive verb`, `intransitive verb`,
  `verb, transitive + intransitive`, …);
- special forms: `geographical name` → `geo`, `biographical name` → `bio`,
  `proper noun` → `prop n`, `trademark`/`service mark`/`certification mark`
  → `trademark`, idioms/phrases → `phrase`, `auxiliary verb` → `aux`,
  articles → `art`, `contraction` → `contraction`, `affix` → `affix`;
- compounds join mapped parts with ` or ` (`adjective or noun` → `adj or n`);
- parenthesized alternates (`adverb (or adjective)`) drop the parenthetical;
- `noun … in construction` forms collapse to `n`, `plural noun` to `n pl`;
- unknown labels keep their cleaned source text as a tag.

The hand-authored fixture placed the `Origin of WHAT` details inside
`mwu-header`; the production renderer keeps source order instead, so the
origin section appears at the bottom of the entry like MWU itself. This is
the only deliberate layout divergence from the fixture.

### Renderer findings

Unknown visible tags or classes still produce one
`unsupported-visible-subtree` finding with the source position and a preview,
and an entry whose rendered visible text is empty fails the conversion with
`empty-canonical-definition` exactly like the previous renderer.

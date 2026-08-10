# Merriam-Webster Unabridged Dictionary

The context that converts the Merriam-Webster Unabridged 2024 source (SQLite
`word`/`alt` rows containing HTML articles) into a Yomitan term-bank
dictionary. It separates the source model (levels and information units),
Level 1 entry generation (canonical entries and soft-link entries), and the
serialized Yomitan output model (records, sequence, popularity).

## Language

### Source model

**Source word row**:
One row of the SQLite `word(id, w, m)` table: a source article and its lookup
spelling. A row is not an entry; one row may host several entries.
_Avoid_: entry, article

**Independent mean**:
An MWU headword/POS block (`<mean>`) with its own lexical identity and
definition tree. Same-spelling means stay separate entries.
_Avoid_: entry, definition block

**Dedicated word row**:
A source row whose decoded `word.w` equals an embedded mean's spelling; it
owns that spelling without semantic comparison.
_Avoid_: owner row

**Searchable headword**:
The lookup spelling extracted from `.hword` after removing the homograph
number and confirmed syllabification markers and trimming boundary whitespace.
Punctuation, internal spaces, and diacritics remain significant.

**Headword display**:
The rich visible headword form (homograph number, syllable dots) preserved
for rendering.

**Syllabification marker**:
A display-only `·` (U+00B7) marking syllable boundaries; removed from the
searchable headword, kept in the display.

**Homograph number**:
The small `<sup>` number distinguishing same-spelling means; identity
metadata, not part of the searchable term.

**Alt index row**:
An `alt(id, w)` lookup-index row whose semantic relationship is
unclassified; the build skips it.
_Avoid_: alternate form, variant row

**Information unit**:
One recognizable kind of dictionary information — content, marker,
relationship, presentation, or derived observation — recognized through
`DOM node → unit → nearest owner → level → status`.

**Level**:
The source semantic depth position: 1 lexical entry, 2 verb subgroup,
3 numbered sense, 4 lettered subsense, 5 individual definition, 6 example,
note, or reference.

### Level 1 entries

**Canonical entry**:
A Level 1 entry that owns one parsed definition tree and normally serializes
to one term-bank record. Kinds: `main-canonical-entry`,
`alternative-spelling-canonical-entry`, `drp-phrase-canonical-entry`.
_Avoid_: definition record

**main-canonical-entry**:
A canonical entry whose searchable spelling matches its row's decoded
`word.w` (ownership Case 1).

**alternative-spelling-canonical-entry**:
A canonical entry emitted from an embedded mean whose spelling differs from
its row's key, when no dedicated row exists (Case 2). The name also covers
the Case 3 target family, where the dedicated row emits the entry instead.

**drp-phrase-canonical-entry**:
A canonical entry owned by a defined `.drp` phrase; the parent entry retains
the phrase section.

**soft-link-entry**:
A Level 1 entry that owns a searchable relationship instead of a definition:
a lookup spelling and a canonical target spelling. It serializes to a
dictionary-deinflection tuple and never copies the target's definition.

**Ownership decision**:
The per-mean ruling on who emits the entry: `emit-current`,
`emit-embedded`, or `defer-to-dedicated-row`.

### Soft-link relationships

**main-to-alternative-spelling-soft-link**:
The lookup route from a row's decoded `word.w` spelling to a hosted
different-spelling mean headword (Cases 2 and 3 both receive it).

**vr-mean-alternate-soft-link**:
An explicit alternate (`.va`) attached to an independent mean, pointing to
that mean's headword. `vr` is the domain label; the current source marker is
`.va`.

**phrase-alternate-soft-link**:
An explicit alternate attached to a defined phrase, pointing to the phrase's
canonical spelling.

**bare-affix-soft-link**:
The extra lookup route made by removing only the boundary hyphen of a marked
affix or marked alternate (for example `il` → `in-`).

**cxl-ref-variant-reference-soft-link**:
The lookup route from a definition-free mean's `.cxl-ref` variant reference
to its referenced spelling (for example `O` → `oh` with the relation phrase
`variant spelling of` as the rule). The target comes from the `.cxt`
`bword://` href, never the visible anchor text; only confirmed variant
family phrases emit a link, and the referenced row joins the build
dependencies.

**Variant qualifier**:
Text describing how an alternate relates to its canonical form (`or`,
`or less commonly`), preserved beside the relationship.

### Output model

**Term-bank record**:
One serialized Yomitan `TermInformation` tuple (term, reading, tags,
popularity, definitions, sequence). Records and entries are not one-to-one.
_Avoid_: entry

**Sequence**:
The Yomitan field that groups canonical records by searchable spelling for
display; not a unique record counter. Soft-link records keep their own
sequence.

**Popularity**:
A selected-root rank, not a count: `100` when the term equals a selected
root's `word.w`, `0` for other canonical terms, `-100` for soft links.

**Structured content**:
Yomitan's node-based content representation that carries the rendered
definition tree of a canonical record.

**Rendered HTML**:
The exact HTML Yomitan's runtime generator produces from a structured-content
node. It carries the structure back in `data-sc-content`/`data-sc-level`
attributes, so it is both the display artifact and the enforced render
contract.
_Avoid_: render output (ambiguous with the source renderer)

**Phrase section summary**:
The visible summary line of a collapsed phrase section. It carries the
phrase headword together with its alternate spellings (for example
`what's what or what is what or what was what`), matching the source phrase
line; the definition stays in the collapsed body.

### Structured-content vocabulary

**MWU structured entry header**:
The Level 1 structured-content region before the definition tree that contains
source-owned pronunciation, pronunciation notes, and inflection groups. It
excludes Yomitan-owned headword and tag metadata.
_Avoid_: head, header

**Structured-content unit**:
A named piece of dictionary content, marker, relationship, or presentation
metadata that remains attached to its nearest source owner and source order,
even when it renders inline.
_Avoid_: anonymous wrapper, flattened text

**Local tag**:
A short usage, register, subject, applicability, grammar, or definition
qualifier inside structured content. Examples such as `archaic`, `cricket`,
`of a ship`, and `transitive verb` are dictionary-owned by a nearby verb
subgroup, sense, form, or definition, not Yomitan tag-bank metadata.
_Avoid_: local label, global tag, term tag (when the scope is local)

**Pronunciation reading**:
A source-marked phonetic reading that may be styled as IPA-like display text.
Only source-supported readings receive reading delimiters; ambiguous text is
preserved without invented pronunciation styling.

**Pronunciation note**:
Explanatory pronunciation text, such as a condition or usage note, that stays
outside reading delimiters and remains attached to the pronunciation owner.

**Undefined run-on**:
A derivative displayed under a parent entry without its own definition tree.
It may carry form, pronunciation, label, and inflection information but does
not become an independent searchable entry or soft link.
_Avoid_: searchable derivative, soft-link entry

**Synonym discussion**:
Related entry-level prose that compares terms and their usage differences. It
has one introductory term group, one structured entry per compared term, and
separate example and additional-reference content.

**Synonym entry**:
One term-specific explanation inside a synonym discussion, owning its term,
explanation, examples, attributions, and local cross-references.

**Usage-discussion reference**:
A visible source pointer from a definition to a separate usage discussion. It
preserves the source relationship and target text but is not an interactive
link or a copied discussion.

**Unclassified visible content**:
Visible source content whose semantic class is not yet recognized. Preserve it
inside its known owner and report the missing classification rather than
silently dropping or flattening it.

**Origin section**:
The titled, collapsed etymology container of an entry (for example
"Origin of WHAT"), rendered as one disclosure whose body holds the
etymological history.
_Avoid_: etymology (when the section container is meant)

**First-known-use**:
The earliest recorded use of an entry, preserved verbatim as the last line of
the origin section, often with a sense reference (for example "before 12th
century (sense 1a(1))").
_Avoid_: FKU

**Dictionary-deinflection tuple**:
The Yomitan shape a soft-link record serializes to: a target canonical term
plus an inflection-rule chain (for example `alternative`).

**Selected root**:
A user-requested lookup word whose row starts the build and defines the
`100` popularity set.

**Dependency row**:
A row pulled into the build because a canonical target needs it (dedicated
row deferral), recorded with its reason.

## Tooling

**Yomitan fixture**:
The unpacked Yomitan extension under
`packages/merriam_webster_unabridged/tests/fixture/yomitan-chrome-playwright`
used by the e2e loop (`inspect:dict`) and by the archive schema tests
(its `lib/validate-schemas.js`). Dev-local and gitignored. Refresh it with
`bun run update:fixture` (defaults to the newest upstream release tag;
`--ref master` for the latest development build, `--ref <tag>` to pin an
older release); provenance is recorded in
`tests/fixture/UPSTREAM.json`, and the source cache lives in
`tests/fixture/yomitan-src` (excluded from `bun test` discovery via
`bunfig.toml`).

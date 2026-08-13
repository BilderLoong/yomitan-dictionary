# MWU HTML Survey

Status: living reconnaissance document; detailed per-word source evidence is
kept in separate archived reports.

This README is the shared survey vocabulary and method. It is organized in
this order:

1. information-unit catalog;
2. named levels and the information each level can contain;
3. evidence-file references;
4. cross-word rules, workflow, and open questions.

The approved rules for turning source rows and definition-bearing structures
into canonical and soft-link lexical entries are documented separately in
[MWU Level 1 entry generation](../../openspec/specs/mwu-level-1-entry-generation/spec.md).

Detailed reports are intentionally kept outside this README:

- [what evidence](archived/what.md)
- [turn evidence](archived/turn.md)
- [2026-08-03 design-fixture status checkpoint](archived/2026-08-03-design-fixture-status.md)

The survey names source information without copying complete dictionary
entries. Complete entries remain available through GoldenDict.

## What an information unit is

An information unit is a recognizable kind of dictionary information, not
necessarily one HTML element or one Yomitan field. Examples include a
part-of-speech label, a definition, an example sentence, or a called-also
relation.

An information unit may be:

- content, such as a definition or example;
- a marker, such as a sense number or letter;
- a relationship, such as an alternate form or cross-reference;
- presentation metadata, such as target highlighting;
- a derived observation, such as an interposed-object candidate.

A DOM container may contain several information units. For example, `.dt` can
contain definition text, examples, comparisons, called-also text, and a
sub-definition. Recognizing `.dt` does not mean that all of its descendants
are recognized.

The survey uses this distinction:

```text
DOM node → semantic information unit → nearest owner → level → survey status
```

The status describes our reconnaissance knowledge, not whether the eventual
parser has been implemented.

## Information-unit catalog

An information unit is one recognizable kind of dictionary information. The
catalog deliberately separates the source information name from its eventual
Yomitan field or visual rendering.

The catalog is machine data, not prose: the single source of truth is
`packages/merriam_webster_unabridged/src/survey/catalog-data.ts` — typed
unit rows (unit name, explanation, examples, related classes, level and
binding, Ignore flag, row counts, state, build appearance, to-do), the
class→unit→level map the survey inspector consumes, and the ignored-units
list derived from the Ignore flag. Change that file when the catalog
changes; nothing in this README duplicates the table anymore.

The survey inspector (`bun run survey:inspect`) reports every source element
in this vocabulary. The rules below clarify semantics the data file does not
encode:

For generation metadata and derived output units, `Ignore=false` means the
unit is needed by the generation model or report. It does not mean that the
unit is rendered as visible definition content. For example,
`source-word-row`, `dedicated-word-row`, and `source-row-membership` are used
to generate entries and links but are not displayed as dictionary sections.

For `searchable-headword`, boundary whitespace is trimmed only for lookup
identity. The rich `headword-display` retains the source presentation, while
meaningful punctuation and internal phrase spaces remain searchable.

The current evidence confirms only the U+00B7 MIDDLE DOT in `lit·tle` as a
syllabification marker. Other visual markers may exist, so the survey and
future build report must list unfamiliar headword markup instead of silently
removing it or treating it as an ordinary spelling character.

The catalog distinguishes confirmed observations from candidates. A
candidate unit remains named so that the survey tool can report it as not yet
recognized instead of silently dropping it.

## Current recognition status

This is the current status from the detailed reports for `what`, `turn`,
`take`, and `run`, plus the latest 12-word read-only reconnaissance. It is
deliberately separate from the catalog's `Ignore` column:
`Ignore=true` means we understand the information but have chosen not to put it
in the current dictionary, while `not yet recognized` means our source model
is incomplete.

### Confirmed semantic units

These units have evidence for their meaning and nearest-level ownership:

- lexical-entry;
- part-of-speech, entry-qualifier, and verb-subtype;
- pronunciation, pronunciation-reading, pronunciation-note, and
  form-pronunciation;
- inflection, inflection-group, inflection-label, and inflection-marker;
- origin and origin-section-title;
- sense-number, subsense-letter, and definition-number;
- sense-label, definition-label, definition, and sub-definition;
- usage-note, example-sentence, extra-examples, example-source, and
  example-date;
- comparison-reference, cross-reference, and relation-reference;
- phrase, `drp-phrase-canonical-entry`, and `phrase-alternate-soft-link`;
- undefined-run-on and run-on-form;
- variant-qualifier, grammar-label, related-item, see-in-addition,
  called-also, called-also-number, synonym-discussion, synonym-term-group,
  synonym-term, synonym-introduction, synonym-entry, synonym-explanation,
  synonym-discussion-reference, and usage-discussion-reference;
- target-highlight and superscript-reference.

The same unit can bind to different levels. For example, `.fl` is Level 1 for
an entry header but belongs to a phrase when it appears directly after `.drp`.

The current design fixture is hand-authored JSON, not parser output. It uses
these confirmed units to define the intended structured-content contract for
`what` and the selected expansion. The separate v1 selected-word builder now
uses a conservative owner-local renderer and the approved Level 1 ownership
and relationship rules; it does not claim complete Level 1-6 semantic
coverage.

### Selected-word v1 implementation

The production path accepts explicit `--words` and `--words-file` targets,
builds a lightweight decoded source-row index, loads selected HTML rows on
demand, and adds dedicated rows required by canonical soft-link targets. It
emits `main-canonical-entry`, `alternative-spelling-canonical-entry`, and
`drp-phrase-canonical-entry` records plus
`main-to-alternative-spelling-soft-link`, `vr-mean-alternate-soft-link`,
`phrase-alternate-soft-link`, `cxl-ref-soft-link`, and
source-confirmed `bare-affix-soft-link`
records. Each soft link keeps its target and rules without copying the
canonical definition. A cross-reference-only `<mean>` (for example `O` in
the `o` row) emits its relation-reference soft link from the `.cxt`
`bword://` target with the exact relation phrase as the rule. Defined
`.drp` phrases whose examples show the interposed-object pattern serialize
the `v_phr` rule in the term-bank rules field.

The build writes a deterministic `build-report.json` containing input
evidence, source rows, ownership decisions, dependency reasons, relationship
evidence, findings, rejections, fatal errors, output-record totals, and the
archive path. A successful archive is checked against the repository's
Yomitan schemas and imported with the bundled Chromium harness.

Structured content now follows the six-level model end to end. The renderer
(`src/conversion/renderStructuredContent.ts`) emits an `mwu-entry` root with
a header (homograph number, headword display, entry qualifier,
pronunciation, inflection group, alternate forms), verb-subtype labels,
nested sense lists (`1.`, `a.`, `1.` via `.sn` marker paths with MWU-style
inheritance), definitions, usage notes, example groups with one visible
example and an `N more examples` collapse, example attributions, orange
target highlighting, called-also, comparison and cross references, collapsed
origin and synonym-discussion sections, and collapsed phrase sections.
Definition tags are Yomitan-rendered chips derived from `.fl` (`noun` → `n`,
`transitive verb` → `v`, …) with Yomitan's default styling; the dictionary
stylesheet does not restyle Yomitan's own UI. The full unit contract is
documented in
[MWU Level 1 entry generation](../../openspec/specs/mwu-level-1-entry-generation/spec.md). Audio,
full-database coverage, and richer media remain future work.

### Confirmed containers and structural rules

These are understood as containers or boundary signals, not automatically as
new information units or new levels:

- `<mean>` as a lexical/POS boundary;
- `.vg` as a sense-group container;
- `.vd` as a Level 2 verb subgroup;
- `.sb`, `.sense`, `.sen`, and `.pseq` as sense/definition containers;
- `.dro` as a phrase collection and `.drp` as an individual phrase boundary;
- `.dt` as definition content that may contain child units;
- `.un` as a usage-note container that may contain examples;
- `.prs` as a pronunciation container;
- `.vg-ins` as an ordered inflection-group container;
- `.prt-a` as a pronunciation container for a form or variant;
- `.related-to` as a related-information container.
- `.widget` as a presentation wrapper around some related-information
  sections; it is not itself a dictionary information unit.

### Confirmed derived unit

`interposed-object-candidate` is derived from paired `.mw_t_wi` spans with
intervening text. It is evidence observed at the example level and points to
the canonical Level 1 phrase; it is not a literal MWU HTML class.

### Latest 12-word reconnaissance

The additional exact lookup words were:

    set, make, put, break, go, work, process, look,
    give, have, play, hand

This scan refined the catalog without adding a hierarchy level:

- `.vg-ins` can contain several ordered forms, `.il` labels, `.ix` markers,
  and pronunciation blocks. `have` shows `past had`, `past participle had`,
  and `present participle having` in one form group.
- `.il` carries form-local labels such as `past`, `past participle`, `or
  dialectal`, and `also archaic 2d singular`. These are not global tags by
  default; they stay beside the form they qualify.
- `.ix` carries markers such as `-s`, `-es`, and `-ed/-ing/-s`. They are form
  metadata, not new searchable entries.
- `.prt-a` and `.mw` carry one or more readings for an inflected or alternate
  form. `process` has four visible readings for one plural form, while `put`
  has two readings with a local `chiefly dialectal` qualifier.
- `.vl` carries alternate-form relation text such as `or less commonly` and
  `or`. It belongs to the alternate expression, not to the parent sense.
- `.aqdate` carries dates such as `May 1991` and `November 2001` inside an
  example attribution.
- `.mw_t_mat` carries etymological `more at` references such as `more at
  1set`; these are Level 1 cross-references under origin.
- `.srefs` with `.sr` carries pointers such as `See Synonym Discussion at
  fun, play:2, room`; the pointer remains separate from the discussion body.
- `hand` contains one `<img>` under `.entry-status`. It is an entry-status
  image, not definition content, and is therefore cataloged with `Ignore=true`.

The 12 words contained no table, list, details, or audio elements. Classes
such as `.mw_t_bc`, `.first-slash`, `.last-slash`, `.addPunct`, `.sents`, and
accordion/layout classes remain presentation or boundary markup, not new
information units.

### 2026-08-07 full-database audits

Four read-only audits of the whole `word(id, w, m)` table (470,444 rows)
classified the remaining superscript, line-break, class, and media shapes.
Per-class evidence lives in the scratch tickets
(`.scratch/mwu-source-research/issues/01-07`); this section records the
decisions.

#### Superscript shapes

Six distinct shapes exist; only four were hypothesized:

| Shape | Source markup | Owner | Render treatment |
| --- | --- | --- | --- |
| headword homograph number | `sup` in `.hword` (76% of sample) | Level 1 identity | `homograph-number` header unit, stripped from the searchable term (implemented) |
| sense reference | NOT a `sup`: `.text-lowercase` span after a reference anchor (`1a`, `8`, `1a(1)`) | the preceding `cross-reference` | `superscript-reference` unit, lowered presentation (implemented 2026-08-07) |
| cross-reference number | `sup` inside the anchor — homograph prefix of the `bword://TARGET[N]` target (22% of sample) | the reference anchor | generic `superscript-reference`; `a.mw_t_et_link` now carries the `origin` relation like `.mw_t_mat` (implemented) |
| called-also reference number | does not exist | n/a | nothing to render; leading digits in `.cat` anchors are chemical names |
| pronunciation superscript | literal `sup` in `.prs`/`.pr` reading content (`'em <sup>21</sup>`) | `pronunciation` | generic `superscript-reference` |
| chemical-formula superscript | literal `sup` for charge/ion notation in examples/definitions (`Ca2+`) | `example-sentence`/`definition` | generic `superscript-reference` |

Sense markers themselves never use `sup`: `.sn` carries plain `.num`/`.letter`
spans.

#### Line-break shapes

- `.breakpoint`/`.breakpoints` (287,509 rows) occur ONLY inside
  `h1.hword` as responsive line-break chunks — never in definitions or
  labels. Their boundaries are presentation, not syllables: `1 1/3` splits
  as `pi|tch`, `3-D printer` as `pr|in|ter`. `.no-hyphen` chunks simply end
  in an already-present `·` or `–`, so no hyphen is added at wrap. The
  renderer preserves them transparently inside `headword-display`.
- Literal `<br>` (62 rows, 70 elements) occurs only inside Level 6 usage
  prose (`div.usages > div.usage`, etymology `sub-well` paragraphs) as
  meaningful intra-prose breaks — zero occurrences inside
  `.sl`/`.fl`/`.il`/`.vl`/`.sgram`/`.lb` labels, definitions, or headwords.
- `.sls` (63,640 rows) is a structural block boundary: `div.sls > span.sl`
  direct child of `div.vg`, rendered as a `source-block-boundary` block —
  the `slang` case in `what's with` without any literal `<br>`.
- The renderer needs no line-break changes: inline labels never acquire
  accidental breaks (DB-wide zero co-occurrence), and breakpoint text is
  preserved as display content.

#### Class and media inventory

Fifteen previously unclassified classes are now resolved. Six become new
candidate units (`illustration`, `illustration-caption`, `phrase-date`,
`called-also-number`, `table-image`, `table-reference` — all added to the
catalog data); the rest map onto existing units: `.l` →
`pronunciation-note`; `.mw_t_a_link`, `.mw_t_i_link`, `.iw` →
`cross-reference`; `.sense-(a)`/`.sense-(b)` → `subsense-letter` (legacy
tokens, one row: `indirect`); `.disc` does not exist as a class (49k raw
matches are prose noise); `.mw_t_bold` (61) and `.visible-phone` (64,901,
all accordion `[+]` toggles) are presentation-only and intentionally
ignored.

Media: **no HTML `<table>` exists anywhere in the DB**. Every non-status
image (4,003 rows) is either an `.illustrations` artwork section (3,951) or
a `.table-image` page (52); the remaining 10,105 images are `.entry-status`
artwork. Dates split exactly: `.aqdate` (14,073 rows) = example-date;
`.date` (2 rows) = phrase-date.

The "In the build it appears as…" column below was verified 2026-08-07 by
building the representative rows (aardvark, anecdote, Alhambra, alligation,
indirect, abysm, alphabet, alabaster, Acrasiales, aground, the American way,
table_collegiate_alphabet) and inspecting the resulting ZIP records.

| Class | Rows | State | Information unit | In the build it appears as… | To do |
| --- | --- | --- | --- | --- | --- |
| `.caption` | 3,982 | resolved | illustration-caption | not emitted — illustration section ignored by decision (aardvark record has no illustration text) | media phase (deferred) |
| `.date` | 2 | resolved | phrase-date | not emitted — ignored (the American way record has no `1850`) | — (decided ignore) |
| `.disc` | 0 | n/a | — | n/a — the class does not exist | — |
| `.illustrations` | 3,984 | resolved | illustration | not emitted — ignored (aardvark) | media phase (deferred) |
| `.iw` | 158 | follow-up | cross-reference | plain text inside the inflection group (`see numbered senses`, anecdote) | consider emitting a marked cross-reference for catalog consistency |
| `.l` | 3,255 | follow-up | pronunciation-note | text merged inside the pronunciation-reading span (`/for 1 also ə-ˈlam-brə/`, Alhambra) | renderer contract says the note stays outside reading delimiters — align |
| `.mw_t_a_link` | 77,309 | resolved | cross-reference | cross-reference span, href discarded (`city in central ⟦ref:Alabama⟧`, Alabaster) | — |
| `.mw_t_bold` | 61 | resolved | presentation | `strong` span — bold preserved (`run aground`, aground) | — |
| `.mw_t_i_link` | 471 | resolved | cross-reference | cross-reference span (`genus ⟦ref:Acrasis⟧`, Acrasiales) | — |
| `.pn` | 59 | resolved | called-also-number | inline text (`(1)`, `(2)`, alligation) | — |
| `.sense-(a)` / `.sense-(b)` | 1 | resolved | subsense-letter | letter drawn by the CSS sense markers (indirect) | — |
| `.table-image` | 52 | open | table-image | no entry — the row yields a `missing-root` finding (table_collegiate_alphabet) | media phase; confirm the expected finding for direct table-page lookups |
| `.table-section` | 65 | resolved | table-reference | not emitted — ignored (alphabet record has no table pointer) | media phase (deferred) |
| `.visible-phone` | 64,901 | resolved | presentation | not emitted — presentation only (abysm) | — |

#### Presentation decisions

- **Nested citations**: example attributions stay attached to their owning
  example inside the collapse pattern; the `.sdsense`-sibling attribution
  shape (163/163 sampled) needs a small renderer traversal extension, which
  is implementation follow-up, not a presentation question.
- **Related inline items**: synonym term groups, terms, and introductions
  render as inline flow inside the collapsed related-item — current behavior
  accepted.
- **Called-also reference numbers**: rejected as a distinct unit — no such
  source pattern exists.
- **Level 6 `.see-in-addition`**: same compact non-interactive pointer
  treatment as Level 1 (`see-in-addition` unit); the `#usage-notes` and
  `.usage` placements (`because`, `finalize`, `he`, `one`, `they`) are
  confirmed but not yet wired through the renderer's usage-notes traversal
  (implementation follow-up).
- **`.sgram`**: stays scoped inline `grammar-label` content; tag-bank
  promotion remains deferred.

#### v_phr acceptance

`v_phr` is accepted for production. The evidence rule is two marked spans
with retained text between them, where "marked" means a `.mw_t_wi` target
highlight **or** a `.mw_t_it` emphasis span, and where the second marked
span equals the entry's final token (`take apart` row: 7 unique examples,
all verb + particle separation; `give up` row: `gave it up` proves
separability even though it is emphasis-marked). A 2026-08-08 full-database
audit measured the emphasis relaxation: 133 → 576 candidate rows (+443), of
which the spurious classes — italic titles (`Vanity Fair`, `King Lear`),
repeated-word emphasis (`came … came`), cross-idiom contamination (`did
herself proud` inside `do away with`), split-idiom objects (`batted in 70
runs`) — are all excluded by the final-token equality filter. The
repeated-verb `give … give` shape in the `give` row is excluded by the
multiword gate (single-word entries never carry the rule). The final word is
not checked against Yomitan's particle list; Yomitan's lookup-time particle
check is the filter, so preposition-final phrases with genuine evidence (for
example `bring to`) may carry a flag that never fires. Since 2026-08-07 the
builder attaches the `v_phr` rule to canonical entries with candidate
examples (see [ADR 0005](../../adr/0005-tag-generation-rules.md)).

### Ten-word design-fixture expansion

The hand-authored design fixture then compared these ten additional source
families against their original HTML:

    turn, take, run, process, have, set, hand, give, in, o

This expansion did not introduce a new hierarchy level. It confirmed and
exercised the existing catalog in a broader range of ownership situations:

- `process` confirms that a visible syllabified `.hword` (`pro·cess`) can be
  retained for display while the canonical searchable term is `process`, and
  that a single form can carry several readings through `.prt-a`/`.mw`;
- `turn`, `take`, `run`, `set`, and `process` confirm that `.vd` groups are
  integer-ordered Level 2 children, while a separate intransitive-verb
  `<mean>` remains a separate Level 1 entry;
- `take` confirms `.drp` phrase ownership, phrase-local `.vr`/`.va`, and the
  paired-highlight evidence used for an `interposed-object-candidate`;
- `run` confirms that a phrase-local `.fl adverb` belongs to `by the run`, not
  to the parent noun `run`;
- `set` confirms `.ca`/called-also text inside a definition, block-local
  `or less commonly sett` variants beside senses 17 and 23, and the complete
  recognized set slice: 88 transitive senses, 24 intransitive senses, 16
  adjective senses, 80 noun senses, and 29 defined phrases;
- `hand` confirms `.sgram` grammar labels such as `transitive` and
  `transitive + intransitive` can occur immediately before a local sense
  definition. They remain scoped inline labels rather than new Level 2
  groups;
- `turn` confirms `.see-in-addition`/`.sa-link` is a distinct compact line
  inside the collapsed synonym discussion (`synonyms see in addition
  depend`). It is related information, not part of the main synonym prose;
- `in` confirms three prefix/combining-form meanings and two suffix meanings
  inside the source row, with the `main-to-alternative-spelling-soft-link`
  routes `in → in-` and
  `in → -in`;
- `o` confirms alternative-spelling canonical generation and dedicated-row
  deferral at the same time: `o-` and `-o` are emitted from the source row
  when no dedicated row exists, while `o'` and `oh` are owned by their
  dedicated rows and are reached by `main-to-alternative-spelling-soft-link`
  routes.

The associated source IDs, HTML sizes, output record counts, render checks, and
intentionally deferred source material are recorded in the
[`manual design-fixture coverage audit`](../../packages/merriam_webster_unabridged/design-fixtures/coverage-audit.md).

The all-candidate-row survey on 2026-08-03 found `.sgram` in 216 source rows.
The complete lookup-word list is kept in the generated JSON report; examples
include `abate`, `accordion`, `allocute`, `backhaul`, `hand`, `assimilate`,
`take`, `turn`, and `triggered`. The selected `set` row has no `.sgram`; its
`transitive verb` and `intransitive verb` text comes from `.vd` and is a
`verb-subtype`, not a `.sgram` grammar label.

The broad `.sgram` value inventory is `transitive`, `intransitive`,
`transitive + intransitive`, the same values with source trailing commas, and
the compact source value `T /I`. The fixture keeps these labels scoped inline
because their global tag scope is not stable yet.

To inspect every concrete lookup word without pasting 216 names into this
document:

```sh
jq -r '.inventories.sgram.lookupWords[]' \
  packages/merriam_webster_unabridged/build/design-what/mwu-html-evidence.json
```

The same scan found `.see-in-addition` in 433 rows. 428 are inside a
`.synonym-discussion`; the five outside-wrapper rows are `because`, `finalize`,
`he`, `one`, and `they`. DOM inspection shows that `because`, `finalize`,
`one`, and `they` place the line in `#usage-notes`, while `he` places it in a
definition-local `.usage` block. This confirms one information unit with two
observed owner levels: Level 1 for synonym discussion and Level 6 for usage
information.

It found 52,982 rows containing `<sup>`. Headword homograph numbers and local
cross-reference numbers are separate units. For example, `set` has header
numbers `1`, `2`, `3`, and `3`, plus cross-reference numbers in `3punch`,
`1set`, and `3set`. The fragment helper records each value and its owner class.
It also found 173,702 `br`/`breakpoint`/`breakpoints` markers and 3,661
definition-bearing phrase rows. The `slang` block in `what's with` confirms
that a source block boundary can require a line break even without a literal
`<br>`.

### Recognized but intentionally ignored

- `pronunciation-audio`: audio extraction is deferred;
- `phrase-date`: excluded from the current dictionary;
- `entry-status-image`: the observed image is header status artwork, not
  dictionary meaning;
- `illustration`, `illustration-caption`, `table-image`, and
  `table-reference`: definition artwork and table pages are surveyed but the
  media phase is deferred; no HTML tables exist to render;
- internal navigation targets such as `gdlookup://` and `bword://`: visible
  text may remain, but the source link target is discarded.

### Partially recognized or still candidate

- defined-derivative: `.uro` is confirmed as an undefined run-on structure,
  but the selector for a derivative with its own local definition will be
  recorded when one is encountered;
- raw `alt` table rows: treated as lookup metadata only and never used alone
  to create an entry; their source role is not an information unit we export;
- tag-bank eligibility: labels are preserved and inventoried first; no final
  tag bank is generated yet (see
  [ADR 0005](../../adr/0005-tag-generation-rules.md) for the decided
  boundary);
- `.sgram` tag promotion: the fixture renders it as scoped inline grammar text,
  but the complete inventory and WTY/Yomitan tag mapping are deferred. The
  inventory is now measurable with the all-row survey and names the concrete
  source words above;
- the renderer traversal for Level 6 `.see-in-addition` lines in
  `#usage-notes` and `.usage` (ownership confirmed; the 
  `def-accordion-sections`/`.usages > .usage` paths are not yet collected)
  and for `.sdsense`-sibling example attributions is implementation
  follow-up, not an open presentation question;
- general visual markup such as `.mw_t_it`: preserved as presentation evidence,
  but not assumed to carry semantic meaning;
- `.mw_t_bold` and `.visible-phone`: presentation-only wrappers, no unit.

### Not yet surveyed or not yet recognized

The current evidence does not yet establish:

- specialized related or derived-form sections;
- all phrase and variant shapes outside the surveyed `.dro`/`.vr`/`.va`
  patterns;
- all possible label-bearing classes and their WTY mappings;
- unknown descendants hidden inside already recognized containers;
- the full range of dense-word structures beyond the current evidence set
  and its historical snapshots.

Definition images and tables are now surveyed: images are exactly the
`.entry-status`, `.illustrations`, and `.table-image` containers, and no
HTML tables exist.

The future survey tool must report these separately as `not observed in this
word` or `present but unrecognized`; it must never silently classify them as
recognized merely because their parent container is known.

## Named levels

| Level | Name | Meaning |
| --- | --- | --- |
| Level 1 | Lexical Entry | One headword/POS block, including its lexical metadata and related phrase or form relations. |
| Level 2 | Verb Group | An integer-ordered verb subtype or source subgroup such as transitive or intransitive. |
| Level 3 | Numbered Sense | A broad numbered meaning such as 1 or 2. |
| Level 4 | Lettered Subsense | A lettered subdivision such as a, b, or c. |
| Level 5 | Individual Definition | A parenthesized definition such as (1) or (2). |
| Level 6 | Definition Attachment | Information attached to a specific definition or sense, such as usage notes, examples, and references. |

Level 2 replaces the earlier conceptual “1.5” level. It is an integer group
identifier, not a decimal. Not every word uses every level.

## What each level can contain

The table describes possible direct contents. A parent level also owns all
descendant levels below it.

| Level | Direct information units | Child or repeated structure |
| --- | --- | --- |
| Level 1 — Lexical Entry | lexical-entry, headword-display, part-of-speech, pronunciation, pronunciation-audio, inflection-group, inflection-label, inflection-marker, form-pronunciation, origin, first-known-use, related-item, synonym-discussion, synonym-discussion-reference, phrase, alternate-form, variant-qualifier, undefined-run-on, defined-derivative, broad cross-reference, entry-status-image | May contain Level 2 verb groups, or Level 3 senses directly when no verb group exists. pronunciation-audio, first-known-use, and entry-status-image are cataloged source units with Ignore=true. A phrase relation can have its own Level 3–6 tree. An undefined run-on remains parent-only. |
| Level 2 — Verb Group | verb-subtype, group-level label, group-level definition text | Contains Level 3 numbered senses and their Level 4–6 descendants. Source order supplies the integer group order when several .vd groups occur. |
| Level 3 — Numbered Sense | sense-number, sense-label, definition | May contain Level 4 lettered subsenses, Level 5 individual definitions, and Level 6 attachments. |
| Level 4 — Lettered Subsense | subsense-letter, sense-label, inflection, definition | May contain Level 5 individual definitions and Level 6 attachments. |
| Level 5 — Individual Definition | definition-number, definition-label, definition | Owns Level 6 usage notes, subordinate definitions, examples, citations, comparisons, and local references. |
| Level 6 — Definition Attachment | sub-definition, usage-note, example-sentence, extra-examples, example-source, example-date, comparison-reference, cross-reference, called-also, target-highlight | May nest usage notes and subordinate definitions. Example sources, dates, highlighting, and collapsed extra-example groups remain attached to the local owner. |

The source does not always print every inherited marker on every child. A
child can add a letter or parenthesized number while inheriting a broader
number from an ancestor.

## Ownership rule

For every source node, record:

    source node → nearest semantic owner → information unit → level

DOM ownership is more reliable than visual indentation or a CSS class name by
itself. The same source class can mean different things under different
ancestors. For example, .fl in an entry header is Level 1 part of speech,
while .fl inside .dro is phrase-level part of speech.

Apply the same rule to every newly encountered information unit: determine its
source boundary and nearest semantic owner, give the recognized unit a name,
and render it like MWU in source order at that Level 1–6 position. If the unit
is not understood yet, preserve its unknown subtree once at that owner and
report it; do not guess another level or recursively render its descendants a
second time.

## Evidence files

Word-specific observations, source counts, selectors, parser status, and
ownership examples belong in the per-word reports rather than this shared
README.

| Word | Evidence report | Use |
| --- | --- | --- |
| what | [archived/what.md](archived/what.md) | Detailed baseline evidence |
| turn | [archived/turn.md](archived/turn.md) | Detailed broad-coverage evidence |
| take | [archived/take.md](archived/take.md) | Defined run-on phrases, phrase alternates, and interposed-object examples |
| run | [archived/run.md](archived/run.md) | Phrase-local part of speech inside a .dro region |

The reports are evidence records, not converter specifications. The shared
catalog and cross-word rules may be updated when additional reports confirm,
refine, or contradict them.

## Confirmed cross-word rules

- A mean block is a useful Level 1 boundary, but descendant classes must be
  assigned by nearest owner.
- A verb entry can contain multiple .vd groups inside .vg. Source order gives
  their integer subgroup order.
- A separate intransitive-verb mean may exist without a .vd child. Level 2
  therefore describes the semantic grouping, not one mandatory HTML shape.
- Marker ownership is hierarchical. A child can add a letter or parenthesized
  number while inheriting a broader number from an ancestor.
- .pseq is a grouping container, not automatically a new display level.
- .un examples belong to usage-note content; examples directly under .dt
  belong to definition content.
- .sdsense is a Level 6 subordinate-definition unit, not a new numbered
  level.
- .sdsense is rendered as a normal continuation of its owning definition.
  Preserve MWU order: if examples occur before it, render the examples first
  and the subordinate text afterward. Keep the qualifier visually distinct
  in the MWU style, such as red italic specifically, without creating a new
  entry or numbered level.
- .fl can describe a top-level entry or a phrase, depending on its ancestor.
- `.vg-ins` is an ordered inflection-group container, not a new hierarchy
  level. Its `.il`, `.ix`, and `.prt-a` descendants remain attached to the
  exact form or variant they qualify.
- `.il` is a form-local inflection-label unit, while `.vl` is a relation
  qualifier for an alternate expression. Similar text such as `or` must not
  be merged when the DOM owners differ.
- `.prt-a` can contain multiple `.mw` readings for one form. Preserve their
  order and local qualifiers in structured content rather than using the
  Yomitan reading field.
- `.aqdate` is part of example attribution and remains attached to the
  Level 6 example.
- `.mw_t_mat` is a Level 1 cross-reference inside origin, while `.sr` is a
  Level 1 pointer to a synonym discussion. Both retain visible text but lose
  their internal navigation targets.
- `.urefs .ur` is a Level 6 usage-discussion-reference. It preserves the
  source pointer as non-interactive text; it must not become a false link or
  duplicate the target discussion.
- A `.related-to` synonym discussion is one collapsed related-item whose body
  has an introductory synonym-term-group, one synonym-entry per compared
  term, and a separate `.see-in-addition` line. The introductory `take`
  reference belongs to its explanation, not to the term group.
- In the synonym body, `.mw_t_sc` is role-sensitive: a source-boundary-confirmed
  comparison term becomes a local synonym-term entry head, while a term inside
  that entry's prose remains an inline cross-reference. Do not split an entry
  merely because another `.mw_t_sc` appears in its description. The head and
  prose stay in one inline display flow, with examples and attributions owned
  by that entry.
- An image under `.entry-status` is presentation/status artwork and is
  cataloged with `Ignore=true`; this does not decide how definition images
  will be handled if later reconnaissance finds them.
- .dro is a defined-run-on phrase collection, not a numbered-sense level.
  Each .drp phrase inside it is independently defined and has its own phrase
  identity and nested definition tree. Do not merge adjacent .drp items.
- A parent lexical entry retains its .dro phrase section. Each defined .drp
  has its own source phrase boundary and definition tree and becomes an
  independent searchable phrase entry. The extracted phrase body replaces
  GoldenDict-only navigation such as `See: 1 take`; that navigation text is
  not emitted as the phrase definition. In all cases, adjacent .drp items
  must not be merged.
- A .vr/.va immediately following a .drp belongs to that phrase in the source.
  For example, take stage has take the stage, and take the word has the less
  common take up the word. Each defined phrase form is searchable. The
  canonical form stores structured content and the alternative uses a Yomitan
  dictionary-deinflection tuple pointing to the canonical form.
- A .fl immediately following a .drp belongs to that phrase. by the run has
  the phrase-local label adverb, even though its parent run entry is a noun
  block.
- `.dro > .uro > .ure` is an undefined run-on relation. In `abandon`,
  `abandoner` has pronunciation, noun and plural metadata, and examples but no
  definition. Preserve the run-on under `abandon`; do not create a searchable
  `abandoner` record or soft link.
- Interposed-object evidence comes from target-highlight spans such as take
  and apart with an object between them in an example. The canonical phrase
  remains take apart; the eventual Yomitan v_phr rule belongs to that phrase
  entry, and the converter should not create a wildcard term. Two highlights
  with retained text are necessary but not sufficient — a repeated-verb pair
  (`give me liberty or give me death`) is not interposed-object evidence;
  Yomitan's particle-list check rejects it at lookup time.
- MWU gdlookup:// and bword:// targets are source navigation. The current
  decision is to discard the target while retaining useful visible text.
- Examples should show the first one in each local example group and collapse
  the rest, while preserving target highlighting when possible.
- `.breakpoint`/`.breakpoints` chunks are responsive headword display
  wrapping, never syllables; `.no-hyphen` chunks carry their own `·` or `–`
  and must not gain a hyphen. Literal `<br>` inside Level 6 usage prose is a
  meaningful break; `.sls` is a structural block boundary. Inline labels
  never contain either shape.
- A `sup` inside a reference anchor is the target's homograph prefix
  (`bword://crow[1]` renders `<sup>1</sup>crow`); a `.text-lowercase` span
  directly after a reference anchor carries the target's sense pointer
  (`1a`, `8`, `1a(1)`). Neither is a sense number of the current entry; both
  stay bound to the reference.
- `a.mw_t_et_link` is an etymology link and carries the same `origin`
  relation as `a.mw_t_mat`.
- `.mw_t_a_link` and `.mw_t_i_link` are plain/italic cross-reference anchors
  inside `.dt`; `.iw` is an in-word `see sense N` pointer whose visible text
  is encoded in its class tokens. All three are `cross-reference`.
- `.pn` parenthesized numbers inside `.ca` lists are `called-also-number`
  markers, not definition numbers.
- `.sense-(a)`/`.sense-(b)` are legacy `subsense-letter` tokens that mirror
  the `.letter` child text; no parser special-casing is needed.
- Definition artwork (`.illustrations` + `.caption`) and table pages
  (`.table-image` reached via `.table-section`) are the only non-status
  image containers; no HTML tables exist. The media phase is deferred.

## Word-selection scan

The detailed baseline reports cover `what`, `turn`, `take`, and `run`. The
latest read-only comparison scanned these 12 additional exact words:

    set, make, put, break, go, work, process, look,
    give, have, play, hand

Together these 16 words are the current evidence set. Additional words should
be selected to cover structures not represented by the existing reports.

## Survey workflow

The safe order is:

    raw HTML reconnaissance
        ↓
    DOM ownership and nesting evidence
        ↓
    information names and Level 1–6 mapping
        ↓
    survey-tool behavior
        ↓
    broader word coverage
        ↓
    parser and converter changes

The future inspector is read-only. It may report DOM paths, class frequencies,
ownership candidates, and parser coverage. It must not emit Yomitan entries or
mutate the source database.

## Future survey-tool output contract

The tool output, unlike this README, must contain exactly three findings
sections.

### 1. Interesting information

Observed units that may be useful in the final dictionary or require a design
decision.

### 2. Not needed

Observed information intentionally outside the current scope. This is a
deliberate exclusion, not a parser failure.

### 3. Not yet noticed / not recognized

Information not seen in the selected word, or visible in HTML but not
recognized by the parser or survey tool. The report must distinguish absence
from one word from absence from the dictionary as a whole.

Each finding should include:

    word
    informationName
    unitLevel
    boundTo
    sourceSelectorOrTag
    ownerPath
    parserStatus
    findingSection
    notes

parserStatus is recognized, partially-recognized, or unrecognized.

## Scope decisions

- Discard internal gdlookup://, bword://, and similar navigation targets while
  retaining useful visible link text.
- Ignore layout, accordion, CSS, JavaScript, and other presentation mechanics
  without semantic dictionary information.
- Do not copy complete raw entries into this survey.
- Show the first visible example and collapse additional examples in each local
  example group.
- Preserve target-word highlighting when the eventual Yomitan display supports
  it.
- Keep unclassified phrases, inflections, related information, and derivatives
  separate until their source ownership and Yomitan search behavior are
  understood. Defined `.drp` phrase forms already have the decision that each
  searchable expression is retained while the parent keeps its phrase section.
- The catalog marks pronunciation-audio as Ignore=true for the current
  dictionary; audio extraction is a separate later phase. First-known-use is
  recognized: its value renders verbatim inside the collapsed origin body.

## Resolved chat decisions

### Question 2 — subordinate-definition presentation

For turn, a .sdsense such as `specifically: to turn the leaves of (a book):
read or search through` is a normal continuation of the surrounding
definition, not a separate indented definition block. The source semantic
attachment is still preserved in the intermediate data.

The display should follow MWU's order and visual style. In the observed HTML,
the parent definition is followed by an example, then the .sdsense. Therefore
the eventual Yomitan content should show the example first and the subordinate
text afterward. The qualifier should remain visually distinct, for example
with red italic styling for `specifically`, and target highlighting should
remain available for `to turn`.

### Yomitan label and pronunciation decisions

The local Yomitan source and WTY reference establish three different scopes:

- a term tag describes the complete searchable expression record and appears
  near the headword;
- a definition tag describes the complete definition card/term-bank row and is
  suitable for metadata common to all definitions in that row;
- structured-content inline text belongs beside the exact sense, definition,
  usage note, or example that owns it and preserves source order and styling.

WTY puts tags common to all glosses into its definition-tag field and keeps
sense-specific labels in the structured glossary; its main entries commonly
leave term tags empty. We adopt the same initial workflow for MWU: maintain a
known-label whitelist and aliases, promote a label to the tag bank only when
its scope is stable, keep local or unknown labels inline, and report
unrecognized labels instead of dropping them. Rules such as `v` and `v_phr`
are lookup behavior, not visual labels.

The term-bank rules field carries the lookup behavior: Yomitan derives a
term's inflection conditions from that field, not from the tag fields. Since
2026-08-07 the builder writes `v_phr` there for `.drp` phrases with
interposed-object evidence (see
[ADR 0005](../../adr/0005-tag-generation-rules.md)). The tag bank file
(`tag_bank_N.json`) is deliberately not emitted yet; definition tags are
written directly into the term-bank tag field.

All MWU `.pr` readings are display-only structured content for this project.
The Yomitan term-bank `reading` field remains empty, including when a word has
multiple readings. Pronunciation audio remains ignored and is deferred to the
later audio phase.

## Source survey tool

Two read-only tools ship with the package (`merriam_webster_unabridged`).
Both open the source database read-only and never emit Yomitan entries; both
write their reports under `build/`.

### Survey inspector — `bun run survey:inspect --words <words...>`

Built on `tests/survey_inspector.ts` + `src/survey/inspector.ts` + the class
catalog in `src/survey/catalog.ts`.

- Inspect mode walks every element of the requested rows and emits one
  finding per classified element: word, information name, unit level,
  nearest semantic owner, source selector (tag + full class tokens), DOM
  owner path, parser status, and finding section.
- Inventory mode aggregates the same findings across words into
  `build/survey-inventory.json`: per-selector unit/status/section, row
  counts, and the example words that exhibit each selector. Unknown or
  unrecognized selectors are listed explicitly, never silently discarded.
- The output follows the three-section contract (`interesting`,
  `notNeeded`, `notYetNoticed`) and the vocabulary of this survey.

The machine-consumed catalog lives in `src/survey/catalog-data.ts` as the
**single source of truth**: the unit rows (including the 2026-08-07
additions — `.pn` → `called-also-number`, `.l` → `pronunciation-note`,
`.iw`/`.mw_t_a_link`/`.mw_t_i_link` → `cross-reference`,
`.sense-(a)`/`.sense-(b)` → `subsense-letter`, the media units, …), the
class→unit→level map, and the ignored-units list derived from the Ignore
flag. The information-unit catalog table is no longer duplicated here —
`catalog-data.ts` is the single source. When the catalog changes, edit the
data file first (the README's unit references follow from it), or the
inspector misclassifies.

### Coverage audit — `bun run coverage:audit --words <words...>`

Built on `tests/coverage_audit.ts` + `src/pipeline/coverage.ts`. Proves no
source information is lost in conversion: for every converted record it
tokenizes the source owner HTML (excluding the record's own term tokens,
which are deliberately not repeated in the content) and checks each token
against the rendered structured content. Output: `build/coverage-report.json`
with per-record coverage, missing tokens, finding kinds, and records flagged
below 95%.

Baseline (2026-08-07, words what/o/take/in/oh/turn/run): 202 records, mean
coverage 94.3%, 64 flagged — every missing-token category explained
(CSS-drawn sense markers such as `1a`, ignored `first-known-use` lines,
syllabification-dot artifacts). Run it after any renderer change: a dip in
coverage flags a real drop before it reaches the ZIP. The separate
`design:update-metadata` helper only copies explicitly mapped repetitive
header facts (`<h1><sup>`, `.lbs`, and variant-only `.cxl-ref`) into the
hand-authored fixture and emits a match report; it is not a general parser.

Its report has the three requested finding sections: `interesting`,
`notNeeded`, and `notYetNoticed`. The selected-word report is written to
`build/design-what/mwu-html-evidence-selected.json`; the broad inventory report
is written to `build/design-what/mwu-html-evidence.json`. A finding records the
word, named information unit, level, nearest owner, source selector, parser
status, and notes. Unknown CSS classes are reported rather than silently
treated as meaning. In the latest selected eleven-word report,
`notYetNoticed` is empty: `.sen` is a transparent sense wrapper, while class
fragments from labels such as `(with "thou")` are presentation tokens, not
additional information units.

## Deferred reconnaissance

There are no unresolved user decisions in the currently surveyed source
structures. The separate `<mean>`/`.vd` rule, the treatment of example-only
phrases, inflections, undefined run-ons, defined derivatives, defined
`.drp`/`.va` search entries, cxl-ref variant references, and nearest-level
related information are working decisions.

Future reconnaissance will cover specialized related sections and the
survey-tool coverage report. The future tag-inventory tool—not a manual
question—will decide which stable labels are eventually promoted to the tag
bank. Media rendering (audio, definition artwork, table pages) is a separate
later phase.

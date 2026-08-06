# MDX to Yomitan: Project Notes and Research Log

> Archived 2026-08-06 — frozen research log, no longer maintained. Its
> durable content now lives in `CONTEXT.md`, the openspec specs,
> `docs/adr/`, the living survey at `../../docs/mwu-html-survey/README.md`,
> and the ticket tracker at `.scratch/`.

Last updated: 2026-08-06

Status: research, design, and implementation log. This document records source
understanding, Yomitan behavior, user requirements, survey findings, and the
verified selected-word renderer slice. The source ownership/link contract is
still specified separately in the archived OpenSpec change.

The earlier reconnaissance work is archived as a status checkpoint in
[`docs/mwu-html-survey/archived/2026-08-03-design-fixture-status.md`](../../docs/mwu-html-survey/archived/2026-08-03-design-fixture-status.md).
That archive records completed reconnaissance and verified fixture behavior.
The 2026-08-06 worktree adds the first production semantic renderer described
below; it does not claim complete uncommon-markup or media coverage.

## Goal

Convert the English Merriam-Webster Unabridged MDX dictionary into a Yomitan
dictionary while preserving useful dictionary structure:

- headwords and alternate forms;
- parts of speech and pronunciation;
- multiple senses and nested sense numbering;
- examples and usage notes;
- phrases and phrasal verbs;
- origin, related, and derived information;
- cross-references and other source-specific information where it can be
  represented reliably.

The important design principle is to preserve meaning and structure first. We
should not flatten every piece of MDX HTML into one large text block merely
because that is easier to export.

## Scope boundary

This document remains the source-research record, but it now also records the
first production structured-content implementation. The selected-word builder
implements the approved Level 1 ownership/link rules and a conservative
MWU-shaped Level 1 renderer; broader Level 1-6 coverage and media remain
research work. Production implementation details are linked from this history
so the source contract and the current code do not drift apart.

The verified v1 path accepts only explicit `--words` and `--words-file`
targets, reads selected SQLite rows on demand, closes dedicated canonical
dependencies, converts readable owner-local definitions, records findings and
rejected relationships, validates the emitted Yomitan tuples, and writes a
deterministic ZIP plus `build-report.json`. It is intentionally not a
full-database fallback or a complete uncommon-markup/media renderer.

## Project orientation

The conceptual data flow is:

```text
MDX dictionary
    ↓ pyglossary conversion
SQLite database (MWU.db)
    ↓ read word rows
HTML definition for one headword
    ↓ Cheerio/parser investigation
intermediate lexical and sense data
    ↓ Yomitan term-bank mapping
Yomitan dictionary ZIP
```

Relevant repository areas:

- [`packages/merriam_webster_unabridged/src/source/sqlite.ts`](../../packages/merriam_webster_unabridged/src/source/sqlite.ts)
  contains the read-only SQLite source adapter.
- [`packages/merriam_webster_unabridged/src/source/rows.ts`](../../packages/merriam_webster_unabridged/src/source/rows.ts)
  builds the lightweight decoded source-row index.
- [`packages/merriam_webster_unabridged/src/index.ts`](../../packages/merriam_webster_unabridged/src/index.ts)
  is the selected-word production build entry point.
- [`packages/merriam_webster_unabridged/assets/MWU.db`](../../packages/merriam_webster_unabridged/assets/MWU.db)
  is the read-only source database for reconnaissance.

### Structured-content design fixture

The current design job uses
[`packages/merriam_webster_unabridged/design-fixtures/what/term_bank_1.json`](../../packages/merriam_webster_unabridged/design-fixtures/what/term_bank_1.json)
as a hand-authored provisional reference. It is a real-text semantic/Yomitan
experiment for `what`, not a production data model, parser output, final
visual contract, or acceptance snapshot.
`what/write-zip.ts` only packages this JSON into a Yomitan ZIP; no HTML parser
or SQLite query runs in this design job. The JSON is edited directly so the
implementer can inspect one possible structured-content shape without reading
a transformation pipeline. Production behavior may replace fixture choices
when source evidence and focused ownership/link tests support a better result.

This fixture added two named information units to the survey vocabulary:
`origin-section-title` for a titled collapsed origin boundary and
`superscript-reference` for visual reference numbers such as `1whatever` and
`whoever 1`.
The fixture also records one-line IPA, one-line inflection metadata, scoped
labels, local `.sgram` grammar labels, the distinct `.see-in-addition` related
line, nested usage notes, one-visible-example/collapsed-extra behavior,
  defined phrase entries, and dictionary-deinflection soft links. The base
expansion contains 77 hand-authored records for ten high-coverage source
families: `turn`, `take`, `run`, `process`, `have`, `set`, `hand`, `give`, `in`,
and `o`. The current JSON also adds four marked-affix soft links, four
bare-form soft links (`il`, `im`, `ir`, and `ino`) targeting `in-`, 30 `set`
phrase/alternative records, the two definition-bearing `hand cheese`/`hand game`
means, and the definition-bearing variant-only `O` mean, bringing the design
ZIP to 136 term records.
The expansion is intentionally a compact structural slice using real source
text, not a claim that every definition in those large articles was copied.
The source-to-JSON comparison and explicit omissions are recorded in
[`packages/merriam_webster_unabridged/design-fixtures/coverage-audit.md`](../../packages/merriam_webster_unabridged/design-fixtures/coverage-audit.md).

The latest design ZIP contains 136 records in total. A local Yomitan Chromium
render audit covered all ten added source families plus `what`, `give up`,
`sett`, and `take the stage`; it confirmed that the experimental ZIP imports
and renders its compact nested-list layout, collapsed origin/phrase sections,
one-visible-example policy, normalized `process`/`pro·cess`,
`main-to-alternative-spelling-soft-link` routes, and newly added grammar and
related-information units. It does not
establish that those choices are final. The audit also caught one unsupported raw
structured-content `strong` tag, which was replaced with a styled supported
`span`.

The new fixture records confirm the direction of
`main-to-alternative-spelling-soft-link` routes: the
source `word.w` spelling is the Yomitan term and the canonical local `<mean>`
headword is the dictionary-deinflection target. For example, the JSON contains
`in` → `in-`/`-in`, the bare forms `il`/`im`/`ir`/`ino` → `in-`, and `o` →
`O`/`o-`/`-o`/`-o-`/`o'`/`oh`, while each target also has its own canonical
record. The `O` target is the variant-reference-only Case 2 record; `oh` and
`o'` demonstrate dedicated-row ownership. The marked `il-`/`im-`/`ir-`/`ino-`
links and bare `il`/`im`/`ir`/`ino` links both target `in-`, with the bare links
using the `alternative` rule. Phrase alternatives use the same
dictionary-deinflection shape with the `alternative` rule. `process` demonstrates that `process` is the
searchable term while `pro·cess` remains display metadata.

The selected-word production builder now also serializes the explicit marked
`vr-mean-alternate-soft-link` routes with the `alternative` rule. The provisional hand-authored
fixture may retain its earlier tuple shape; it is not the production contract.

The design job has three source-evidence commands. `design:fragments` extracts
selected rows into an ignored JSON report for copying real source text into
the hand-authored fixture. `design:update-metadata` copies only stable,
explicitly mapped header metadata such as homograph numbers, entry qualifiers,
and local variant references into the existing JSON, normalizes header
pronunciation nodes to stay inline with those numbers, and writes a match
report; it does not
generate definitions. `design:survey --all` inventories broad source
markers and reports `.sgram` (216 rows), `.see-in-addition` (433 rows, with
five outside synonym discussions), superscripts (52,982 rows), line-break
markers (173,702 rows), and defined phrase rows (3,661). Neither command
generates the design term bank or runs during ZIP packaging.

The five `.see-in-addition` rows outside `.synonym-discussion` are `because`,
`finalize`, `he`, `one`, and `they`. Source ownership is now confirmed:
`because`, `finalize`, `one`, and `they` use the `#usage-notes` section, while
`he` uses a definition-local `.usage` block. This is the same information unit
at Level 6, not a new kind of related entry. The selected fixture demonstrates
the Level 1 synonym-discussion form with `turn`.

The selected eleven-word survey report currently has zero `notYetNoticed`
findings. The `.sen` class observed in dense articles is a transparent sense
wrapper, and class fragments from labels such as `(with "thou")` are
presentation tokens rather than new information units. The broad all-source
report remains an inventory, not proof that every uncommon descendant has been
understood.

### 2026-08-06 production renderer finding

The new `structure-content` worktree replaces the old generic `div` flattening
in [`renderStructuredContent.ts`](../../packages/merriam_webster_unabridged/src/conversion/renderStructuredContent.ts).
The converter now keeps source ownership in the selected `<mean>` and emits a
single `mwu-entry` root with:

- a compact header for homograph number, display headword, POS, pronunciation,
  inflection, and source variants;
- immutable marker-path `ol`/`li` trees for decimal, lower-alpha, and
  parenthetical sense levels;
- sense-local `.sl`, `.sgram`, `.uns`, `.sdsense`, cross-reference, and
  attribution nodes;
- one visible example per local `.vis` group, with the remainder in closed
  `extra-examples` details;
- independently titled, closed phrase sections and a closed origin section;
- orange/bold `.mw_t_wi` target spans, visible link text without MWU internal
  URLs, and styled fallbacks for unsupported visible subtrees.

The reading tuple field remains empty. The definition-tag field now carries a
small WTY-style POS mapping, while richer source labels remain in structured
content. This preserves the distinction between searchable/deinflection data
and presentation data.

Real-source evidence from the current implementation:

- direct `what` conversion: one entry root, 12 list levels, 13 phrase
  sections, 9 collapsed example groups, 84 example nodes, and zero conversion
  findings;
- five-root build (`what take process set hand`): 180 canonical records, 29
  soft-link records, 209 total records, two intentional planning findings for
  definition-free `sett` means, and zero fatal errors;
- archive schema/determinism checks pass, and the local bundled-Chromium
  importer passes per-query searches for `what`, `process`, `set`, `hand`, and
  `take stage`.

The Chrome MCP connector was unavailable in this session, so the browser result
above is local Playwright Chromium evidence, not Chrome-MCP evidence. The
import harness now supports `--extension-path`, `--screenshot`, and per-query
render assertions so that limitation is explicit and repeatable.

Deferred work is now narrower: uncommon source wrappers, broad label inventory,
images/audio, full-database mode, and the final origin/audio policy. The
production implementation still accepts only explicit `--words`/`--words-file`
targets and keeps all fallback findings visible in `build-report.json`.

### SQLite source shape

The database contains:

- `word(id, w, m)`, where `w` is the lookup key and `m` is the MDX HTML;
- `alt(id, w)`, which contains alternate-word information associated with a
  source row;
- `dbinfo` and `dbinfo_extra`, which contain source metadata.

The exact meaning of an `alt` row and the ownership of content inside `m` are
survey questions, not assumptions to encode prematurely.

## Previously observed source structures

Earlier inspection identified these MWU HTML classes or regions as candidates
for the survey. They are useful leads, not a complete semantic specification:

- `.un` — an additional definition-like block;
- `.snote` — a source or usage note candidate;
- `.dro`/`.drp` — defined run-on phrase region and individual phrase labels;
- `.if` — inflection/form information candidate;
- `.pr` — pronunciation information candidate;
- `.vd` — grammar or verb-group candidate;
- `.sgram` — local grammar-label candidate, such as `transitive` inside a
  numbered sense;
- `.sdsense` — subordinate-sense candidate;
- `.sd` — subordinate-definition qualifier candidate;
- `.vr`/`.va` — alternate phrase display-form candidates;
- `.spl`, `.il`, and `.ix` — inflection and grammatical-form markers;
- `.et` — origin information candidate; first-known-use is cataloged with
  `Ignore=true`;
- `.dx-jump` and `.ca` — cross-reference/related-information candidates;
- related-to, `.syn`, `.mw_t_sc`, `.see-in-addition`, and `.sa-link` —
  synonym-discussion and related-entry information candidates; the
  `.see-in-addition` line is now a named related unit;
- `.ex-sent-group` — example-sentence candidate;
- `.hword`, `.fl`, `.sb`, `.sbNum`, and `.sense` — headword, label, and sense
  structure candidates.

The living survey must verify the DOM ownership and meaning of each structure,
especially when the same class appears under different ancestors.

## Reconnaissance survey contract

The survey is a first-class document, separate from these durable project
notes. It is maintained at
[`docs/mwu-html-survey/README.md`](../../docs/mwu-html-survey/README.md). Individual
word reports were merged into that README; historical snapshots are archived
in `docs/mwu-html-survey/archived/`. The workflow is defined
in [`docs/superpowers/plans/2026-08-01-mwu-html-reconnaissance.md`](../../docs/superpowers/plans/2026-08-01-mwu-html-reconnaissance.md).

The living survey document is organized by information unit and binding level.
It is not organized into the three tool-output sections. Each unit records its
default level, possible alternate levels, source ownership evidence, and parser
or tool status.

The survey tool's output must distinguish three outcomes:

1. **Interesting information** — information present in inspected words that
   may be useful in the final dictionary or requires a design decision.
2. **Not needed** — information that is present but intentionally outside the
   current scope, or that we explicitly decide not to preserve. This is a
   deliberate exclusion, not a parser failure.
3. **Not yet noticed / not recognized** — information not seen in selected
   words, or information visible in HTML but not currently recognized by the
   parser or survey tool. This requires further investigation before we call
   the converter complete.

The survey lists exact words inspected but does not paste large dictionary
entries; the user can view complete entries in GoldenDict. Internal evidence
should retain the source selector/class, parent-child relationship, sample
word, and parser/tool coverage status.

### Information-unit binding

An information unit is a typed piece of dictionary data, such as a definition,
example, pronunciation, or comparison reference. A level is the semantic
owner to which that unit is bound. The same information-unit type may bind to
different levels when its nearest meaningful HTML ancestor changes.

The binding rule is:

```text
source node → nearest semantic owner → information unit → level
```

We should not assign a level from a CSS class alone. For example, an example
under `.un` belongs to the usage-note owner, while an example directly under
`.dt` belongs to the definition owner.

## Working hierarchy

The hierarchy uses integer levels:

```text
Level 1: Lexical Entry (part-of-speech block)
Level 2: Verb Group (transitive or intransitive subgroup)
Level 3: Numbered Sense (1, 2, 3)
Level 4: Lettered Subsense (a, b, c)
Level 5: Individual Definition ((1), (2), (3))
Level 6: Definition Attachment
```

Level 2 replaces the earlier conceptual “1.5” level. It should be represented
as an integer sub-entry/group identifier, not as a decimal. Level 6 may contain
usage notes, examples, comparison references, and cross-references when the
HTML binds them to the Level 5 definition.

The survey must determine whether these levels are explicit in the HTML or
only visually implied. DOM ownership is more authoritative than indentation
in a rendered dictionary card.

## First reconnaissance: `what`

The shared survey catalog is in
[`docs/mwu-html-survey/README.md`](../../docs/mwu-html-survey/README.md). The
detailed per-word evidence is archived in
[`docs/mwu-html-survey/archived/what.md`](../../docs/mwu-html-survey/archived/what.md).
The exact lookup word was `what`; it matched one `word` row (`id = 464223`)
and produced five `<mean>` blocks: pronoun, adverb, adjective, noun, and
conjunction. The row also has 25 associated alternate rows.

The first survey confirms that `what` is a useful baseline for Levels 1 and
3–6:

- each part-of-speech block has its own header, pronunciation container, and
  etymology region;
- numeric, lettered, and parenthesized markers are explicit `.num`, `.letter`,
  and `.sub-num` children of `.sn`;
- `.sense` owns labels and `.dt` definition content;
- `.un` usage blocks can contain their own nested `.un` blocks and examples;
- examples can occur under `.un` or directly under `.dt`, and source target
  highlighting uses `.mw_t_wi`;
- `.dx-jump` comparison references can occur under `.un` or `.dt`;
- `.dro`/`.drp` phrase definitions, `.vr`/`.va` phrase variants, etymology,
  and an inflected plural form are present; source audio controls are
  observed but audio extraction is deferred;
- First Known Use is present as plain text inside etymology sections, even
  though it has no dedicated class;
- no Level 2 verb subgroup occurs because `what` has no verb block.

The current parser recognizes some basic nodes but does not yet model the
source markers, phrase ownership, comparison links, audio metadata, example
highlighting, or multiple pronunciation spans as named information. This is
recorded as survey coverage, not as a converter implementation result.

## Second reconnaissance: `turn`

The shared survey catalog is in
[`docs/mwu-html-survey/README.md`](../../docs/mwu-html-survey/README.md). The
detailed per-word evidence is archived in
[`docs/mwu-html-survey/archived/turn.md`](../../docs/mwu-html-survey/archived/turn.md).
The exact lookup word was `turn`; it matched one `word` row (`id = 450356`), contained
three `<mean>` blocks, and had 36 associated alternate rows.

The earlier read-only selection scan chose `turn` for broad coverage. It
showed:

- two `.vd` groups inside one verb `<mean>`: transitive verb followed by
  intransitive verb;
- a separate `<mean>` whose part of speech is intransitive verb but which has
  no `.vd` child, proving that Level 2 has more than one source shape;
- 240 `.sense` nodes, 102 parenthesized markers, 462 example groups, and
  29 phrase labels;
- a sense-bound inflection, `turns plural : menses`;
- `.sdsense` subordinate-definition content;
- a `.ca` called-also relation;
- `First Known Use` text and a related-to synonym discussion with visible
  related terms.

The report also records that `.fl` can belong to phrase groups, `.pr` can
contain multiple readings, and the same information unit can bind to different
levels depending on its nearest owner.

## Latest reconnaissance: 12 additional words

The additional exact lookup words were `set`, `make`, `put`, `break`, `go`,
`work`, `process`, `look`, `give`, `have`, `play`, and `hand`. This scan refined
the information-unit catalog without adding a hierarchy level.

The new confirmed units and source shapes are:

- `inflection-group`: an ordered `.vg-ins` block containing forms, labels,
  markers, and pronunciations;
- `inflection-label`: form-local `.il` text such as `past`, `past participle`,
  `or dialectal`, and `also archaic 2d singular`;
- `inflection-marker`: `.ix` values such as `-s`, `-es`, and `-ed/-ing/-s`;
- `form-pronunciation`: `.prt-a`/`.mw` readings attached to an inflected or
  alternate form; all readings remain structured display content and the
  Yomitan reading field remains empty;
- `variant-qualifier`: `.vl` relation text such as `or less commonly`;
- `example-date`: `.aqdate` attached to an example attribution;
- `synonym-discussion-reference`: `.srefs`/`.sr` pointers such as `See
  Synonym Discussion at fun, play:2, room`;
- `entry-status-image`: an `<img>` under `.entry-status`, currently ignored as
  header status artwork rather than dictionary meaning.

The scan also confirmed `.mw_t_mat` as an etymological `more at` form of the
existing `cross-reference` unit. Its visible text remains under the Level 1
origin owner while the internal navigation target is discarded. Classes such
as `.mw_t_bc`, `.first-slash`, `.last-slash`, `.addPunct`, `.sents`, and
accordion/layout classes remain presentation or boundary markup.

## Survey data vocabulary

The survey names information independently from its eventual Yomitan output:
The catalog records the related HTML class or tag, marking when a unit has no
dedicated class or only a candidate selector. It also records an Ignore
boolean; first-known-use and pronunciation-audio are marked `Ignore=true` for
the current dictionary output.

- structural markers: `part-of-speech`, `verb-subtype`, `sense-number`,
  `subsense-letter`, `definition-number`;
- lexical metadata: `headword-display`, `pronunciation`, `form-pronunciation`,
  `origin`, `first-known-use`, `pronunciation-audio`, `inflection`,
  `inflection-group`, `inflection-label`, and `inflection-marker`;
- meaning content: `sense-label`, `definition-label`, `definition`,
  `sub-definition`, `usage-note`;
- relations and examples: `comparison-reference`, `cross-reference`,
  `example-sentence`, `example-source`, `example-date`, `alternate-form`,
  `variant-qualifier`, `phrase`, `undefined-run-on`, `defined-derivative`,
  `related-item`, `called-also`,
  `see-in-addition`, `synonym-discussion`, `synonym-discussion-reference`,
  `entry-status-image`, and `interposed-object-candidate`.

These are survey names, not claims that every word contains every type, and
not direct one-to-one Yomitan fields.

### Information-unit recognition states

The living survey distinguishes source understanding from implementation:

- **confirmed semantic unit** — meaning and nearest-level ownership are
  supported by current word evidence;
- **confirmed container** — the DOM boundary is understood, but descendants
  remain independently inspectable;
- **derived unit** — inferred from multiple source nodes, such as an
  interposed-object candidate;
- **recognized but ignored** — understood information intentionally excluded,
  such as audio or first-known-use;
- **partially recognized/candidate** — a plausible unit whose full source
  structure is not yet established;
- **not yet recognized** — not observed in the selected words or present in
  HTML without a source-model mapping.

An information unit is not equivalent to an HTML element. A recognized parent
may contain recognized, ignored, and unrecognized children. The future survey
tool must recurse through every descendant and account for every meaningful
text segment, attribute, and link target with one of these statuses.

### MW example evidence for interposed objects

The supplied example contains one `.ex-sent-group` and an `.ex-sent` whose
italicized spans are `giving` and `up`, with the normal text `himself` between
them:

    giving himself up

This lets the survey derive an `interposed-object-candidate` at Level 6,
bound to the example sentence. The candidate extraction should:

1. collect italicized expression spans in DOM order;
2. detect non-target text between two spans;
3. join the spans as the observed expression (`giving up`);
4. confirm the expression against a phrase entry and its inflected form
   (`give up`) before calling it an interposed-object relation.

`.mw_t_it` is presentation markup, not an explicit interposed-object marker.
It can also style ordinary emphasis or cited names, so it must not be used
alone as proof. The original example sentence should remain intact, with the
two target components highlighted and the intervening object retained.

The binding has two scopes:

- the observed interposed-object candidate belongs to the Level 6 example
  attachment because that is where the separated surface form occurs;
- the canonical phrase and its `v_phr` lookup rule belong to the Level 1
  phrase entry, such as `give up`.

This is a relationship from Level 6 evidence to a Level 1 lexical owner, not
a new hierarchy level and not a Level 1 property inferred without an example.

## Yomitan behavior confirmed

### Defined run-on phrase evidence; phrase extraction decision

The exact lookup words for this evidence are take, take a bath, take stage,
take the word, take up the word, run, by the run, and take apart.

In the take row (id = 362180), take a bath is not a separate word row.
GoldenDict searching for take a bath routes to the parent and displays
See: 1 take. The source .dro region nevertheless gives take a bath its own
.drp label and definition, to suffer a heavy financial loss.

This establishes the source facts and the extraction decision:

- the parent take entry keeps its .dro phrase section;
- every .drp with a following definition tree becomes an independently
  searchable phrase entry, even when the source database stores its HTML under
  the parent row;
- the extracted phrase body comes from the .drp and the definition tree that
  follows it; the GoldenDict navigation text `See: 1 take` is not dictionary
  content that we need to emit;
- the parent entry still retains the complete .dro phrase section.

This is not a reason to merge a phrase into the parent's unrelated senses, and
neighboring .drp items remain separate. The eventual Yomitan records may share
or deduplicate the structured definition content; that is an export detail,
not a reason to remove a searchable phrase expression.

The take row also gives two `phrase-alternate-soft-link` shapes:

| Canonical .drp | Relation | .va alternate | Definition |
| --- | --- | --- | --- |
| take stage | or | take the stage | to center attention upon oneself ... |
| take the word | or less commonly | take up the word | to begin to speak |

Because .vr and .va occur after the phrase's .drp and before its definition
.vg, those alternatives belong to that phrase in the source. `take stage`,
`take the stage`, `take the word`, and `take up the word` should all be
searchable expressions for their phrase meaning. The canonical expression
stores the structured definition. Each `phrase-alternate-soft-link` uses
Yomitan's dictionary-deinflection tuple to point to the canonical expression,
so the source definition is parsed and stored only once. Unrelated phrases
remain separate.

The run row (id = 330483) provides the phrase-local part-of-speech case. The
exact lookup phrase is by the run; it is under a parent noun run section, but
its .drp is immediately followed by .fl adverb. The nearest semantic owner
rule therefore binds adverb to by the run, not to the parent noun. Its own
numbered definitions, usage notes, and example (lower sail by the run) remain
inside the phrase subtree.

### Related-information ownership decision

Related information always stays at the level where MWU places it. For
`turn`, `called also coup` occurs inside a specific `.dt`, so it remains a
Level 6 attachment to that definition. The broader Synonym Discussion
containing `revolve`, `rotate`, `spin`, and related terms occurs in the
entry-level related-to region, so it remains attached to the Level 1 lexical
entry. We do not regroup either item merely for visual convenience.

The detailed source reports are:

- [take survey](../../docs/mwu-html-survey/archived/take.md)
- [run survey](../../docs/mwu-html-survey/archived/run.md)

### Interposed-object evidence from a defined phrase

The take apart .drp phrase contains examples whose target components are
separate .mw_t_wi spans:

    take a town apart
    takes it apart
    take the various games and sponsors apart

The intervening objects remain ordinary text between the two target spans.
This is concrete evidence for an interposed-object-candidate attached to the
Level 6 examples. The canonical owner is the Level 1
`drp-phrase-canonical-entry` for take apart; the eventual Yomitan v_phr rule
belongs there. The converter
should not create a wildcard term such as take XXX apart.

This evidence also confirms why .mw_t_it must not be used alone: it marks
presentation italics and can belong to an author or publication attribution.

### Ordinary multiword expressions

A contiguous expression such as `give up` is stored as the normal dictionary
term `give up`. It should not be encoded as a wildcard such as `give XXX up`.

### English interposed-object phrasal verbs

Yomitan's English language transform can normalize an interposed object:

| Text being looked up | Normalized dictionary term | Reason |
| --- | --- | --- |
| `give you up` | `give up` | interposed object |
| `look something up` | `look up` | interposed object |
| `looked something up` | `look up` | past + interposed object |

The conceptual flow is:

```text
sentence text: give you up
    ↓ English transform
normalized text: give up
    ↓ dictionary lookup
term-bank entry: give up
```

The term-bank record stores the canonical expression, not a wildcard:

```text
expression: "give up"
reading: ""
rules: "v_phr"
glossary: the phrase definitions and structured content
```

`v_phr` is a machine-readable condition used to match the transformed
phrasal-verb form. A visual verb tag such as `v` is separate presentation
metadata and is not a replacement for the rule.

Paired target-highlight spans are evidence for `v_phr`, not conclusive proof.
Every build therefore produces a complete candidate inventory for manual
inspection. Each candidate records the canonical term, source word and owner
path, full evidence example, highlighted components, intervening text, and
whether the builder emitted the rule. This lets us catch cases where paired
highlights do not actually describe a separable phrasal verb.

The v1 build produces one deterministic `build-report.json` for tests and
manual inspection. It includes effective CLI roots and input evidence, loaded
source rows and dependency reasons, ownership decisions, canonical entry and
soft-link-entry plans with all relationship evidence, planner findings,
alternate rejections, conversion findings, fatal errors,
canonical-entry/soft-link-entry/output record totals, and the successful archive
path. “Findings” means source
content encountered but not yet classified semantically; it is not dictionary
definition content.

References:

- [Yomitan English transforms](https://github.com/yomidevs/yomitan/blob/master/ext/js/language/en/english-transforms.js)
- [Yomitan English transform tests](https://github.com/yomidevs/yomitan/blob/master/test/language/english-transforms.test.js)
- [Yomitan translator](https://github.com/yomidevs/yomitan/blob/master/ext/js/language/translator.js)

### Tags, rules, and readings

- visual definition/term tags describe metadata such as `archaic`, `slang`,
  or `chiefly British`;
- structured-content labels can display information specific to one sense;
- rules are machine-readable conditions used by transforms and deinflection;
- although a Yomitan term-bank record has one reading string, this project will
  leave that field empty and display all MWU pronunciations in structured
  content.

The term-bank schema keeps reading, visual tags, rules, and definitions as
separate concepts:

- [Yomitan dictionary format](https://github.com/yomidevs/yomitan/blob/master/docs/making-yomitan-dictionaries.md)
- [Yomitan term-bank schema](https://github.com/yomidevs/yomitan/blob/master/ext/data/schemas/dictionary-term-bank-v3-schema.json)

## WTY findings

WTY is a reference for representation patterns, not a promise that MWU HTML
has the same semantics.

- one Wiktionary `WordEntry` becomes one lexical entry with a nested gloss or
  sense tree;
- grammar, etymology, examples, and sense-specific labels remain inside that
  entry;
- forms and alternate forms point back to a lemma rather than copying the
  complete definition;
- normalized labels can become tag-bank entries, while sense-specific labels
  remain inside structured content;
- WTY uses one reading per term record and has a separate IPA dictionary,
  showing that IPA and searchable reading are not always the same concept.

References:

- [WTY project](https://github.com/yomidevs/wiktionary-to-yomitan)
- [WTY dictionary documentation](https://yomidevs.github.io/wiktionary-to-yomitan/dictionaries/)
- [WTY tag documentation](https://yomidevs.github.io/wiktionary-to-yomitan/tags/)

## User decisions and working design

### Information-preservation principle

When implementing this project, prefer output that retains information over
output that improves presentation. If a choice must be made between a
lossless but plain rendering and a richer rendering that may drop source
content, keep the information first and improve its presentation later.
Information dropped from the result is hard to become aware of afterward: it
never shows up in per-word tests, and it only surfaces through
full-database output audits.

Concrete working rules:

- unknown or unsupported wrappers become atomic fallbacks that preserve the
  visible subtree once and report a finding for the owner and level (see
  "Level ownership and inheritance" above), rather than being discarded;
- a node whose faithful rendering is not yet implemented keeps its text in
  plain fallback form instead of being omitted from the output;
- when a source unit cannot be emitted at all, record a finding with its
  row, mean, and preview so the loss remains visible in `build-report.json`;
- a shape assumed rare or absent must be checked against the full database
  before the assumption is relied on. For example, "no mean has a second
  definition section" and "the pronunciation tail walk only touches
  pronunciation material" are both currently proven by full-database scans,
  not by the six-word sample;
- a presentation change that strips a style must map every affected node to
  a replacement rule in `styles.css`; if no rule exists, the node loses its
  styling silently, and the loss is only detectable by comparing the built
  output with the source;
- the ZIP stylesheet must only affect the dictionary's own structured-content
  units (`[data-sc-content]`); Yomitan's own DOM — definition-tag chips,
  tag lists, and other UI chrome — keeps Yomitan's default styling and is
  never targeted by the dictionary's CSS.

### Source links

MWU links such as `gdlookup://localhost/word` do not need to survive. Remove
the internal link target and keep useful visible text as ordinary text when
possible. Do not invent a Yomitan link target merely because the source used
an HTML link.

### Grouping meanings and homographs

Do not merge separate `<mean>` blocks that MWU presents as distinct lexical/POS
identities. Use the source lexical identity as the working grouping key:

```text
exact source expression + source <mean> identity + part of speech/pronunciation identity
```

Group senses belonging to one lexical item. Keep a different homograph, part
of speech, independent phrase, or meaningful reading separate. The survey must
verify how MWU's `<mean>` and neighboring nodes express these boundaries.

### Level ownership and inheritance

Information belongs to the nearest semantic owner identified by the DOM
ancestor path. It does not inherit upward into the parent merely because the
parent supplies context. For example:

- entry-level `turn` pronunciation and part of speech belong to Level 1;
- a `.ca` or comparison inside one specific definition stays attached to
  that definition's Level 5/6 subtree;
- an example inside `.un` belongs to that usage-note subtree, while an example
  directly inside `.dt` belongs to the definition subtree.

The parser may carry the ancestor path while walking the DOM, but the output
model must not move a child information unit to Level 1 or copy it to every
descendant. The difficult part is maintaining the semantic-owner mapping for
each container shape, not the basic nearest-ancestor lookup.

This is also the rule for newly encountered information units. Once the source
meaning and boundary are understood, give the unit a name, model it explicitly,
and render it like MWU at the nearest owner's Level 1–6 position. For example,
the visible headword display, including printed syllable dots, stays in the
Level 1 header. Responsive `.breakpoint` spans are presentation boundaries and
must not be interpreted as linguistic syllables. A derivative remains at the
source level that owns the derivative relation and becomes independently
searchable only when it has its own definition.
Until a new unit is understood, preserve its subtree once as unrecognized
fallback content and report its owner and level rather than guessing.

Known transparent wrappers may be traversed recursively. Unknown wrappers are
atomic fallbacks: preserve their visible subtree once and do not also parse
their descendants separately. This prevents a known-looking nested example
from being rendered twice while the unknown wrapper's own text is also kept.

### General bare lookup for marked affix forms

Affix notation in the source must not make the boundary hyphen mandatory for
search. This is a general rule for every source-confirmed prefix, suffix, or
infix term, not a special case for `il-`, `im-`, `ir-`, and `ino-`.

For each eligible marked expression:

1. Keep the marked expression as the canonical displayed/searchable form, for
   example `in-`, `-in`, or `-i-`.
2. Derive one additional bare lookup by removing only the boundary hyphen(s):
   `in-` → `in`, `-in` → `in`, and `-i-` → `i`.
3. Point that bare term to the same canonical Level 1 entry with the
   dictionary-deinflection rule `alternative`. A marked alternate such as
   `il-` therefore gives `il` → `in-`, not `il` → a copied definition.
4. If a source-word-row relationship already provides the exact same
   term-to-target route, reuse it instead of emitting a duplicate record.
5. Do not apply this rule to ordinary hyphenated words or arbitrary substrings;
   the source must identify the expression as an affix or marked alternate.

The result is that searching `in` can find both `in-` and `-in`, searching `i`
can find `-i-` when MWU provides that affix entry, and searching `il` can find
the `in-` entry. The canonical display keeps its markers so the user can see
whether the item is a prefix, suffix, or infix. The bare route never replaces
the marked entry and never copies its definition. The current fixture contains
the four `il`/`im`/`ir`/`ino` examples plus existing `in`/`o` source-row
routes; future source-assisted generation must apply the rule by shape and
source role rather than by a fixed word list.

### Alternate forms

Prefer searchable alternate forms that point to a canonical lemma rather than
duplicating a full definition. Yomitan term-bank definitions support a
dictionary-deinflection tuple containing the canonical term and a rule chain;
the translator follows that tuple and displays the canonical definition. For
the currently observed defined run-on phrases, each `.drp` phrase is a
`drp-phrase-canonical-entry` and each `.va` form receives a
`phrase-alternate-soft-link`, while the
parent keeps its `.dro` section. Remaining `alt` rows without a defined `.dro`
tree still need source classification before choosing their final shape.

“Sharing one definition” means the `drp-phrase-canonical-entry` owns one parsed
definition tree and its `phrase-alternate-soft-link` points to that canonical
term. For
example, `take the word` stores the structured definition and `take up the
word` points to `take the word`; both are searchable without repeated
definition JSON.

Do not use unspecified normalization for record deduplication. The first build
deduplicates only an exact Unicode searchable expression plus its source lexical
identity. Case, punctuation, spacing, and diacritics remain meaningful unless a
later surveyed source rule explicitly says otherwise.

### Usage notes and examples

Usage notes should be visibly indented first. Examples should show the first
three initially and collapse additional examples. “Highlight the target word”
means preserve MWU's `.mw_t_wi` presentation metadata when it marks the
looked-up expression inside an example: `turning` in `turning the pages of the
book`, or the two `take`/`apart` components in `take a town apart`. The object
text remains ordinary text. This is display metadata on a Level 6 example, not
a new sense and not a lookup rule.

### Subordinate-definition continuation

For turn, .sdsense is a continuation of the surrounding definition, not a
separate indented definition block or new numbered level. Preserve its source
attachment in the intermediate data, but follow MWU's display order and style:
the parent definition comes first, the example comes next, and the subordinate
text follows the example.

For example, render the source sequence:

    (2) : to cause to move around a center ...
    <turning the pages of the book>
    specifically : to turn the leaves of (a book) : read or search through

The qualifier specifically should remain visually distinct in the MWU style,
such as red italic text. Target highlighting should remain available for turn.
This resolves Question 2; it does not change the nearest-owner rule for the
information model.

### Labels and Yomitan tag scope

Preserve every reliable `.sl` label, but choose the Yomitan representation by
scope rather than by class name alone:

- a **term tag** belongs to the searchable expression record as a whole and
  is rendered near the headword; it is appropriate only for metadata true of
  that whole record;
- a **definition tag** belongs to the definition card represented by one
  term-bank row and is appropriate for a part of speech or label common to all
  definitions in that row;
- **structured-content inline text** belongs beside the exact definition or
  attachment that owns it and preserves source order and local styling. This
  is the default for a sense-specific `.sl`, `chiefly substandard`, or the
  `.sdsense` qualifier `specifically`.

WTY computes tags common to all glosses for the definition-tag field and keeps
sense-specific labels in the structured glossary; its main entries commonly
leave term tags empty. We adopt this as the initial MWU workflow: maintain a
known-label whitelist and aliases, promote a label to the tag bank only when
its scope is stable, keep local or unknown labels inline, and report
unrecognized labels instead of dropping them. Yomitan tag categories control
the visual tag category and color, while rules such as `v` and `v_phr` are
machine-readable lookup conditions, not visual labels.

### Pronunciation and multiple readings

Show every available MWU pronunciation visibly, but leave Yomitan's term-bank
`reading` field empty for this dictionary. Put every `.pr` value—including
multiple readings such as `/ˈtərn/` and `/ˈtu̇rn/`—into structured content in a
pronunciation/IPA section. These readings are display information, not
Yomitan reading-search keys, and no reading should be silently discarded.

Pronunciation-audio is marked `Ignore=true` for the current Yomitan
dictionary. Audio extraction will be handled as a later, separate phase.

### Phrases and derivatives

A phrase is a multiword lexical unit, such as `give up`, `in spite of`, or `by
and large`. A derivative is a new word formed from another word, such as
`happy → happiness` or `help → helpful`. `help → helped` and `cat → cats` are
inflections, not derivatives.

A defined phrase is independently searchable and may also be listed under its
parent. For the observed MWU structures, `take a bath` has a `.drp` followed by
its own definition, so its phrase body replaces the `See: 1 take` navigation
text as the content of the searchable phrase record. `take stage`, `take the
stage`, `take the word`, and `take up the word` follow the same rule because
they belong to a defined `.drp` phrase subtree.

An example-only multiword string, such as `take a town apart` inside an
example under `take apart`, remains an example and does not become a new
phrase entry. An inflection, such as `turns` marked as a plural form of
`turn`, is a grammatical form, not a new lexical definition. MWU's
`.dro > .uro > .ure` structure is an undefined run-on derivative. For example,
the `abandon` entry contains `abandoner` with pronunciation, noun label, plural
form, and examples but no definition. Preserve that complete run-on under the
Level 1 parent. It does not receive an independent searchable record or a
soft link. A derivative becomes independently searchable only when MWU gives
it its own definition.

### Origin and related information

Preserve as much origin, etymology, related-word, and derived-form information
as MWU provides reliably. Display it in clearly labeled sections separate from
the main sense tree. Discard internal link targets according to the source-link
decision while keeping useful visible text.

## Survey workflow and tools

The safe order is:

```text
raw HTML reconnaissance
    ↓
DOM ownership and nesting evidence
    ↓
information names and Level 1–6 mapping
    ↓
survey tool behavior
    ↓
broader word coverage
    ↓
parser/converter changes
```

The first detailed target was `what`; `turn` is the second detailed report.
A generic DOM inventory can be used before we know the complete MWU schema, but
semantic survey rules should only be added after actual structures have been
observed.

The planned read-only inspector should support:

```text
inspect one word → DOM paths, class tokens, ownership candidates, parser status
inventory        → structure/class coverage and example word names
```

The inspector must report unknown and unrecognized HTML instead of silently
discarding it. It must not emit Yomitan entries or mutate the source database.

### Future tag-inventory tool

Before generating any tag bank, build a read-only inventory of every possible
source label in the selected words. The inventory should scan `.sl`, `.fl`,
`.vd`, `.sd`, `.lb`, parenthetical labels, phrase-local labels, and other
label-bearing nodes discovered during reconnaissance. For each candidate it
should record the exact text, source class, example words, occurrence count,
nearest semantic level, ancestor path, and a WTY/Yomitan mapping candidate.

This tool does not generate `tag_bank_*.json`. It only supplies evidence for a
later decision. Its eventual report still follows the three requested
sections: interesting information, not needed, and not yet noticed or
recognized.

## Deferred reconnaissance before parser changes

There are no unresolved user decisions in the current source structure. The
following are working rules:

- a separate `<mean>` with its own POS/pronunciation identity is Level 1;
  `.vd` groups inside one `<mean>` are Level 2;
- an example-only phrase such as `take a town apart` stays an example;
- inflections such as `turns` are form metadata, not new lexical definitions;
- an undefined `.uro` derivative such as `abandoner` remains under its Level 1
  parent and is not independently searchable; a derivative becomes independent
  only when MWU gives it its own definition;
- defined `.drp` and phrase-local `.va` forms are independently searchable;
- `.sl` tag-bank candidates will be determined by the future WTY-style
  inventory tool, not by asking for a manual label list now.

Future reconnaissance will cover definition images and other media outside the
observed entry-status image, specialized related sections, and the survey-tool
coverage report.

## Research checklist

### Completed

- [x] Identify the repository packages and conceptual build flow.
- [x] Read the SQLite schema and current database access shape.
- [x] Read Yomitan term-bank, structured-content, tag, and rule behavior.
- [x] Confirm Yomitan's English interposed-object transform.
- [x] Read WTY grouping, form-bank, tag-bank, and IPA patterns.
- [x] Record user decisions about links, grouping, alternate forms, usage
      notes, labels, pronunciation, phrases, derivatives, and related data.
- [x] Define the six-level hierarchy and survey-tool three-section output
      contract.
- [x] Perform read-only reconnaissance for `what`.
- [x] Add the first `what` findings to the living survey document.
- [x] Compare observed `what` nodes with the current parser vocabulary.
- [x] Compare 12 candidate words and choose `turn` for broad coverage.
- [x] Perform detailed read-only reconnaissance for `turn`.
- [x] Scan 12 additional words for information units outside the existing
      catalog and record the confirmed additions.

### In progress

- [ ] Design the repeatable survey inspector from observed HTML rather than
      guessing the schema in advance.
- [ ] Reconcile the two observed Level 2 source shapes.
- [ ] Continue maintaining `docs/mwu-html-survey/README.md`; archive a
      per-word snapshot only when a historical checkpoint is useful.

## Important boundary

The converter should not try to understand every English grammar rule. Yomitan
owns language-specific lookup transforms such as interposed objects. Our
converter will eventually export accurate lexical entries, phrases,
definitions, and rule metadata—but implementation decisions wait until the
source survey has established the structure.

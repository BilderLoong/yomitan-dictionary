# Manual design-fixture coverage audit

Updated: 2026-08-03

This is a comparison of the hand-authored term bank with the original MWU
HTML articles. The source facts come from read-only inspection of
`assets/MWU.db`; the output facts come from
`what/term_bank_1.json`. No parser is involved in creating the fixture or in
packaging the ZIP.

The purpose of this report is narrower than “copy every article.” It asks:

1. Did the fixture exercise the Level 1 ownership rule and the confirmed
   information units?
2. Did the fixture use real source text for each new structural example?
3. Which source material is intentionally not copied yet?

## Selected source rows

| Source lookup | SQLite row | HTML length | `<mean>` blocks | Important source evidence | Fixture records |
| --- | ---: | ---: | ---: | --- | ---: |
| `turn` | 450356 | 231,181 | 3 | `.vd`, dense `.sb`/`.sense` tree, `.sdsense`, `.uns`, `.dro`/`.drp`, `.vr`/`.va`, `.ca`, related synonym discussion | 5 |
| `take` | 362180 | 244,252 | 2 | transitive/intransitive groups, defined phrases, `phrase-alternate-soft-link` candidates, paired target highlights in `take apart` | 8 |
| `run` | 330483 | 115,121 | 3 | verb/noun/adjective means; phrase `by the run` has its own `adverb` label | 4 |
| `process` | 313825 | 30,319 | 4 | `pro·cess` display spelling, three readings, a separate intransitive-verb mean, form pronunciation | 4 |
| `have` | 202497 | 84,339 | 2 | long ordered inflection group and multiple lexical POS blocks | 2 |
| `set` | 339194 | 143,252 | 5 | verb groups, adjective/noun blocks, called-also information, block-local `or less commonly sett`, 29 defined phrases, embedded `seth`/`sett` forms, dedicated-row soft links | 37 |
| `hand` | 201297 | 68,873 | 5 | noun/adverb/verb means, `transitive + intransitive`, obsolete local label, defined phrase, and embedded `hand cheese`/`hand game` means | 6 |
| `give` | 194504 | 86,584 | 2 | verb/noun means and ordered inflection metadata | 2 |
| `give up` | 194513 | 12,587 | 2 | dedicated phrase row with noun `give–up` and verb `give up` | 2 |
| `in` | 212714 | 100,461 | 13 | preposition/adverb/verb/adjective/noun/abbreviation/symbol plus prefix, suffix, and combining-form means | 19 |
| `o` | 288348 | 31,892 | 12 | multiple definition-bearing spellings: `O`, `o-`, `-o`, `-o-`, `o'`, `oh`; `O` also has a variant-reference-only mean | 21 |
| `o'` | 288356 | 2,650 | 1 | dedicated-row owner for the deferred `alternative-spelling-canonical-entry` target `o'` | included above |
| `oh` | 289655 | 12,427 | 4 | dedicated-row owner for the deferred `alternative-spelling-canonical-entry` target `oh`; its embedded `o` is skipped because `o` already has a row | included above |

The fixture contains 136 records: 22 records from the earlier `what` fixture,
77 records from the ten selected source families and their dedicated rows,
four `bare-affix-soft-link` records (`il`, `im`, `ir`, and `ino`), and 30 records
for the recognized `set` defined phrases and its `set upon` alternative. It
also includes the two definition-bearing embedded means `hand cheese` and
`hand game`, whose source definitions are cross-references to `hand 21` and
`hand 17`, and the `O` variant-reference-only canonical record from the `o`
row.
The records are not
one-to-one with source `<mean>` blocks: canonical records and
dictionary-deinflection soft links are deliberately counted separately.

## Ownership and relationship checks

### Same spelling remains separate

The fixture keeps separate records for repeated Level 1 spellings:

- `turn` has verb, noun, and separate intransitive-verb records;
- `process` has noun, verb, adjective, and separate intransitive-verb records;
- `in` has six records with the plain spelling `in`;
- `oh` has two records with the plain spelling `oh`.

The term-bank `reading` field is empty for these records. IPA is visible in
structured content, so multiple readings do not force the records to merge or
choose one searchable reading.

### Headword normalization

The source displays `1 pro·cess`, `2 pro·cess`, `3 pro·cess`, and
`4 pro·cess`. The canonical searchable term is `process`; the fixture retains
`pro·cess` in a `headword-display` node and the middle dot in a
`syllabification-marker` child. The homograph number is not part of the
searchable term.

This follows the approved rule for `lit·tle`: trim HTML boundary whitespace,
remove the confirmed presentation-only homograph/syllabification markers from
the lookup term, preserve the rich display form, and report unfamiliar
markers instead of silently removing them.

### Source-row soft links

The direction is visible in the raw term-bank tuples: the source lookup
spelling is the tuple term, and the local canonical headword is the
dictionary-deinflection target.

```text
in  -> in-
in  -> -in
o   -> O
o   -> o-
o   -> -o
o   -> -o-
o   -> o'
o   -> oh
```

This means `in` can retain its ordinary canonical definitions while also
surfacing the canonical prefix and suffix definitions. Searching `-in`, `in-`,
`o-`, or `oh` still finds those terms directly because they also have their
own canonical records. The soft link does not copy a definition.

The `in-` source header already exposes `il-`, `im-`, `ir-`, and `ino-` as
explicit alternate forms. Those four links target `in-` with the source-row
relationship shape; the current bare forms `il`, `im`, `ir`, and `ino` target
the same canonical term with the `alternative` dictionary-deinflection rule.
This is evidence for a general rule: every source-confirmed marked prefix,
suffix, infix, or marked alternate gets a bare lookup by removing only its
boundary hyphen(s), unless an exact `main-to-alternative-spelling-soft-link`
route already exists. The bare
form is only an extra lookup route; it does not replace the marked spelling in
the displayed entry.

The `o` row contains a definition-bearing `O` mean with the source text
`variant spelling of oh` and no dedicated `O` word row. It therefore emits one
untagged canonical `O` record with homograph number `1`, and the source-row
soft link `o -> O` points to it. This is separate from the `O` abbreviation and
symbol records (homographs `2` and `3`).

The SQLite source has no Yomitan score field. For this design fixture, the
source row order is reflected by score: the canonical `set` records use `100`,
the dedicated `seth`/`sett` records use `0`, and `set` soft links use `-100`.
This makes the ordinary `set` result appear before the related forms while
keeping every form searchable.

Phrase-local alternatives use the same shape:

```text
take the stage   -> take stage
take up the word -> take the word
turn around one's little finger -> turn around one's finger
```

Raw `alt` rows are not used as a source of new records. The fixture only emits
relationships confirmed by a definition-bearing source structure or a local
variant relation.

## Information-unit comparison

| Unit family | Source evidence inspected | Fixture treatment | Status |
| --- | --- | --- | --- |
| `part-of-speech`, `entry-qualifier`, `verb-subtype` | `.fl`, `.lbs`, `.vd`, separate intransitive-verb `<mean>` | Yomitan definition tags plus header qualifiers and nested Level 2 ordered lists | Covered for selected metadata |
| `grammar-label` | `.sgram` in `hand`, including `transitive` and `transitive + intransitive` | Scoped italic inline label attached to the nearest numbered sense; not promoted to the tag bank yet | Covered in selected `hand` senses |
| `headword-display`, `syllabification-marker` | `.hword`, `sup`, `·` in `pro·cess` | Search term is normalized; rich display stays visible | Covered for confirmed marker; unknown markers still reported later |
| `homograph-number` | `<sup>` inside a headword such as `1 set` or `3 sett` | The number identifies the local homograph; the searchable term remains `set` or `sett`, and the Yomitan result identity supplies the record boundary | Covered as Level 1 identity evidence; it is not a Level 6 cross-reference superscript |
| `pronunciation`, `form-pronunciation` | `.prs`, `.pr`, `.prt-a`, `.mw` | One structured line per owner; form pronunciation stays with the form group; reading field is empty | Covered |
| `inflection-group`, `inflection-label`, `inflection-marker` | `.vg-ins`, `.il`, `.ix`, `.if`, `.spl` | Ordered inline metadata; no inflected form becomes a new lexical entry | Covered for selected examples |
| `sense-number`, `subsense-letter`, `definition-number`, `definition` | `.sn`, `.num`, `.letter`, `.sub-num`, `.dt`, `.pseq` | Nested `ol`/`li` lists, with source markers in `data.sourceMarker` | Covered as a design slice; full article depth deferred |
| `sense-label`, `definition-label`, `sub-definition` | `.sl`, `.sls`, `.lb`, `.sdsense`, `.sd` | Scoped inline labels and normal-continuation subordinate definitions | Covered |
| `usage-note` | `.uns`, `.un`, `.unText` | Indented and attached to the nearest definition; examples remain inside the note | Covered |
| `example-sentence`, `example-source`, `extra-examples`, `target-highlight` | `.ex-sent-group`, `.auth`, `.source`, `.mw_t_wi` | One visible example per local group; remaining examples are collapsed; target spans are highlighted | Covered |
| `interposed-object-candidate` | paired `.mw_t_wi` spans in `take apart` examples | One example node contains both highlighted components and the intervening object text | Covered as evidence; final `v_phr` transform remains later |
| `phrase`, `alternate-form`, `variant-qualifier` | `.dro`, `.drp`, `.vr`, `.va`, phrase-local `.fl`, block-local `.vr` | Defined phrases get `drp-phrase-canonical-entry` records; parent keeps collapsed phrase sections; `phrase-alternate-soft-link` records target the phrase owner; `set` preserves `or less commonly sett` beside senses 17 and 23 | Covered |
| `called-also`, `related-item`, `variant-reference`, `synonym-discussion` | `.ca`, `.related-to`, `.cxl-ref`, `.syn`, `.mw_t_sc` | Bound to the nearest definition or Level 1 related section; source variant references retain visible text | Covered as a design slice |
| `see-in-addition` | `.see-in-addition`; `.sa-link` in `turn`, `take`, and `have`; `#usage-notes` in `because`, `finalize`, `one`, and `they`; `.usage` in `he` | Separate compact line bound to its nearest owner: Level 1 synonym discussion or Level 6 usage information; visible link text retained and navigation target discarded | Owner classes confirmed by source survey; selected fixture rendering remains demonstrated by the synonym-discussion case |
| `origin`, `origin-section-title`, `usage-discussion-reference` | `.section[data-id=origin]`, `.et`, origin heading, `.urefs` | Titled collapsed origin block; visible usage-discussion pointers remain bound to their source definition | Covered as a design slice |
| `source-row-membership`, `dedicated-word-row`, `soft-link-entry` | `word(id,w,m)`, decoded keys `o%27`/`o`, embedded `<mean>` spelling | `alternative-spelling-canonical-entry` generation and dedicated-row deferral plus explicit soft-link tuples | Covered for `in` and `o`; full build diagnostics remain later |

The source-assisted metadata report matches 55 selected canonical means. Its
only unmatched source mean is `o` → `-o-`; that mean has no POS, homograph
number, or header qualifier to copy, so the existing manually authored
canonical `-o-` record is the correct fallback.

## All-source evidence inventory

The read-only survey command is the source of truth for broad inventory
counts:

```sh
bun run design:survey
```

The 2026-08-03 all-candidate-row scan found `.sgram` in 216 source rows. The
words are not limited to the selected design fixture; examples include
`abate`, `accordion`, `allocute`, `backhaul`, `hand`, `assimilate`, `take`,
`turn`, and `triggered`. The complete lookup-word list is in the generated
JSON report. The selected `set` row has no `.sgram` node; its `transitive verb`
and `intransitive verb` labels are `.vd` verb-subtype information instead.

The complete `.sgram` value inventory is `transitive`, `intransitive`,
`transitive + intransitive`, and the same source values with trailing commas,
plus the compact source value `T /I`. The current fixture keeps these labels
inline because their local scope is not yet stable enough for a global Yomitan
tag.

It found `.see-in-addition` in 433 rows. 428 are inside a
`.synonym-discussion`; the five source rows outside that wrapper are:
`because`, `finalize`, `he`, `one`, and `they`. Source DOM inspection shows
that `because`, `finalize`, `one`, and `they` use the `#usage-notes` section,
while `he` uses a definition-local `.usage` block. The survey records these
owner classes, so the same information unit is now understood as Level 1 in
synonym discussion or Level 6 under usage information.

It found 52,982 rows containing `<sup>`. Headword homograph numbers and local
cross-reference numbers are different information units. The selected `set`
row has header numbers `1`, `2`, `3`, and `3` plus cross-reference numbers in
`3punch`, `1set`, and `3set`; the fragment helper records these exact values.
The full report retains every source row and owner class.

It found 173,702 line-break markers (`br`, `breakpoint`, or `breakpoints`) and
3,661 phrase-definition rows. A source sibling block can also require a
visual line break without a literal `<br>`: for example, `slang` is a block
`.sls` label before the definition of `what's with`. The fixture therefore
uses block structured-content nodes for source block boundaries.

The selected survey report has no unrecognized class findings after the
transparent `.sen` wrapper and parenthetical label tokens were classified as
non-information presentation structure. This does not close the all-source
unknown-structure investigation; it only closes the selected eleven-word
report.

## Deliberately not copied or not yet validated

These are omissions, not silent successes:

The source-assisted fragment run also measured the selected rows before any
fixture editing. This is a coverage boundary, not an instruction to generate
the JSON automatically:

| Source lookup | Definition-bearing `<mean>` blocks | Source sense nodes | Defined `.drp` phrases | Fixture status |
| --- | ---: | ---: | ---: | --- |
| `what` | 5 | 22 | 17 | Recognized design slice |
| `turn` | 3 | 81 | 29 | Compact design slice |
| `take` | 2 | 82 | 84 | Compact design slice |
| `run` | 3 | 156 | 31 | Compact design slice |
| `process` | 4 | 19 | 0 | Compact design slice |
| `have` | 2 | 43 | 30 | Compact design slice |
| `set` | 5 | 210 | 29 | Complete recognized slice, including dedicated `seth`/`sett` rows |
| `hand` | 5 | 42 | 29 | Compact design slice |
| `give` | 2 | 69 | 18 | Compact design slice |
| `in` | 13 | 41 | 3 | Compact design slice with alternative-spelling canonical entries and soft links |
| `o` | 12 | 54 | 0 | Compact alternative-spelling canonical-entry design slice |

The source counts come from `design:fragments`; they are kept as evidence so
the manual term bank can be expanded one information unit at a time. The
helper does not replace the hand-authored semantic fixture or run during ZIP
packaging.

- Most of the 240 `turn` senses, 84 `take` phrase labels, and the remaining
  large definition trees are not transcribed into this compact fixture.
- The source fragment helper and static fixture now agree on the complete
  recognized `set` inventory: 88 transitive senses, 24 intransitive senses, 16
  adjective senses, 80 noun senses, and 29 defined phrases. The parent keeps
  all 29 phrase sections collapsed, and each phrase is independently searchable.
- Remaining `.drp` phrases in the other selected articles are deferred after
  the selected phrase examples; the parent examples demonstrate the ownership
  contract without pretending to be complete articles.
- `.entry-status` images are ignored as presentation status, as decided.
- pronunciation audio and First Known Use are ignored, as decided.
- `alt(id,w)` rows remain lookup metadata and are skipped for entry creation.
- The final label inventory and tag-bank promotion policy still need a broad
  all-source scan.
- The fixture still does not copy every definition-bearing `.mean` or every
  `.drp` phrase from the large source articles other than the completed `set`
  slice. This remains a deliberate compact design slice, not a completeness
  claim for those other articles.

## Browser render comparison

On 2026-08-03 the rebuilt 136-record ZIP was imported into the local Yomitan
Chromium fixture. The current rerun queried `set`, `what an if`,
`take the stage`, `il`, and `in`; the earlier audit also queried `what`, `turn`,
`take`, `run`, `process`, `have`, `sett`, `hand`, `give`, `give up`, and `o`.
The import succeeded with one enabled dictionary and revision
`design-what-plus-set-1`. Representative screenshots were written under
`/tmp/yomitan-design-*.png` during the audit.

The render comparison confirmed:

- `what` shows five independent POS records, nested ordered lists, orange
  target highlighting, a collapsed origin block, and one visible example
  before the extra-example disclosure;
- `process` displays normalized searchable `process` with visible `pro·cess`,
  three header readings, and exactly one inline plural form pronunciation;
- `take` keeps the space in `take the book from the table`, renders nested
  transitive/intransitive groups, and leaves phrase definitions collapsed;
- `hand` renders the newly added scoped `.sgram` labels, including
  `transitive + intransitive`, beside their local senses;
- `set` search surfaces the ordinary `set` POS records before the lower-score
  `set → seth` and `set → sett` soft links, while `sett` remains independently
  searchable; its 29 collapsed phrase sections and all recognized direct sense
  text are present in the same result;
- source homograph numbers remain visually superscripted, and entries with a
  pronunciation keep the number and IPA on one compact line; entries without
  IPA retain the number as source metadata immediately below the Yomitan
  header;
- `give up` shows the dedicated verb and noun records, while `in` and `o`
  show their independent affix/variant records and
  `main-to-alternative-spelling-soft-link` relationships;
- `take the stage` shows the soft-linked `take stage` entry with the source
  alternative `or take the stage`, while the parent `take` entry remains
  available.
- `what an if` remains an independent phrase result and `il` resolves to the
  marked `in-` records through the `alternative` soft-link rule; neither case
  duplicates the canonical definition JSON.

The renderer also caught and fixed one unsupported raw `strong` structured-
content tag. The fixture now uses a supported styled `span`; JSON-only tests
would not have caught that schema incompatibility.

When an omitted item is a genuinely new information unit rather than merely
more text of an existing unit, it must be added to
[`docs/mwu-html-survey/README.md`](../../docs/mwu-html-survey/README.md) before
the production parser is written.

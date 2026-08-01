# MWU HTML Survey

Status: living reconnaissance document; detailed per-word source evidence is
kept in separate archived reports.

This README is the shared survey vocabulary and method. It is organized in
this order:

1. information-unit catalog;
2. named levels and the information each level can contain;
3. evidence-file references;
4. cross-word rules, workflow, and open questions.

Detailed reports are intentionally kept outside this README:

- [what evidence](archived/what.md)
- [turn evidence](archived/turn.md)

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

The level and binding column records the normal owner and the exceptions
already observed. The catalog records observed information units, while the
Ignore column marks units intentionally excluded from the current dictionary
output.

The class/tag column lists selectors observed in the evidence reports. “No
dedicated class confirmed” means the information is currently plain text,
inferred from an ancestor, or still needs a more targeted survey.

| Information unit | Explanation | Example | Related HTML class/tag | Level and binding | Ignore |
| --- | --- | --- | --- | --- | --- |
| lexical-entry | One lexical/POS block with its own headword and definition tree. | a headword; a phrase | mean tag; .hword | Level 1. Every defined .drp phrase with a following definition tree is an independently searchable lexical entry; the parent also retains its .dro section. | false |
| part-of-speech | Grammar category for a lexical entry or phrase. | verb; noun; pronoun; adverb | .fl; .hword + .fl | Level 1. Header .fl belongs to the entry; phrase .fl belongs to the phrase relation. | false |
| verb-subtype | A verb subgroup such as transitive or intransitive. | transitive verb; intransitive verb | .vg; .vd | Level 2 when .vd is inside a verb group. A separate intransitive-verb mean is another source shape. | false |
| pronunciation | Visible pronunciation reading. | /ˈtərn/; /ˈtu̇rn/ | .prs; .pr | Level 1. One .prs can contain multiple .pr readings. All readings go into structured content; the Yomitan reading field remains empty. | false |
| pronunciation-audio | Playable audio metadata associated with one pronunciation. | sound://word/0001.mp3 | .play-pron; .hw-play-pron; .audio-icon | Level 1 source evidence only. Audio files are deferred and are not included in the current Yomitan dictionary. | true |
| syllabification | Syllable division or pronunciation-form display. | pro·cessed | No dedicated class confirmed; candidate .breakpoints/.breakpoint | Level 1 candidate. More word coverage is needed before treating it as a stable unit. | false |
| inflection | A form or grammatical variation of a headword or sense. | plural -s; past -ed | .headword-row; .if; .spl | Level 1 for headword-row forms; it can bind to Level 4 or Level 5 when inside a sense. | false |
| origin | Etymological history of an entry. | Middle English; partly from Old English | .section-content.etymology; .et; .mw_t_et_link | Level 1, normally scoped to one lexical/POS entry. | false |
| first-known-use | Earliest recorded use, often with a sense reference. | before 12th century (sense 1a) | No dedicated class; plain text inside .section-content.etymology | Usually attached to Level 1 origin text, while referring to Level 3–5. It is plain text, not a dedicated class. | true |
| sense-number | Numbered broad sense marker. | 1; 2; 3 | .sn; .num; .sb.has-num | Level 3. A deeper marker may inherit the number from an ancestor. | false |
| sense-label | Usage or register label qualifying a sense. | archaic; chiefly British; chiefly substandard | .sl; .sls | Usually Level 3–5. Phrase-level labels have their own phrase owner. | false |
| subsense-letter | Lettered subdivision of a numbered or unnumbered sense. | a; b; c | .sn; .letter; .sb.has-let | Level 4. The marker may appear with a parenthesized definition number. | false |
| definition-number | Parenthesized individual-definition marker. | (1); (2); (3) | .sn; .sub-num; .sb.has-subnum | Level 5. It can appear without repeating the inherited number and letter. | false |
| definition | Meaning text for a sense or phrase. | to cause movement around an axis | .dt; .sense; .sen; .pseq | Levels 3–5. .sen, .sense, .pseq, and .dt can participate in different depths. | false |
| definition-label | Text that introduces or qualifies one definition. | of a blade; chiefly dialectal | .sl; .lb | Usually Level 5, but verify the nearest definition owner. | false |
| sub-definition | A subordinate definition introduced inside a definition or usage note. | specifically: to turn the leaves of (a book): read or search through | .sdsense; .sd | Source attachment to the nearest definition or usage-note owner; rendered as a normal continuation of that definition, not a separate structural block. Preserve the source order and qualifier styling. | false |
| usage-note | Usage or grammar note attached to a definition. | usually used with over | .uns; .un; .unText | Level 6. .un can contain another .un, so nesting must be preserved. | false |
| example-sentence | Example showing the definition in use. | The machine turned slowly. | .ex-sent-group; .ex-sent; .vi; .vis | Level 6 under .dt, .un, a phrase, or related discussion. | false |
| example-source | Author or publication attribution for an example. | Theodore Roethke; Ford Times | .auth; .source; .aq | Level 6, attached to its example. .auth and .source are attribution variants. | false |
| comparison-reference | See or compare reference attached to meaning content. | compare a related term; see another entry | .dx-jump; .mw_t_dxt | Level 6 under a definition or usage note. | false |
| cross-reference | Visible linked word or phrase pointing to another dictionary item. | more at another entry; see a related term | .mw_t_sx; gdlookup:// href | Level 1 for broad related sections or Level 6 for a local definition reference. Internal navigation targets are discarded. | false |
| phrase | A defined run-on multiword lexical unit hosted under a headword, with its own source phrase identity, label, and definition tree. | take a bath; take the word | .dro; .drp; .vr; .va; .fl; .vg | Level 1 relation to the parent entry. .dro is a collection; each .drp has its own phrase boundary and definition tree and becomes an independent searchable entry. The parent retains the phrase section. | false |
| alternate-form | A spelling or phrase variant related to a canonical expression. | take stage → take the stage; take the word → take up the word | .vr; .va; alt table row | Level 1 relation. Defined phrase-local .va forms are searchable expression records for the same phrase meaning. A raw alt-table row alone is not extracted as a dictionary entry. | false |
| derivative | A new lexical item formed from a parent word. | a noun formed from a verb | No dedicated class confirmed; future source survey | Level 1 relation. It becomes an independent entry only when MWU provides its own definition. | false |
| related-item | A related word or entry reference outside the main definition. | a word in a see-also section | .related-to; .mw_t_sc; .see-in-addition; .sa-link | Usually Level 1 in related-to content, but local related references may be Level 6. | false |
| called-also | A named alternative for the thing described by a definition. | called also another term | .ca; .cat; .ucat | Level 6 when it occurs inside .dt. | false |
| synonym-discussion | Explanatory comparison of synonyms and their usage differences. | Synonym Discussion: related terms | .related-to; .syn; .synonym-discussion; .mw_t_sc | Level 1 related information attached to the lexical entry. | false |
| target-highlight | Presentation metadata marking the looked-up expression inside an example. | highlighted lookup word in an example | .mw_t_wi; .mw_t_sp | Level 6 example metadata. .mw_t_wi is useful for display but is not meaning text. | false |
| interposed-object-candidate | Derived evidence that the components of a phrasal verb are separated by an intervening object in an example. | take [a town] apart; takes [it] apart | .ex-sent-group; .ex-sent; .mw_t_wi | Observed at Level 6, but points to the Level 1 phrase entry where the canonical expression and Yomitan v_phr rule belong. Derive it from two target-highlight spans with retained text between them; do not treat italic markup alone as semantic proof. | false |

The catalog distinguishes confirmed observations from candidates. A
candidate unit remains named so that the survey tool can report it as not yet
recognized instead of silently dropping it.

## Current recognition status

This is the current status from the surveyed words `what`, `turn`, `take`, and
`run`. It is deliberately separate from the catalog's `Ignore` column:
`Ignore=true` means we understand the information but have chosen not to put it
in the current dictionary, while `not yet recognized` means our source model
is incomplete.

### Confirmed semantic units

These units have evidence for their meaning and nearest-level ownership:

- lexical-entry;
- part-of-speech and verb-subtype;
- pronunciation;
- inflection;
- origin;
- sense-number, subsense-letter, and definition-number;
- sense-label, definition-label, definition, and sub-definition;
- usage-note, example-sentence, and example-source;
- comparison-reference and cross-reference;
- phrase and defined phrase-local alternate-form;
- related-item, called-also, and synonym-discussion;
- target-highlight.

The same unit can bind to different levels. For example, `.fl` is Level 1 for
an entry header but belongs to a phrase when it appears directly after `.drp`.

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
- `.related-to` as a related-information container.

### Confirmed derived unit

`interposed-object-candidate` is derived from paired `.mw_t_wi` spans with
intervening text. It is evidence observed at the example level and points to
the canonical Level 1 phrase; it is not a literal MWU HTML class.

### Recognized but intentionally ignored

- `pronunciation-audio`: audio extraction is deferred;
- `first-known-use`: excluded from the current dictionary;
- internal navigation targets such as `gdlookup://` and `bword://`: visible
  text may remain, but the source link target is discarded.

### Partially recognized or still candidate

- syllabification: observed as a possible presentation unit, but its stable
  HTML representation needs more word coverage;
- derivative: the linguistic rule is clear, but a complete MWU source class or
  structure has not been confirmed;
- raw `alt` table rows: treated as lookup metadata only and never used alone
  to create an entry; their source role is not an information unit we export;
- tag-bank eligibility: labels are preserved and inventoried first; no final
  tag bank is generated yet;
- general visual markup such as `.mw_t_it`: preserved as presentation evidence,
  but not assumed to carry semantic meaning.

### Not yet surveyed or not yet recognized

The current evidence does not yet establish:

- image and other media structures;
- specialized related or derived-form sections;
- all phrase and variant shapes outside the surveyed `.dro`/`.vr`/`.va`
  patterns;
- all possible label-bearing classes and their WTY mappings;
- unknown descendants hidden inside already recognized containers;
- the full range of dense-word structures beyond `what`, `turn`, `take`, and
  `run`.

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
| Level 1 — Lexical Entry | lexical-entry, part-of-speech, pronunciation, pronunciation-audio, syllabification, headword inflection, origin, first-known-use, related-item, synonym-discussion, phrase, alternate-form, derivative, broad cross-reference | May contain Level 2 verb groups, or Level 3 senses directly when no verb group exists. pronunciation-audio and first-known-use are cataloged source units with Ignore=true. A phrase relation can have its own Level 3–6 tree. |
| Level 2 — Verb Group | verb-subtype, group-level label, group-level definition text | Contains Level 3 numbered senses and their Level 4–6 descendants. Source order supplies the integer group order when several .vd groups occur. |
| Level 3 — Numbered Sense | sense-number, sense-label, definition | May contain Level 4 lettered subsenses, Level 5 individual definitions, and Level 6 attachments. |
| Level 4 — Lettered Subsense | subsense-letter, sense-label, inflection, definition | May contain Level 5 individual definitions and Level 6 attachments. |
| Level 5 — Individual Definition | definition-number, definition-label, definition | Owns Level 6 usage notes, subordinate definitions, examples, citations, comparisons, and local references. |
| Level 6 — Definition Attachment | sub-definition, usage-note, example-sentence, example-source, comparison-reference, cross-reference, called-also, target-highlight | May nest usage notes and subordinate definitions. Example sources and highlighting remain attached to the example. |

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
  common take up the word. Each defined phrase form is searchable; the final
  term-bank deduplication shape is an implementation detail.
- A .fl immediately following a .drp belongs to that phrase. by the run has
  the phrase-local label adverb, even though its parent run entry is a noun
  block.
- Interposed-object evidence comes from target-highlight spans such as take
  and apart with an object between them in an example. The canonical phrase
  remains take apart; the eventual Yomitan v_phr rule belongs to that phrase
  entry, and the converter should not create a wildcard term.
- MWU gdlookup:// and bword:// targets are source navigation. The current
  decision is to discard the target while retaining useful visible text.
- Examples should eventually show the first three and collapse the rest,
  while preserving target highlighting when possible.

## Word-selection scan

The read-only comparison scanned these 12 exact words in parallel:

    give, set, run, take, make, put, break, turn,
    go, work, process, look

The detailed reports linked above are the current evidence samples from that
scan. Additional words should be selected to cover structures not represented
by the existing reports.

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
- Show the first three visible examples and collapse additional examples.
- Preserve target-word highlighting when the eventual Yomitan display supports
  it.
- Keep unclassified phrases, inflections, related information, and derivatives
  separate until their source ownership and Yomitan search behavior are
  understood. Defined `.drp` phrase forms already have the decision that each
  searchable expression is retained while the parent keeps its phrase section.
- The catalog marks first-known-use and pronunciation-audio as Ignore=true for
  the current dictionary. Audio extraction is a separate later phase.

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

All MWU `.pr` readings are display-only structured content for this project.
The Yomitan term-bank `reading` field remains empty, including when a word has
multiple readings. Pronunciation audio remains ignored and is deferred to the
later audio phase.

## Future tag-inventory tool

Before creating a tag bank, a read-only inventory tool will scan `.sl`, `.fl`,
`.vd`, `.sd`, `.lb`, parenthetical labels, phrase-local labels, and any other
label-bearing nodes found during reconnaissance. It will report each label's
text, source class, example words, frequency, nearest level, ancestor path,
and possible WTY/Yomitan mapping. It will not generate a tag bank.

The eventual tool report will use the three requested sections: interesting,
not needed, and not yet noticed or recognized.

## Deferred reconnaissance

There are no unresolved user decisions in the currently surveyed source
structures. The separate `<mean>`/`.vd` rule, the treatment of example-only
phrases, inflections, derivatives, defined `.drp`/`.va` search entries, and
nearest-level related information are working decisions.

Future reconnaissance will cover additional structures such as images,
specialized related sections, and the survey-tool coverage report. The future
tag-inventory tool—not a manual question—will decide which stable labels are
eventually promoted to the tag bank.

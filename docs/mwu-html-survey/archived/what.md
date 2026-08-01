# Word survey: what

Status: detailed reconnaissance complete; parser comparison recorded.

This report covers the exact lookup word what. It records source ownership and
information units, not a copied full dictionary entry.

## Source identity

- word row: id 464223
- HTML length: 65,653 characters
- &lt;mean&gt; blocks: 5
- top-level parts of speech: pronoun, adverb, adjective, noun, conjunction
- alt rows: 25
- associated alternate forms:
  no matter what, whaddya, what about, what and if, what an if, whatcha,
  what countryman, what else, whater, whatest, what for, what have you,
  what if, what is what, what it takes, what of, what's o'clock, what's what,
  what's with, whatter, whattest, what though, what time, what was what,
  what way

The five &lt;mean&gt; blocks are separate siblings. Each has a page-content and a
left-content region containing an entry header and a definition section.

## Source inventory

| Source structure | Count | Information interpretation |
| --- | ---: | --- |
| &lt;mean&gt; | 5 | Level 1 lexical/POS boundaries |
| .hword / header .fl | 5 / 5 | headword and part of speech |
| .prs / .pr | 5 / 10 | pronunciation container and two readings per POS block |
| .play-pron / .audio-icon | 5 / 5 | pronunciation audio controls |
| .headword-row | 1 | noun plural form -s |
| .dro / .drp | 2 / 17 | phrase regions and phrase labels |
| .vr / .va | 3 / 3 | phrase variant relation and visible alternate phrase |
| .et | 5 | etymology text |
| .section-content.etymology | 5 | origin and first-known-use owner |
| .sb / .sense | 37 / 59 | source sense grouping and definition owners |
| .sn / .num / .letter / .sub-num | 48 / 26 / 24 / 12 | hierarchy markers |
| .sl / .sls | 15 / 4 | sense and phrase labels |
| .uns / .un | 23 / 31 | usage-note containers and notes |
| .ex-sent-group | 118 | examples |
| .auth / .source | 55 / 13 | example attribution |
| .dx-jump | 3 | comparison references |
| .mw_t_wi | present | target-word highlight spans |

The selected word has no .vd, .if, .ca, or .sdsense nodes. Their absence is
specific to what, not evidence that the MWU dictionary lacks those units.

## Level 1: lexical entry and part of speech

### Lexical-entry and part-of-speech

Each &lt;mean&gt; has an entry header with .hword, header .fl, and .prs. The five
blocks are, in order, pronoun, adverb, adjective, noun, and conjunction.

The noun block additionally has a headword-row saying:

    inflected form(s): plural -s

This is a Level 1 inflection attached to the noun lexical entry.

### Pronunciation and pronunciation-audio

Each header has one .prs container and two .pr spans. The noun uses primary
stress; the other four blocks use non-primary stress in the inspected HTML.
Each block has .play-pron and .audio-icon markup. The audio metadata is not
typed as a separate unit by the current parser.

The same source class therefore does not mean one reading: a single
pronunciation unit may contain multiple readings.

### Origin and first-known-use

Each part-of-speech block has a section-content.etymology region containing
.et text and mw_t_et links. First Known Use also appears as plain text inside
the etymology section:

- before 12th century (sense 1a(1))
- before 12th century (sense 1)
- 13th century (sense 1a(1))
- no separate value was present in the fourth and fifth etymology texts

First-known-use is therefore observed in what, but it is not a dedicated
source class and is not separately typed by the current parser.

### Phrase and alternate-form relations

Two .dro regions contain 17 .drp phrase labels and nested .vg definition
groups. Three .vr nodes contain .va visible alternate phrase forms. These are
phrase structures, not example sentences.

The alt table also contains phrase-like and spelling-like rows, but an alt
table row alone is not a dictionary definition and is not extracted as an
entry. A defined `.drp` subtree is the source of truth for a phrase entry;
inflections and derivatives follow their own confirmed rules.

## Level 2: verb subtype or group

No Level 2 verb subgroup appears in what because none of its five parts of
speech is a verb. A verb word such as turn is required to verify .vd ownership
and integer group ordering.

## Levels 3–5: sense markers and definitions

The definition tree contains .vg groups and .sb blocks with has-num,
has-let, and has-subnum flags. The visible markers are children of .sn:

- .num for numbered senses such as 1 and 2;
- .letter for lettered subsenses such as a and b;
- .sub-num for parenthesized definitions such as (1) and (2).

The source uses .pseq and .sense below .sb-* groups. The exact mapping between
each .sb/.sb-* ancestor and the final Level 3, Level 4, or Level 5 owner still
needs confirmation across verb and noun words.

Definition text is owned by .dt and can occur at different depths. Therefore
definition is a multi-binding information unit rather than a fixed
Level 5-only field.

## Level 6: definition attachments

### Usage-note

.dt commonly contains .uns, which contains .un and .unText. Some .un nodes
contain another .un. The nearest usage-note owner must be retained instead of
flattening all usage text into one list.

### Example-sentence and example-source

.ex-sent-group occurs directly under .dt and under .vi/.vis inside .un.
Attribution uses .auth, .source, and italic citation markup. Examples also
contain .mw_t_wi spans around the target word.

The eventual display rule is to show the first three examples and collapse
additional examples, while preserving the target highlight when possible.

### Comparison-reference and labels

.dx-jump occurs both under .un and directly under .dt. .sl appears inside
.sense for labels such as archaic, chiefly dialectal, chiefly British,
chiefly substandard, obsolete, and Scottish. .sls also appears under
phrase-level .vg groups. These examples confirm that both references and
labels require owner-path inspection.

## Parser comparison for what

### Recognized source structures

The current parser explicitly searches for &lt;mean&gt;, .hword, .fl, .pr, .sb,
.sense, .uns, .un, and .ex-sent-group.

### Partially recognized structures

- .sn is removed while extracting definition text, so its number, letter, and
  parenthesized markers are not preserved as named information.
- .pr is collected as one pronunciation value per &lt;mean&gt; even though the
  source has two .pr spans per block.
- Usage-note and example text are extracted, but nested ownership and example
  attribution are not preserved as named units.
- .sl text can remain in extracted sense text, but the label is not modeled as
  a separate unit.

### Unrecognized or untyped structures

.prs, .num, .letter, .sub-num, .headword-row, .dro, .drp, .vr, .va, .sls,
.et, .dx-jump, .auth, .source, .play-pron, .audio-icon, .mw_t_wi, and the
plain-text First Known Use marker are not separate typed units in the current
parser.

## Word-specific follow-up questions

- Confirm the exact .sb, .sb-*, .pseq, and .sense ownership rule with a verb.
- Confirm whether two .pr spans are readings of one pronunciation or separate
  display units.
- Distinguish phrase entries from derivatives and from alt-table spelling
  variants.
- Determine how comparison and internal-link visible text should be displayed
  after navigation targets are discarded.

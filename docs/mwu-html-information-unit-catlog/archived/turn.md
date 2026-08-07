# Word survey: turn

Status: detailed reconnaissance complete; selected for broad structural
coverage after a 12-word read-only comparison.

This report covers the exact lookup word turn. It records source ownership and
information units, not a copied full dictionary entry.

## Why turn was selected

The comparison scanned give, set, run, take, make, put, break, turn, go,
work, process, and look. Turn had the broadest single-word coverage of the
requested structural classes. It adds verb grouping, sense-bound inflection,
subordinate-definition markup, called-also information, dense phrase and
definition trees, and a related synonym discussion to the what baseline.

## Source identity

- word row: id 450356
- HTML length: 231,181 characters
- &lt;mean&gt; blocks: 3
- alt rows: 36
- alternate rows:
  at every turn, by turns, in turn, on the turn, out of turn, returnables,
  returners, to a turn, turn a blind eye, turn a cold shoulder to,
  turn a deaf ear, turn a flange, turn a hair, turn a hand,
  turn around one's finger, turn around one's little finger, turn color,
  turn edge, turn flukes, turn loose, turn one's back on,
  turn one's back upon, turn one's coat, turn one's hand, turn one's stomach,
  turn over a new leaf, turn tail, turn the balance, turn the other cheek,
  turn the scale, turn the tables, turn the trick, turn thumbs down,
  turn to windward, turn turtle, turners

## Source inventory

| Source structure | Count | Information interpretation |
| --- | ---: | --- |
| &lt;mean&gt; | 3 | Level 1 lexical/POS boundaries |
| header .hword / header .fl | 3 / 3 | headwords and top-level POS |
| .prs / .pr | 3 / 4 | pronunciation containers and readings |
| .play-pron / .audio-icon | 3 / 3 | audio controls |
| .headword-row | 3 | -ed/-ing/-s, plural -s, and -ed/-ing/-s |
| .if / .spl | 1 / 1 | sense-bound inflected form and plural label |
| .vd | 2 | transitive and intransitive Level 2 groups |
| .vg / .sb | 33 / 82 | definition and phrase grouping |
| .pseq / .sense | 39 / 240 | nested definition groups and owners |
| .sn / .num / .letter / .sub-num | 220 / 60 / 115 / 102 | hierarchy markers |
| .sl / .sls | 29 / 2 | sense and phrase labels |
| .sdsense / .sd | 25 / 25 | subordinate-definition units and their qualifiers |
| .uns / .un | 31 / 31 | usage-note containers and notes |
| .ex-sent-group | 462 | examples |
| .auth / .source | 263 / 47 | example attribution |
| .dx-jump | 4 | comparison references |
| .dro / .drp | 2 / 29 | phrase regions and phrase labels |
| .vr / .va | 4 / 4 | phrase variant relations and visible forms |
| .et | 4 | etymology and local origin text |
| .ca | 1 | called-also relation |
| .related-to / .syn | 1 / 3 | related synonym discussion |
| .mw_t_sc | 35 | visible related-word links |
| .see-in-addition / .sa-link | 1 / 1 | related see-also information |

## Level 1: lexical entries and POS

### Mean 1: verb

The first block has header 1 turn, part of speech verb, pronunciation
approximately /ˈtərn/, and headword inflections -ed/-ing/-s.

Its definition section contains a transitive verb group and an intransitive
verb group. These are Level 2 children of the same Level 1 verb entry.

### Mean 2: noun

The second block has header 2 turn, part of speech noun, pronunciation
approximately /ˈtərn/, and plural -s. It contains the dense noun definition
tree and many phrase relations.

The .fl labels adverb and adverb (or adjective) occur inside .dro phrase
groups, not in this entry header. This proves that part-of-speech markup can
bind to a phrase relation rather than the parent lexical entry.

### Mean 3: separate intransitive-verb entry

The third block has header 3 turn, part of speech intransitive verb, and two
readings, approximately /ˈtərn/ and /ˈtu̇rn/. It also has -ed/-ing/-s
headword inflections. This block has no .vd child and contains one no-sn
definition group.

This is a second source shape for verb subtype information: an intransitive
verb may be a Level 2 .vd group inside a verb entry or a separate Level 1
&lt;mean&gt; whose POS label says intransitive verb. The final model must keep the
source boundary visible until more words confirm the rule.

### Pronunciation and audio

Each &lt;mean&gt; has one .prs. Mean 1 and mean 2 have one .pr; mean 3 has two
.pr readings. Each has a playable sound link with data-lang en_us and a
sound-style target such as sound://t/turn0001.mp3. The visible pronunciation
and the audio control should remain separate information units.

### Origin and first-known-use

Mean 1 and mean 2 have an etymology section with First Known Use text:

- Middle English ... First Known Use: before 12th century (transitive sense
  1a)
- Middle English ... First Known Use: 13th century (sense 1a)

Mean 3 has an etymology section but no First Known Use phrase in the
inspected text. First-known-use is therefore optional and is scoped to the
lexical/POS entry while referring to a deeper sense.

### Related synonym discussion

Mean 1 has a related-to section containing Synonym Discussion. It includes
visible related terms such as revolve, rotate, gyrate, circle, spin, twirl,
whirl, wheel, eddy, swirl, and pirouette, plus a see-in-addition reference to
depend.

The links use bword:// targets and are internal source navigation. Per the
current project decision, the eventual representation should discard the
navigation target while retaining useful visible terms and explanatory text.

## Level 2: verb subtype or group

Mean 1 contains two .vg groups whose first child is a .vd node:

1. transitive verb
2. intransitive verb

The source order is enough to assign integer subgroup identifiers 1 and 2 for
this Level 1 entry. The first .vd has the extra class firstVd; that class is
not the semantic source of the group number and should not be required.

The separate mean 3 intransitive-verb header has no .vd. This confirms that
the level name describes semantic grouping, while the source representation
can vary.

## Levels 3–5: dense marker and definition structure

The main verb and noun trees use .sb blocks with combinations of has-num,
has-let, and has-subnum. Representative marker text includes:

- 1a: Level 3 number 1 plus Level 4 letter a;
- b(1): Level 4 letter b plus Level 5 definition number (1), inheriting its
  numbered sense from the surrounding group;
- 2a(1): all three markers together;
- (2): a Level 5 definition under an already established parent;
- c(1), e(1), f(1), and g(1): deeper letter/definition combinations.

The .pseq no-subnum container groups multiple .sense nodes. It is a source
grouping container, not automatically an additional user-visible level.

Phrase definitions also use .sen nodes such as .sen has-num-only and .sen
no-subnum. Their marker/definition behavior should be kept separate from the
main lexical sense tree until phrase ownership rules are finalized.

## Level 6: definition attachments

### Inflection

The noun tree contains a sense-bound inflection:

    c turns plural : menses

Here .if and .spl are inside .sense, under a lettered group. This is different
from the Level 1 headword-row inflections and proves that inflection can bind
to a deeper sense.

### Usage-note

.un occurs under .uns and .dt. Examples include notes introduced by usually
used with over, used chiefly in the phrase turn one's head, and usually used
with into. The source contains 31 .un nodes and should not be flattened before
ownership is resolved.

Some .un content contains .sdsense, so a subordinate definition can be
nested under a usage-note owner.

### Sub-definition

.sdsense and its .sd qualifier represent subordinate definition text such as
specifically, often, especially, also, and sometimes. It appears directly
inside a .sense or .dt and also inside a .un. It is an information unit bound
to the nearest definition or usage-note owner, not a new numbered hierarchy
level.

Concrete examples to check in GoldenDict by looking up turn include:

    specifically : to turn the leaves of (a book) : read or search through
    often : to cause to be directed away or aside
    especially : to send or order away

Chat decision: use the normal-continuation presentation. The .sdsense remains
attached to the surrounding definition in the intermediate data, but it is
not rendered as a separate indented definition block. Preserve the MWU order:
the example `turning the pages of the book` appears first, followed by
`specifically : to turn the leaves of (a book) : read or search through`.
Keep the qualifier visually distinct in the MWU style, such as red italic
`specifically`, and preserve target highlighting on `turn`.

### Example-sentence, example-source, and highlighting

There are 462 .ex-sent-group nodes. They appear directly inside .dt, inside
usage-note content, and in phrase/related structures. Example attribution uses
.auth and .source. Target-word highlighting uses .mw_t_wi.

The eventual display should show the first three visible examples and collapse
the remainder. The source supports both highlighted target text and cited
examples.

### Comparison-reference

Four .dx-jump nodes are directly inside .dt. Examples include see circle turn,
open turn, reverse turn, rock turn and compare wheel. In what, comparison
references also appear under usage notes; the owner path must therefore be
preserved.

### Called-also

One .ca node occurs inside a .dt:

    — called also coup

Its nearest semantic owner is the specific definition, so it is a Level 6
called-also relation rather than a new lexical entry.

### Phrase and phrase variant

Two .dro regions contain 29 .drp phrase labels. Examples include turn a blind
eye, turn a cold shoulder to, at every turn, and in turn. Four .vr nodes
contain four .va visible variants, including turn around one's little finger
and turn one's back upon.

Phrase POS labels such as adverb and adverb (or adjective) occur within these
phrase regions. Phrase definitions use their own .vg/.sb/.sense trees.

## Parser comparison for turn

### Recognized source structures

The current parser explicitly searches for &lt;mean&gt;, .hword, .fl, .pr, .sb,
.sense, .uns, .un, and .ex-sent-group. It can therefore reach the main
definition and example text, but that does not mean it preserves every
semantic boundary.

### Partially recognized structures

- .sb and .sense are traversed, but .vd, .pseq, and marker ownership are not
  modeled as named levels.
- .sn is removed during definition-text extraction, so .num, .letter, and
  .sub-num are not preserved.
- .pr readings are merged into one value per &lt;mean&gt;, so mean 3 loses the
  distinction between its two readings.
- .un text and examples are extracted, but nested usage-note ownership and
  attribution are flattened.
- phrase definitions may be reached through .sb/.sense traversal, but .dro,
  .drp, and phrase-level .fl ownership are not modeled.

### Unrecognized or untyped structures

.vd, .pseq, .num, .letter, .sub-num, .if, .spl, .sdsense, .sd, .ca, .dro,
.drp, .vr, .va, .et, First Known Use text, .dx-jump, .auth, .source,
.mw_t_wi, .related-to, .syn, .mw_t_sc, .see-in-addition, .sa-link,
.play-pron, and .audio-icon are not separate typed units in the current
parser.

## Resolved structure decisions and deferred work

- A separate intransitive-verb `<mean>` is a Level 1 lexical/POS block; the
  integer `.vd` groups inside mean 1 are Level 2.
- Every defined `.drp` phrase and phrase-local `.va` form is independently
  searchable, while the parent keeps its phrase section.
- `called also coup` remains attached to its specific definition, while the
  broader Synonym Discussion remains attached to its Level 1 related-to
  region.
- Audio is intentionally deferred; it is not part of the current dictionary.

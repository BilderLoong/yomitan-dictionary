# MWU HTML Survey: take

This is an evidence report for the exact lookup word take. It records the
source structures that led to the shared .dro rules; it is not a converter
specification and does not reproduce the complete dictionary entry.

## Source row and coverage

- Exact lookup word: take
- MWU word row: id = 362180
- Source HTML length: 244252
- Top-level <mean> blocks: 2
- .dro containers: 2
- .drp phrase labels: 84
- alt rows for the word row: 95
- Additional observed phrase-variant nodes: .vr and .va

The source database has no separate word row for take a bath. In
GoldenDict, searching take a bath routes to the parent and displays
See: 1 take. The phrase is nevertheless a separately defined lexical item
inside the parent's .dro region. The eventual phrase entry should use the
definition extracted from this .drp subtree; it should not emit `See: 1 take`
as the phrase's dictionary content.

The associated alt table includes take a bath, take apart, take stage, and
take the word, but it is not used to create the phrase entry. The `.drp`
subtree is the source of truth. The alt-table row for `take a bath` is ignored
for extraction, so there is one independently searchable `take a bath` phrase
entry, created from its `.drp` definition. The parent `take` entry separately
retains the phrase in its `.dro` section.

## Level 1 — Lexical Entry

The observed phrase regions are descendants of the take lexical/POS
structure. The parent entry must keep its complete .dro section so that a
lookup of take still displays the run-on phrases.

Every .drp item with its own definition tree must be modeled as an independent
searchable phrase entry. This includes take a bath, take stage, take the word,
and take apart. The parent entry also keeps the .dro phrase section. It does
not mean that neighboring phrases or the parent's unrelated senses should be
merged.

## .dro collection and individual .drp items

Each .dro is a collection. A .drp label owns the following phrase content
until the next .drp or the end of the phrase container.

| Source phrase | Phrase-local structure | Definition evidence |
| --- | --- | --- |
| take a bath | .drp followed directly by .vg | to suffer a heavy financial loss |
| take stage | .drp, then .vr with .vl or and .va take the stage, then .vg | to center attention upon oneself ... |
| take the word | .drp, then .vr with .vl or less commonly and .va take up the word, then .vg | to begin to speak |
| take apart | .drp followed by a multi-sense .vg | numbered and lettered definitions, comparisons, and examples |

The searchable expression records from this evidence are therefore `take a
bath`, `take stage`, `take the stage`, `take the word`, `take up the word`,
and `take apart`. The `.va` forms share the phrase meaning of the canonical
`.drp` item; they are not unrelated senses of the parent word `take`.

The reduced source shapes are:

    .drp take a bath
      .vg
        .sense
          .dt : to suffer a heavy financial loss

    .drp take stage
      .vr
        .vl or
        .va take the stage
      .vg
        .dt : to center attention upon oneself ...

    .drp take the word
      .vr
        .vl or less commonly
        .va take up the word
      .vg
        .dt : to begin to speak

The .vr relation is phrase-local because it occurs between that .drp and its
definition tree. Both the canonical .drp phrase and its phrase-local .va form
are searchable expression records for the same phrase meaning. Later export
work may share or deduplicate their definition content; it must not remove the
alternate search expression.

## Level 3–6 evidence: take apart

take apart demonstrates that one .drp can contain the full sense hierarchy:

- numbered sense 1;
- numbered sense 2;
- numbered-and-lettered sense 3a;
- lettered continuation 3b;
- examples attached to those definitions.

The examples include target spans separated by ordinary object text:

    take a town apart
    takes it apart
    take the various games and sponsors apart
    take the witness apart
    take your opponent apart

In the source, the two expression components are marked with separate
.mw_t_wi spans. The intervening object text remains outside those spans.
This is stronger evidence for an interposed-object candidate than .mw_t_it,
which is also used for ordinary italic source attributions.

The candidate is attached to the Level 6 example. The canonical lexical owner
is the Level 1 phrase entry take apart, where the eventual Yomitan v_phr
lookup rule belongs. The example text should remain intact and the two target
components should remain highlightable.

## Survey conclusions

1. A .dro is a collection, not one definition.
2. Every defined .drp is an individual phrase identity and must not be
   merged with adjacent .drp items.
3. The parent entry keeps the phrase section and every defined phrase form can
   also be independently searchable. The phrase definition is extracted from
   the .drp subtree, not from the GoldenDict `See: 1 take` navigation row.
4. .vr/.va and .fl immediately following a .drp bind to that phrase.
5. Interposed-object detection uses paired .mw_t_wi target spans plus the
   retained intervening text.

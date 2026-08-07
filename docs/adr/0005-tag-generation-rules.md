# Tag-generation rules

Date: 2026-08-07

## Status

Accepted.

## Context

MWU source labels (`noun`, `transitive verb`, `archaic`, `slang`, …) must
become Yomitan dictionary metadata without conflating three different Yomitan
scopes:

1. **Term tags** (term-bank field 7) describe the complete searchable
   expression and appear near the headword.
2. **Definition tags** (term-bank field 2) describe the complete definition
   card / term-bank row: a space-separated string, with an empty string
   meaning no tags. In the bundled fixture (26.7.29.0) they are display
   chips only: they flow into `tagAggregator.addTags` and never enter the
   matching path — `_matchEntriesToDeinflections` reads only the rules
   field. (An older claim that tag names matching an English condition act
   as conditions is not supported by the fixture code.)
3. **Rules / deinflectors** (term-bank field 3) is a space-separated list of
   rule identifiers used to validate deinflection. Yomitan derives a term's
   inflection conditions from this field (`getConditionFlagsFromPartsOfSpeech`
   in `language-transformer.js`), not from the tag fields.

Yomitan's English conditions (`ext/js/language/en/english-transforms.js`) are:
`v`, `v_phr`, `n`, `np`, `ns`, `adj`, `adv` (all `isDictionaryForm`). Tags
outside this set are display chips only and take part in no inflection.

The tag bank file (`tag_bank_N.json`) holds `[name, category, sortOrder,
notes, score]` tuples; the category controls the UI color, and the score
participates in popularity sorting.

The living survey's label decisions already commit to: local labels stay
visible structured content beside the unit that owns them; labels become
global metadata only when their scope is stable; unrecognized labels are
reported, never dropped.

## Decision

1. **Definition tags** are derived from the entry's `.fl` part of speech
   through the `POS_TOKEN`/`POS_SPECIAL` whitelist in
   `renderStructuredContent.ts` (for example `noun` → `n`, `transitive verb`
   → `v`, `abbreviation` → `abbr`). A phrase without a local `.fl` receives
   the display tag `phrase`.
2. **Term tags stay empty.** No MWU source label has been shown to describe
   the whole searchable expression across the dictionary yet.
3. **The rules field stays empty** except for `v_phr`: a defined `.drp`
   phrase whose examples contain paired `.mw_t_wi` target-highlight spans
   with retained text between them (the interposed-object pattern, e.g.
   `they took the engine apart`) receives the rule `v_phr`. This is lookup
   behavior, not a visual label: it enables Yomitan's own interposed-object
   deinflection (`give you up` → `give up`) for exactly the phrases with
   source evidence. Ordinary emphasis (`.mw_t_it`, `em`) never creates the
   rule. Non-phrase entries never receive it.
4. **No tag bank file is emitted.** Definition tags are written directly into
   the term-bank tag field; tag-bank entries would duplicate them and add
   nothing until a global category/score scheme exists.
5. **All other labels** (`.sl`, `.il`, `.vl`, `.sgram`, `.lb`, …) remain
   inline structured content at their nearest semantic owner. Promotion to
   the tag bank is deferred until a dictionary-wide scope inventory exists;
   the label inventory tool is a prerequisite, not a manual decision.

## Consequences

- Search and inflection behavior is predictable: only `v_phr` (evidence
  based) and the English dictionary-form conditions affect lookup; display
  chips stay purely visual.
- The `v_phr` rule is conservative by construction: Yomitan's
  interposed-object rule only fires when the phrase's final word is a true
  particle, so phrases like `take care` or `take advantage of` carry the tag
  without gaining deinflections.
- Every attached `v_phr` rule is reported as an
  `interposed-object-v-phr` conversion finding, so the build report makes
  the lookup-behavior surface auditable.
- Reversing this decision later is cheap for display tags (they do not
  affect lookup) and moderate for `v_phr` (it changes reachable lookups);
  both are recorded in the build report, which makes the reversal
  verifiable.

## Amendment (2026-08-08)

Decision point 3 is superseded:

3. **The rules field stays empty** except for `v_phr`, which now attaches to
   any canonical entry — `main-canonical-entry`,
   `alternative-spelling-canonical-entry`, or `drp-phrase-canonical-entry` —
   whose searchable term has at least two space-separated words and whose
   own examples contain an interposed-object candidate: two marked spans
   (`.mw_t_wi` target highlight or `.mw_t_it` emphasis) with retained text
   between them, where the second marked span equals the term's final token
   (for example `give it up` proves `give up`, including the emphasis-marked
   `<em>gave</em> it <em>up</em>`). Rationale: a full-database audit found
   the emphasis pair is the source's own interposed-object proof (for
   example `he bawled me out`, `they bid the prices up`); the final-token
   equality filter removes the measured spurious classes (italic titles
   such as `Vanity Fair`, repeated-word emphasis `came … came`,
   cross-idiom contamination `did herself proud`, split-idiom objects
   `batted in 70 runs`); the multiword gate keeps single-word entries
   (`give`) from carrying the rule via repeated-word pairs (`give me
   liberty or give me death`). The final word is deliberately not checked
   against Yomitan's particle list: the evidence itself pins the separated
   word, and Yomitan's lookup-time particle check remains the filter, so
   preposition-final phrases with genuine evidence (for example `bring to`)
   may carry a flag that never fires.

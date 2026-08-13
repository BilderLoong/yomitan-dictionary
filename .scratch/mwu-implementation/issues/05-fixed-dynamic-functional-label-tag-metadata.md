# 05 — Fixed and dynamic MWU functional-label tag metadata

**Status:** resolved 2026-08-13

**Source:** Design discussion completed 2026-08-10. A published copy also
exists as GitHub issue 1.

## Problem Statement

The Merriam-Webster Unabridged converter reads each canonical entry's `.fl`
functional label and writes reviewed atomic values into the Yomitan
`definitionTags` field. The completed feature preserves functional-label
distinctions, prevents accidental space-separated tokens, and emits tag-bank
metadata. For example, Yomitan can show `n` with its category, order, clear
description, and tag score.

The previous descendant selector could cross a semantic ownership boundary.
When a Level 1 canonical entry had no functional label, it could borrow the
first `.fl` label from a nested undefined run-on. For example, `homeothermic`
could see `noun,` from the nested `homeotherm` run-on even though
`homeothermic` did not own that label. The completed owner-local extractor no
longer crosses that boundary.

The current static source database has 98 distinct normalized owned functional
labels after the ownership correction. The completed converter has an explicit
reviewed mapping for this inventory and a visible diagnostic path for a future
or unexpected label.

## Solution

The functional-label feature owns a complete fixed tag catalog, an explicit
mapping for all 98 current normalized `.fl` labels, a pure resolver, a dynamic
fallback, deterministic ordering, and inventory coverage.

Known labels will resolve to atomic Yomitan definition tags. The archive will
contain a complete `tag_bank_1.json` with clear dictionary-owned metadata.
Unknown labels will remain visible as reversible dynamic tags, produce
conversion findings, and use a separate amber dashed presentation.

Each definition-owning Level 1 canonical entry will read only its own
functional label. Main canonical entries, alternative-spelling canonical
entries, and defined phrase canonical entries can each receive their own tags.
A defined phrase will always receive `phrase` and can also receive tags from
its own `.fl` label. Soft-link entries will continue to own only lookup
relationships and will not receive definition tags or term tags.

Sense-local labels, such as `archaic`, will remain inside structured content at
the semantic unit that owns them.

## User Stories

1. As a dictionary user, I want a noun definition to show a clear `n` tag, so that I can identify its part of speech quickly.
2. As a dictionary user, I want tag descriptions in plain English, so that I can understand unfamiliar grammatical terms.
3. As a dictionary user, I want verb subtypes to remain visible, so that I can distinguish transitive, intransitive, imperative, impersonal, past, past-participle, and auxiliary uses.
4. As a dictionary user, I want article types to remain visible, so that I can distinguish definite and indefinite articles.
5. As a dictionary user, I want combined functional labels to produce separate atomic tags, so that Yomitan does not display words such as `or` as accidental tags.
6. As a dictionary user, I want noun-number information to remain visible, so that I can distinguish singular form, plural form, and subject-verb agreement.
7. As a dictionary user, I want agreement tags to use names such as `takes-singular-verb`, so that the meaning is clear without knowledge of MWU terminology.
8. As a dictionary user, I want word-element tags to explain what an element forms, so that `noun-forming` and `plural-noun-forming` labels are not confused with the form of the suffix itself.
9. As a dictionary user, I want geographical names, trademarks, service marks, certification marks, and collective marks to stay distinct, so that MWU's classification is not lost.
10. As a dictionary user, I want a defined phrase to show `phrase`, so that its Level 1 entry type remains clear.
11. As a dictionary user, I want a defined phrase with its own noun label to show both `n` and `phrase`, so that both source facts remain visible.
12. As a dictionary user, I want sense-local labels such as `archaic` to stay beside their sense, so that they do not incorrectly describe the complete definition record.
13. As a dictionary user, I want an unexpected source label to remain visible, so that conversion does not silently discard information.
14. As a dictionary user, I want an unexpected tag to look different from reviewed tags, so that I can recognize diagnostic metadata.
15. As a dictionary user, I want normal and dynamic tags to have clear descriptions, so that their meaning and review status are understandable.
16. As a dictionary user, I want tag order to be stable, so that the same kinds of tags appear in the same order across entries.
17. As a dictionary user, I want a soft-link lookup to lead to the tagged canonical definition, so that relationship records do not copy or invent definition metadata.
18. As a dictionary builder, I want every current `.fl` label to have an explicit reviewed mapping, so that source behavior is auditable.
19. As a dictionary builder, I want the full fixed catalog in every archive, so that metadata does not vary with the selected build.
20. As a dictionary builder, I want only encountered dynamic tags in an archive, so that the archive does not contain speculative diagnostic tags.
21. As a dictionary builder, I want unknown labels to produce actionable findings, so that I know which fixed mapping might be needed.
22. As a dictionary builder, I want selected builds to retain per-entry unknown-label findings, so that I can inspect the exact source owner.
23. As a dictionary builder, I want full builds to retain an aggregate unknown-label summary, so that the report stays small.
24. As a dictionary builder, I want each aggregate unknown label to include its total count and at most five deterministic samples, so that the result is useful and bounded.
25. As a dictionary builder, I want the current static database to produce zero dynamic tags, so that the fixed inventory is demonstrably complete.
26. As a dictionary builder, I want normal conversion to succeed when a future label is unknown, so that source information is preserved instead of blocking an ordinary build.
27. As a release engineer, I want the inventory audit to fail when a current source label has no fixed mapping, so that a release cannot silently depend on a dynamic fallback.
28. As a maintainer, I want one feature module to own the catalog, mapping, resolver, fallback, ordering, and coverage rules, so that tag behavior is easy to find and change.
29. As a maintainer, I want mapping logic to use immutable tag arrays internally, so that spaces are introduced only at the Yomitan serialization boundary.
30. As a maintainer, I want fixed-tag descriptions to be reviewed prose rather than generated identifier text, so that they stay easy to understand.
31. As a maintainer, I want dynamic identifiers to be readable and reversible without hashes, so that I can recover the source label.
32. As a maintainer, I want literal underscores and reserved punctuation to be escaped, so that two different raw labels cannot produce the same dynamic identifier.
33. As a maintainer, I want tags to be deduplicated and sorted by catalog order, so that output stays deterministic.
34. As a maintainer, I want a missing owned `.fl` label to resolve to no tag instead of an invented missing tag, so that absence is represented accurately.
35. As a maintainer, I want an alternative-spelling canonical entry to use only its own label, so that it cannot inherit unrelated metadata from a parent or target.
36. As a maintainer, I want nested undefined-run-on labels to stay local, so that parent canonical records cannot borrow them.
37. As a maintainer, I want the build report and archive to remain deterministic, so that repeated builds can be compared reliably.
38. As a maintainer, I want the previous broad POS mapping removed rather than retained as a compatibility path, so that there is one clear source of truth.
39. As a maintainer, I want the domain glossary, architecture decision, current specifications, and package documentation to match the implemented behavior, so that future work does not rely on obsolete rules.
40. As a maintainer, I want a real rendered Yomitan check, so that schema-valid metadata is also understandable and visually distinct in the actual interface.

## Implementation Decisions

- Scope the new metadata to entry-wide functional labels in
  `definitionTags`. Keep `termTags` empty. Keep sense-local labels inside
  structured content.
- Preserve the Yomitan term-bank v3 contract. `definitionTags` remains the
  record-level tag field, the rules field keeps its existing inflection
  purpose, and `termTags` remains empty.
- Replace the old token and special-case mapping with one new reviewed
  inventory and mapping. Do not keep a backward-compatibility resolver.
- Create one `functionalLabels` feature module. It owns the fixed catalog,
  explicit raw-label mapping, immutable tag lists, dynamic-name encoding,
  dynamic fallback, deduplication, sorting, descriptions, and coverage
  validation.
- Use an explicit exact mapping for all 98 normalized source labels. Do not
  implement a general English parser for future labels.
- Normalize only surrounding and repeated whitespace before mapping. Keep
  punctuation and case significant. Exact current variants can have separate
  mappings when the inventory proves they exist.
- Represent resolved tags as immutable arrays internally. Join them with
  ASCII spaces only when the term-bank tuple is assembled.
- Remove duplicate tags and sort them by the fixed catalog order before
  serialization. Put dynamic tags after fixed tags.
- Emit a complete fixed tag catalog in every archive through the existing
  dictionary builder. Let the existing builder create `tag_bank_1.json`; do
  not add a custom ZIP writer.
- Use tag-bank tuples with name, category, order, note, and score. Keep every
  tag-bank score at zero because tag score is not the term-bank lookup
  popularity score.
- Use `partOfSpeech` as the category for all reviewed fixed functional tags.
- Use `unmappedPartOfSpeech` as the category for dynamic tags. Give this
  category an amber dashed dictionary-owned style.
- Use semantic order bands: core word classes first, then verb and article
  qualifiers, word-element types, result classes, number and agreement facts,
  names and marks, and dynamic tags at order 9000.
- Use familiar compact names for common parts of speech, including `n`, `v`,
  `adj`, `adv`, `pron`, `prep`, `conj`, `interj`, and `abbr`.
- Use explicit names for less familiar facts. Examples include
  `takes-singular-verb`, `takes-plural-verb`,
  `takes-singular-or-plural-verb`, `plural-form`, `singular-form`,
  `noun-forming`, and `plural-noun-forming`.
- Write fixed descriptions as one or two short plain-English sentences. Put
  the clear meaning first and the MWU wording second when the wording differs.
  Add only verified examples.
- Preserve detailed verb facts. For example, `transitive verb` resolves to
  `v` and `transitive`; `verb past` resolves to `v` and `past`; `past
  participle` resolves to `v` and `past-participle`; `verbal auxiliary`
  resolves to `v` and `aux`.
- Preserve article facts. `Definite article` resolves to `article` and
  `definite`. `Indefinite article` resolves to `article` and `indefinite`.
- Keep pronoun form separate from agreement. `Plural pronoun` resolves to
  `pron` and `plural-form`. `Pronoun, plural in construction` resolves to
  `pron` and `takes-plural-verb`.
- Treat plain plural nouns according to MWU's documented convention. `Noun
  plural` and `plural noun` resolve to `n`, `plural-form`, and
  `takes-plural-verb`. Explicit agreement exceptions replace the standard
  agreement tag.
- Treat word elements as word-element types plus result classes. `Noun
  suffix` resolves to `suffix` and `noun-forming`. `Noun plural suffix`
  resolves to `suffix` and `plural-noun-forming`.
- Always add `phrase` to a `drp-phrase-canonical-entry`. If the phrase owns a
  functional label, add its resolved tags as well.
- Read a functional label only from the header owned by the current canonical
  entry. Do not search through nested undefined run-ons or other nested
  semantic owners.
- Apply owner-local extraction to `main-canonical-entry`,
  `alternative-spelling-canonical-entry`, and
  `drp-phrase-canonical-entry`.
- Do not inherit a missing label from a parent, sibling, canonical target, or
  nested run-on.
- Keep `soft-link-entry` `definitionTags` and `termTags` empty because a soft
  link owns a lookup relationship, not a definition.
- Encode an unknown normalized label as a visible question-mark prefix plus a
  readable reversible token. Replace spaces with underscores, escape literal
  underscores as percent-encoded data, and percent-encode other reserved
  characters. Do not add hashes.
- Generate dynamic descriptions from a fixed template that includes the
  exact normalized MWU label and states that the label is not in the fixed
  catalog.
- Add an `unmapped-functional-label` conversion finding with row, term, raw
  label, normalized label, and generated tag.
- Extend `build-report.json` with a functional-label summary. Selected builds
  keep per-entry findings and an aggregate summary. Full builds keep the
  bounded aggregate summary when detailed conversions are omitted.
- Store the total occurrence count and at most five deterministic row-and-term
  samples for each dynamic tag.
- Let normal builds succeed with dynamic tags. Make the separate inventory
  audit write its deterministic JSON result and exit with failure when a
  current label is not mapped.
- Add a deterministic `inventory:functional-labels` command. It scans
  canonical owners from the read-only source database and writes generated
  inventory evidence under the build directory. The generated inventory is
  not committed as a source-of-truth mapping.
- Inventory rows include normalized label, count, canonical-owner kind counts,
  a sample row and term, mapping status, and resolved tags.
- Expect the present static database to contain 98 real owned normalized
  labels and produce zero dynamic tags. The old broad selector finds one
  additional false label, `noun,`, because it crosses into the `homeotherm`
  undefined run-on.
- Update the accepted tag-generation architecture decision. Supersede the
  decisions that no tag bank is emitted and that tag-bank score affects term
  lookup popularity.
- Update the current entry-conversion and dictionary-build specifications, the
  domain glossary, and package documentation to use the new ubiquitous
  language and behavior.

## Testing Decisions

- Prefer the highest existing seam: build a selected dictionary, inspect its
  build report and archive, validate all schemas, and confirm that every
  serialized definition-tag token resolves to emitted tag-bank metadata.
- Keep focused pure tests for the `functionalLabels` feature because the
  98-row mapping and dynamic encoding are dense deterministic domain behavior.
- A good mapping test asserts observable input-to-output behavior. It does not
  assert private helper calls or internal data structure layout.
- Test every fixed catalog record for a nonempty name, approved category,
  deterministic order, clear nonempty note, and zero tag score.
- Test that every one of the 98 current normalized labels maps only to tags
  that exist in the fixed catalog.
- Test representative mappings for combined parts of speech, detailed verbs,
  articles, number and agreement, word-element types, result classes, names,
  and marks.
- Test that tag arrays are deduplicated and sorted before serialization.
- Test dynamic encoding with spaces, underscores, percent signs, punctuation,
  and case. Confirm that distinct normalized labels cannot collide.
- Test that an unknown label produces one dynamic tag, one tag-bank record,
  and one `unmapped-functional-label` finding.
- Test that repeated occurrences of the same unknown label reuse one dynamic
  tag and increase the aggregate count.
- Test that aggregate samples are deterministic and capped at five.
- Test owner-local extraction through canonical conversion. Cover a main
  canonical entry, an alternative-spelling canonical entry, and a defined
  phrase canonical entry.
- Add regressions for `Hall of Fame`, `homeothermic`, and `role-play`. Their
  parent canonical entries must not borrow nested undefined-run-on labels.
- Test that a defined phrase always receives `phrase` and can also receive its
  own functional tags.
- Test that a canonical entry with no owned label emits an empty
  `definitionTags` value rather than a dynamic missing tag.
- Test that soft-link records keep empty `definitionTags` and `termTags`.
- Extend selected-archive schema tests to require `tag_bank_1.json` and
  validate it with the repository-supported Yomitan tag-bank schema.
- Test that every `definitionTags` token in every emitted term-bank record has
  matching tag-bank metadata.
- Test that the archive always contains the complete fixed catalog and
  contains only dynamic records encountered by that build.
- Extend pipeline report tests for selected per-entry findings, full-build
  aggregate summaries, deterministic sample ordering, and finding totals.
- Run the real-database inventory audit before release. It must report 98
  mapped labels and zero unmapped labels for the current database snapshot.
- Keep repeated-build tests. Identical source input must produce equal
  semantic term-bank data, tag-bank data, build-report data, and ordering.
- Use the existing selected archive schema tests, Level 1 structure archive
  tests, structured-content integration tests, canonical conversion tests,
  pipeline report tests, and browser inspection harness as prior art.
- Finish with a rendered Yomitan check. Confirm normal fixed chips, long
  agreement chips, tag descriptions, semantic order, phrase combinations,
  and the amber dashed dynamic style using a controlled dynamic fixture.

## Out of Scope

- Populating `termTags`.
- Promoting sense-local labels such as `archaic`, `slang`, or regional labels
  into entry-wide metadata.
- Changing the existing rules or deinflection behavior.
- Changing term-bank popularity scores.
- Modifying the source MWU database.
- Creating independent canonical records for undefined run-ons.
- Copying canonical definitions or tags into soft-link entries.
- Automatically adding an unknown label to the fixed catalog.
- Building a general grammar parser for unseen English functional-label text.
- Preserving the old `POS_TOKEN` or `POS_SPECIAL` mapping as a compatibility
  layer.
- Adding hashes to dynamic tag identifiers.
- Changing Yomitan itself.
- Broad redesign of structured content, pronunciation, media, or unrelated
  Level 1 presentation.

## Further Notes

- Every completed archive contains `index.json`, `styles.css`, term-bank
  files, and `tag_bank_1.json`. The tag bank contains the complete fixed
  catalog and only dynamic tags that the build encountered.
- The present read-only scan covered 260,934 Unabridged source rows. The old
  descendant selector reported 99 labels. One is the false `noun,` label
  borrowed by `homeothermic` from the nested `homeotherm` undefined run-on.
The corrected inventory contains 98 owned labels.
- The current database snapshot does not exercise the dynamic path after the
  fixed mapping is complete. A controlled fixture tests dynamic behavior.
- The dynamic path is a preservation and diagnostic mechanism for a changed
  source database, not a replacement for current inventory coverage.
- Yomitan splits `definitionTags` on ASCII spaces. Atomic identifiers are
  therefore required.
- Sense-local source wording remains visible in structured content even when
  the entry-wide functional label also becomes tag metadata.
- The test seams were accepted during design review: pure catalog and mapping
  behavior, canonical conversion ownership, archive output, real-database
  inventory, build reporting, and rendered Yomitan behavior.

## Resolution Verification

The 2026-08-13 verification is recorded in the child functional-label tickets.
It includes a headless Yomitan import and rendered tag check, the real
260,934-row inventory audit (98 mapped labels, zero unmapped labels and scan
errors), archive schema and deterministic-output checks, and focused tests.
The full test suite still has five unrelated failures because
`tests/rendered/fixtures/run.html` is absent. TypeScript diagnostics also
remain in unrelated scripts, fixtures, and existing tests.

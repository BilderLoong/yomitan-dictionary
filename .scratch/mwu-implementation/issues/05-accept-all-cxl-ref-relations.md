## Problem Statement

The Merriam-Webster Unabridged converter currently treats `.cxl-ref` as a spelling-variant-only source. A cross-reference-only mean creates a soft link only when its relation phrase matches one of eight approved variant phrases. Valid relations such as `plural of`, `past tense of`, `present participle of`, `comparative of`, and `taxonomic synonym of` become `cxl-ref-not-emitted` findings instead of searchable soft-link routes.

The source model is broader than the current implementation. In the Unabridged corpus, `.cxl-ref` carries 145 distinct source phrase texts across 17,402 source references. The Level 1 planner reaches 17,297 references after ownership decisions. Under the accepted validity rules, it can create 15,058 raw links across first and secondary targets, 15,017 distinct routes, and 14,822 resolved Yomitan records. The current cxl-ref and generic alternate families serialize 36,427 records. The accepted design will serialize 45,324 records, a net increase of 8,897.

The current planner also reads only the first `.cxt` target in a multi-target reference. It does not model connective-only continuation references such as `or of`. It names every cxl-ref soft link `cxl-ref-variant-reference-soft-link`, even when the source relation is not a spelling variant. Its broad alternate-collision rule can remove a generic `.va` relationship when the cxl-ref expresses a different semantic relationship, such as a plural or tense relation.

The structured-content converter has a related identity error. A leading `<sup>` inside a confirmed reference anchor is a target homograph number, not part of the target spelling or visible label. The converter currently renders this number inside the target label, for example `²booty`, while the searchable target is `booty`. It also names every visible `.cxl-ref` unit `variant-reference` and assigns its target the false relation `variant`, even when the exact source phrase is `plural of` or `taxonomic synonym of`.

The build report does not yet expose enough per-target evidence to audit multi-target outcomes, inherited continuation phrases, unsupported target hrefs, or target homograph identity.

## Solution

Treat `.cxl-ref` as a general relation-reference source, not a spelling-variant allowlist.

A cross-reference-only mean will create one `cxl-ref-soft-link` route for each valid `.cxt` target. Every non-empty complete relation phrase is accepted and preserved exactly as the dictionary-deinflection rule. Definition-bearing means will keep their canonical definitions and visible relation references; they will not gain soft-link ownership.

Connective-only continuation references (`or`, `and`, `or of`, `and of`) will inherit the nearest preceding complete relation phrase in the same mean. Multi-target references will process each target independently. A valid target will still emit when a sibling target is invalid. The planner will derive target spelling and target homograph identity from a required `bword://` href, never from visible anchor text.

Soft-link route identity will remain exact lookup spelling, canonical target spelling, and relation phrase. Different source phrases for the same lookup and target will remain different routes. A spelling/variant cxl-ref route will replace a generic same-route `.va` alternate and merge its evidence. An inflection or synonym route will coexist with the generic alternate because the relationships have different meanings.

Visible `.cxl-ref` content will become a `relation-reference` unit. The wrapper will own the exact source relation phrase. Its target will be a generic cross-reference target without the false `variant` relation. A leading homograph `<sup>` will be removed only from confirmed reference-anchor labels. Target homograph identity will remain explicit in build-report evidence only; it will not appear in the visible label, searchable target spelling, or unused final-dictionary metadata.

Create an architecture decision record for this policy because it reverses a deliberate conservative rule, changes thousands of records, and establishes lasting ownership, identity, collision, and evidence contracts.

## User Stories

1. As a dictionary user, I want `plural of` references to create searchable soft links, so that an inflected lookup reaches its canonical definition.
2. As a dictionary user, I want `past tense of` references to create searchable soft links, so that an irregular past form reaches its base verb.
3. As a dictionary user, I want `past participle of` references to create searchable soft links, so that a participle lookup reaches its canonical verb.
4. As a dictionary user, I want `present participle of` references to create searchable soft links, so that an `-ing` form reaches its canonical verb.
5. As a dictionary user, I want third-person singular references to create searchable soft links, so that a conjugated verb reaches its canonical form.
6. As a dictionary user, I want comparative references to create searchable soft links, so that a comparative form reaches its canonical adjective or adverb.
7. As a dictionary user, I want superlative references to create searchable soft links, so that a superlative form reaches its canonical adjective or adverb.
8. As a dictionary user, I want singular and plural relations to remain distinct, so that the dictionary does not replace source meaning with a generic alternative label.
9. As a dictionary user, I want taxonomic synonym references to create searchable soft links, so that an obsolete or equivalent taxon name reaches the canonical entry.
10. As a dictionary user, I want every valid Unabridged relation phrase to work, so that a new or rare phrase is not silently excluded by an allowlist.
11. As a dictionary user, I want the exact MWU relation wording preserved, so that capitalization, abbreviations, legacy wording, and source spelling remain faithful.
12. As a dictionary user, I want multiple valid relation phrases for one lookup and target to remain visible as distinct routes, so that no source relationship is lost.
13. As a dictionary user, I want a continuation such as `or of` to inherit `plural of`, so that the resulting rule is meaningful by itself.
14. As a dictionary user, I want every valid target in a multi-target reference, so that the converter does not discard secondary canonical routes.
15. As a dictionary user, I want one invalid target to leave valid sibling targets available, so that a partial source problem does not erase correct information.
16. As a dictionary user, I want a spelling-variant cxl-ref to replace a duplicate generic alternate, so that the same spelling relationship does not appear twice.
17. As a dictionary user, I want an inflection cxl-ref and a generic alternate to coexist, so that two different relationships are not collapsed.
18. As a dictionary user, I want source route order preserved, so that related forms appear in the order chosen by MWU.
19. As a dictionary user, I want `²booty` rendered as `booty` when it is a reference target, so that identity metadata does not look like part of the word.
20. As a dictionary user, I want chemical charges and other real superscripts preserved, so that the homograph fix does not damage unrelated definition content.
21. As a dictionary user, I want visible cxl-ref content named as a general relation reference, so that `plural of` is not mislabeled as a variant.
22. As a dictionary user, I want the visible relation wrapper to carry the exact source phrase, so that the relationship remains understandable.
23. As a dictionary user, I want the target label to be a generic cross-reference target, so that it does not invent a `variant` relationship.
24. As a dictionary builder, I want only cross-reference-only means to create cxl-ref soft links, so that definition-bearing means keep their canonical ownership.
25. As a dictionary builder, I want an empty relation phrase to produce a finding, so that no empty deinflection rule is serialized.
26. As a dictionary builder, I want an orphan continuation to produce a finding, so that the planner never guesses a missing relationship.
27. As a dictionary builder, I want a missing target href to produce a precise per-target finding, so that source loss is auditable.
28. As a dictionary builder, I want an unsupported target href scheme to produce a precise finding, so that visible text is not mistaken for identity.
29. As a dictionary builder, I want a self-link to produce a precise finding, so that useless routes do not enter the archive.
30. As a dictionary builder, I want an absent target row to produce a precise finding, so that unresolved source references stay visible.
31. As a dictionary builder, I want a target row that emits no canonical entry to produce `soft-link-target-not-emitted`, so that broken Yomitan records are not serialized.
32. As a dictionary builder, I want each finding to identify its reference and target positions, so that a multi-target failure is easy to locate.
33. As a dictionary builder, I want each finding to include raw relation text, parsed target, homograph identity, and source preview, so that the failure can be reproduced.
34. As a dictionary builder, I want target homograph identity retained in report evidence, so that dropping the visible number does not discard the source fact.
35. As a dictionary builder, I want valid secondary targets included as dependencies, so that each emitted soft link can resolve to a canonical record.
36. As a dictionary builder, I want exact duplicate routes deduplicated, so that repeated source evidence does not produce duplicate term-bank records.
37. As a dictionary builder, I want merged evidence kept at the first route position, so that deduplication remains deterministic.
38. As a dictionary builder, I want the all-phrase policy applied only to Unabridged rows, so that excluded Collegiate, Medical, and Thesaurus twins do not affect output.
39. As a maintainer, I want the relationship name `cxl-ref-soft-link`, so that code and reports do not claim every relation is a spelling variant.
40. As a maintainer, I want the visible information-unit name `relation-reference`, so that the structured-content vocabulary matches the source domain.
41. As a maintainer, I want no compatibility alias for the old relationship or unit names, so that there is one source of truth.
42. As a maintainer, I want spelling/variant collision classification to use semantic whole-word tokens, so that it does not recreate the old emission allowlist.
43. As a maintainer, I want collision classification to affect precedence only, so that every valid relation still emits.
44. As a maintainer, I want continuation detection limited to four exact normalized connective phrases, so that ordinary phrases containing `and` or `or` are not changed.
45. As a maintainer, I want raw source wording stored as the rule after continuation inheritance, so that normalization does not alter dictionary evidence.
46. As a maintainer, I want source paragraph order and target-anchor order preserved, so that repeated builds are deterministic.
47. As a maintainer, I want focused per-target planning outcomes, so that multi-target logic stays testable without parsing complete archives for every edge case.
48. As a maintainer, I want the selected-build integration seam to prove report, dependency, record, and archive behavior together, so that the end-to-end contract has one primary test boundary.
49. As a maintainer, I want focused structured-content tests for reference metadata and leading-sup removal, so that presentation semantics are tested at their natural boundary.
50. As a maintainer, I want real rendered Yomitan verification, so that a schema-valid `booty` label also looks correct in the popup.
51. As a maintainer, I want the domain glossary, current specs, survey catalog, and package documentation updated with the same terms, so that future work does not depend on obsolete variant-only rules.
52. As a maintainer, I want an ADR that records the source counts and trade-offs, so that a future reader understands why the conservative allowlist was removed.
53. As a maintainer, I want the research inventory to headline only Unabridged data, so that excluded product rows do not distort build decisions.
54. As a maintainer, I want the all-product inventory kept only as provenance, so that the mixed source bundle remains explained without defining product behavior.
55. As a release engineer, I want real-database counts compared with the accepted baseline, so that a changed source snapshot cannot silently alter the policy outcome.
56. As a release engineer, I want the complete package suite and formatter/type diagnostics clean, so that the expanded planner remains safe for release.

## Implementation Decisions

- Keep the existing Level 1 ownership boundary. Only a cross-reference-only mean can create cxl-ref soft-link relationships. A definition-bearing mean keeps canonical ownership and visible relation-reference content.
- Rename the soft-link relationship to `cxl-ref-soft-link`. Remove the old `cxl-ref-variant-reference-soft-link` name without an alias or compatibility path.
- Rename the visible structured-content information unit from `variant-reference` to `relation-reference`. Store the exact source relation phrase on the wrapper.
- Make the target inside a relation reference a generic cross-reference target. Do not attach the false relation `variant` to it.
- Remove the eight-phrase relation allowlist. Every non-empty complete relation phrase is semantically valid.
- Preserve the exact raw complete relation phrase as the Yomitan dictionary-deinflection rule. Do not normalize capitalization, abbreviations, legacy wording, or source spelling for serialization.
- Normalize text only for classification. Classification uses case-insensitive surrounding/repeated-whitespace normalization and complete words.
- Define a spelling/variant relation as a normalized phrase that contains the complete word `variant`, `variants`, `spelling`, or `spellings`. Use this classification only for alternate-collision precedence; never use it to filter emission.
- Define continuation phrases as exact normalized `or`, `and`, `or of`, or `and of`. A continuation inherits the nearest preceding complete relation phrase in the same mean. It preserves that predecessor’s exact raw phrase as the effective rule.
- If no preceding complete relation exists, record `orphan-continuation` and emit no route for that reference.
- Process every `.cxt` target anchor independently and in source order. A target failure does not remove valid siblings.
- Require each target anchor to have a `bword://` href. Reject missing hrefs and unsupported schemes as findings. Never derive target spelling or identity from visible anchor text.
- Parse a `bword://` target by decoding the spelling and removing an optional trailing numeric homograph suffix such as `[2]`. Keep the homograph number as explicit report evidence.
- Preserve target homograph identity only in build-report evidence. Do not include it in the visible target label, searchable target spelling, soft-link tuple, or unused final-dictionary metadata. Do not claim that a Yomitan soft link selects one target homograph.
- Remove only a leading homograph `<sup>` direct child from confirmed reference anchors. Confirmed anchors include the source-known cxl target and cross-reference classes. Do not remove superscripts from general definition text, chemical formulas, pronunciation content, or the middle of a reference label.
- Define soft-link route identity as exact lookup spelling, canonical target spelling, and exact effective relation phrase. Different phrases on the same lookup and target remain distinct.
- Deduplicate only exact routes. Merge evidence at the position of the first route and preserve source order.
- Preserve source paragraph order first, then target-anchor order within each paragraph.
- When a cxl-ref route and generic `.va` alternate share lookup and target, shadow the generic alternate only when the cxl relation is a spelling/variant relation. Merge alternate evidence into the cxl route.
- Preserve both routes when the cxl relation is an inflection, synonym, or any other non-spelling relation. The cxl raw rule and generic `alternative` rule express different relationships.
- Apply collision behavior consistently to generic `.va` alternate relationship kinds, while retaining current locality and ownership rules.
- Keep later canonical-target resolution. If a planned target row emits no canonical term, drop that route and record `soft-link-target-not-emitted`.
- Replace the broad cxl-ref finding reason with precise per-target outcomes. Include reference index, target index, raw source relation, effective relation when available, parsed target, target homograph number, source preview, and exact reason.
- Use these planning reasons: `empty-relation`, `orphan-continuation`, `missing-target-href`, `unsupported-target-href`, `self-link`, and `target-row-absent`.
- Retain the separate serialization finding `soft-link-target-not-emitted`.
- Keep dependency planning per valid target. Each emitted target row joins the dependency closure independently.
- Expected Unabridged baseline: 17,402 source `.cxl-ref` references; 17,297 planner-reached references after ownership decisions; 145 distinct source phrase texts; 15,058 raw valid cxl links after all target anchors; 15,017 distinct routes; 14,822 resolved cxl records.
- Expected multi-target baseline: 50 secondary anchors; 43 valid; 7 findings (6 absent target rows and 1 self-link). Six new secondary routes resolve after exact-route deduplication.
- Expected continuation baseline: 69 continuation references (`or of` 68, `or` 1); all inherit a complete predecessor in the current Unabridged source; 60 resolved routes remain after deduplication and target resolution.
- Expected collision baseline: 1,127 lookup-target pairs collide with generic alternates; 1,121 spelling/variant pairs shadow the alternate. Non-spelling collisions coexist.
- Expected record impact for cxl-ref plus generic `.va` alternate families: 36,427 current records to 45,324 new records, a net increase of 8,897. Main-to-alternative-spelling records are a policy-invariant family and are not included in this comparison.
- Update the research inventory to use Unabridged-only counts and examples as its headline. Keep the raw all-product 191-phrase/20,495-reference inventory only as provenance for the mixed database bundle.
- Add an ADR for the accepted policy. It records the cross-reference-only owner boundary, all-valid relation rule, validity guards, raw phrase preservation, continuation inheritance, multi-target independence, route identity, collision precedence, homograph handling, exact source counts, and rejected alternatives.
- Update the domain glossary, current Level 1 generation spec, current entry-conversion spec, survey catalog, package documentation, report vocabulary, and test names to remove obsolete variant-only language.
- Keep the already-committed Unabridged-only selected-root filter. This feature must not restore or bypass non-Unabridged roots or dependencies.

## Testing Decisions

- Use the existing selected-dictionary `runBuild` integration seam as the primary acceptance boundary. One representative request should exercise root selection, dependency closure, cxl planning, conditional alternate shadowing, report findings/evidence, Yomitan soft-link records, source order, and archive export.
- A good integration test asserts observable build behavior: report routes/findings, emitted records, rule chains, dependencies, ordering, and absence of broken routes. It must not assert private helper call order or local data structure layout.
- Extend the selected-build fixture with representative cross-reference-only means for `plural of`, a raw mixed-case variant phrase, an inherited continuation, multiple targets, a sibling target failure, a spelling/variant `.va` collision, a non-spelling `.va` collision, and a target row that emits no canonical record.
- Assert the renamed `cxl-ref-soft-link` relationship and absence of the old relationship name.
- Assert that every valid complete relation phrase emits without consulting a semantic allowlist.
- Assert that raw phrase spelling and capitalization appear unchanged in rule chains.
- Assert that exact continuation phrases inherit the nearest preceding complete raw relation.
- Assert that an orphan continuation emits no route and records `orphan-continuation`.
- Assert one independent outcome per target anchor. A valid target must emit when another anchor lacks a row or self-links.
- Assert source order: relation paragraph order first, then target order, with exact duplicates merged at the first route position.
- Assert exact route deduplication. Same lookup/target with different rules must remain separate.
- Assert conditional alternate collision behavior. Variant/spelling cxl routes shadow same-route generic alternates and merge evidence; inflection/synonym cxl routes coexist with the generic `alternative` chain.
- Assert late target resolution drops routes whose target never emits a canonical record and records `soft-link-target-not-emitted`.
- Use the existing Level 1 planning seam for dense source-shape cases that the archive seam cannot isolate cleanly: href parsing, continuation inheritance, per-target findings, route evidence, homograph evidence, exact route identity, and conditional collision precedence.
- Rename the focused planner tests to use `cxl-ref-soft-link` and general relation language. Replace the test that pins `plural of` as unapproved with a test that proves it emits.
- Cover each precise planning reason: `empty-relation`, `orphan-continuation`, `missing-target-href`, `unsupported-target-href`, `self-link`, and `target-row-absent`.
- Use the existing canonical-conversion structured-content seam for visible metadata. Test `relation-reference`, exact wrapper relation text, generic target metadata, and removal of the false `variant` relation.
- Add visible homograph regressions for `.cxt` and other confirmed reference-anchor classes. A leading `<sup>2</sup>` must not enter text output or produce a target superscript unit.
- Preserve regressions for legitimate superscripts in general definition prose, chemical formulas, pronunciation content, and non-leading positions.
- Test target-homograph evidence independently from display. Parsing `bword://booty[2]` yields target `booty`, report evidence `2`, and visible text `booty`.
- Extend pipeline report tests for reference index, target index, raw/effective relation, parsed target, target homograph number, source preview, and precise reason.
- Run a real-database audit against the accepted Unabridged baseline. The audit must report or compare 17,402 source references, 17,297 planner-reached references, 145 source phrase texts, 15,058 raw valid links, 15,017 distinct routes, 14,822 resolved cxl records, 69 continuations, and 50 secondary anchors with 43 valid and 7 invalid outcomes.
- Treat source-snapshot count changes as an investigation signal. Do not hard-code counts into ordinary per-build logic.
- Use existing pipeline integration tests, canonical conversion tests, Level 1 cxl tests, report tests, structured-content integration tests, and archive schema tests as prior art.
- Run the complete package test suite and formatter/type diagnostics after focused tests.
- Finish with the existing real Yomitan inspection harness. Confirm a cxl soft link such as `'avas → 'ava [plural of]`, a continuation route, a multi-target route, and a visible `booty`/`well` reference without its leading homograph number.

## Out of Scope

- Changing canonical ownership for definition-bearing means.
- Creating cxl-ref soft links from definition-bearing means.
- Adding non-Unabridged Collegiate, Medical, or Thesaurus roots or dependencies.
- Changing or reverting the selected-root Unabridged filter.
- Classifying raw `alt` table rows as semantic relationships.
- Copying canonical definitions into soft-link records.
- Normalizing, correcting, translating, or modernizing raw relation phrases.
- Building a grammar parser for relation phrases.
- Filtering cxl-ref emission by spelling/variant classification.
- Selecting a specific target homograph in Yomitan; the soft-link tuple targets spelling only.
- Modifying Yomitan to support homograph-specific soft-link destinations.
- Removing superscripts outside confirmed leading reference-homograph positions.
- Changing chemical formula, pronunciation, sense-reference, or headword homograph rendering.
- Changing popularity, sequence, tag-bank behavior, term tags, definition tags, pronunciation, media, or unrelated structured-content units.
- Keeping aliases or compatibility shims for `cxl-ref-variant-reference-soft-link` or `variant-reference`.
- Treating the raw all-product phrase inventory as build scope.

## Further Notes

- The raw database bundle contains Unabridged, Collegiate, Medical, and Thesaurus product rows. The all-product research count is 191 phrases across 20,495 references. It is provenance only; build decisions use the Unabridged subset.
- The selected-root Unabridged filter was committed separately before this spec. It excludes `collegiate_`, `medical_`, and `thesaurus_` roots and dependencies with an auditable finding.
- The information-preservation ADR requires unsupported or non-emittable source content to remain visible through output or findings. Per-target findings and explicit homograph evidence follow that principle.
- The level-ownership ADR requires information to remain with its nearest semantic owner. This spec keeps cxl soft-link ownership limited to cross-reference-only means and keeps definition-bearing references visible under their canonical means.
- The current exact allowlist accepts eight phrases. It is removed, not expanded.
- The current planner reads only the first `.cxt`. The accepted design processes all targets independently.
- The current collision rule shadows every generic alternate that shares lookup and target with a cxl route. The accepted rule shadows only semantically equivalent spelling/variant routes.
- The current visible unit and relationship names are variant-specific. Both receive clean cutovers to general relation terminology.
- The source inventory includes legacy forms and mistakes such as `present 3d singular of` and `past particple of`. They remain unchanged in rule output.
- The accepted test seams were reviewed during design: selected `runBuild` integration as the primary seam, focused Level 1 planning for source-shape rules, focused canonical conversion for visible metadata, real-database audit for corpus coverage, and real Yomitan inspection for rendered behavior.

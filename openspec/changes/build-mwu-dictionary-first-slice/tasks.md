## 1. Conversion Contracts and Fixtures

- [ ] 1.1 Add focused MWU HTML fixtures or fixture extractors for `what`, `turn`, `take`, and `run`, with assertions that each required source row is present.
- [ ] 1.2 Add failing type-level and unit tests for the immutable Level 1 entry, Level 2 verb group, Level 3–5 sense node, Level 6 attachment, rich-text, phrase, form, and source-finding contracts.
- [ ] 1.3 Implement the intermediate-model and result types with level-specific ordered-content unions and no I/O dependencies.

## 2. Source Traversal and Findings

- [ ] 2.1 Add failing tests that classify direct children as semantic content, recursive structural wrappers, intentionally ignored units, or unrecognized content without treating a known parent as complete coverage.
- [ ] 2.2 Implement immutable source traversal that preserves sibling order and nearest-owner paths, recursively dispatches known transparent containers, and treats unknown subtrees atomically so their text is not duplicated or reordered.
- [ ] 2.3 Implement recognized-and-ignored handling for pronunciation audio, first-known-use text, entry-status artwork, and discarded internal navigation targets.
- [ ] 2.4 Implement deterministic `SourceFinding` and neutral visible-text fallback generation for unrecognized text or media-like descendants, including tests for unknown children inside `.dt`.

## 3. MWU Semantic Parsing

- [ ] 3.1 Add failing hierarchy tests for separate `<mean>` entries, direct Level 3 senses, integer-ordered `.vd` groups, inherited markers, and nested Levels 3–5.
- [ ] 3.2 Implement lexical-entry, verb-group, sense-marker, sense-label, definition-label, and ordered definition parsing for the hierarchy tests.
- [ ] 3.3 Add failing entry-metadata tests for part of speech, visible rich headword display, all entry and form pronunciations, origin references, and ordered inflection groups with `.il`, `.ix`, and `.prt-a` children; verify that responsive `.breakpoint` boundaries are not interpreted as linguistic syllables.
- [ ] 3.4 Implement entry metadata, rich inline text, inflection groups, form-local qualifiers and readings, and origin parsing without populating a Yomitan reading value.
- [ ] 3.5 Add failing attachment tests for nested usage notes, examples, target highlighting, attribution dates, subordinate definitions after examples, comparisons, local cross-references, called-also text, and related or synonym content at their nearest owners.
- [ ] 3.6 Implement the Level 6 attachment and related-content parsers while preserving exact owner-local order.
- [ ] 3.7 Add failing phrase tests for retained parent `.dro` sections, independent `.drp` boundaries, phrase-local `.fl`, `.va` and `.vl`, example-only expressions, and positive and negative interposed-object evidence.
- [ ] 3.8 Implement defined-phrase parsing, phrase-local alternatives, parent-only `.uro` undefined run-ons, defined-derivative/related relation support, and conservative `v_phr` evidence derivation.

## 4. Yomitan Structured-Content Rendering

- [ ] 4.1 Add failing renderer tests for Levels 1–6, inline labels and emphasis, all visible pronunciations, discarded internal link targets, target highlights, and source-ordered subordinate definitions.
- [ ] 4.2 Implement pure rich-text and hierarchy renderers that leave the Yomitan reading field empty and keep labels inline during this change.
- [ ] 4.3 Add failing example-rendering tests that show the first three examples and collapse later examples while retaining attribution and highlighting.
- [ ] 4.4 Implement example, usage-note, reference, origin, related-content, and parent phrase-section rendering with neutral fallback styling for unrecognized content.

## 5. Searchable Record Assembly

- [ ] 5.1 Add failing assembly tests for one record per Level 1 lexical identity, independent defined phrases, phrase-local alternatives represented by dictionary-deinflection records, exact Unicode expression-and-identity deduplication, preservation of case/punctuation/diacritic distinctions, and exclusion of example-only, raw-alt-only, and undefined `.uro` expressions.
- [ ] 5.2 Implement pure term-record assembly from converted entries and phrases, storing structured content on canonical phrases and dictionary-deinflection tuples on phrase-local alternatives.
- [ ] 5.3 Add and satisfy tests that emit `v_phr` only for canonical phrases with validated interposed-object evidence and keep visual labels out of the lookup-rule field.

## 6. First-Slice Build and Export

- [ ] 6.1 Add failing integration tests for exact selection of `what`, `turn`, `take`, and `run`, including a diagnostic when a required word is absent or a row lacks lexical identity.
- [ ] 6.2 Implement the selected-word build orchestration with SQLite and filesystem effects confined to adapters around the pure conversion pipeline.
- [ ] 6.3 Implement one deterministic `build-report.json` containing build statistics, information-unit and ignored-unit counts, unrecognized findings, errors, complete `v_phr` evidence inventory, and phrase-alternative metadata audits; keep stable term-record ordering and export the ZIP through the existing dictionary-builder dependency.
- [ ] 6.4 Add archive tests that inspect the generated index and term-bank data against the repository's supported Yomitan schema and verify repeatable semantic output.

## 7. Acceptance and Documentation

- [ ] 7.1 Run the focused parser, renderer, assembler, findings, database, and archive test suites and resolve failures attributable to this change.
- [ ] 7.2 Generate the four-word dictionary and `build-report.json`; inspect every unrecognized finding, every `v_phr` candidate, and every phrase alternative with additional local metadata, recording whether each case needs a new typed information unit or representation.
- [ ] 7.3 Import the first-slice ZIP into Yomitan and compare `what`, `turn`, `take`, and `run` with GoldenDict for hierarchy, pronunciation, attachment order, phrase entries, alternatives, example collapsing, and interposed-object lookup behavior.
- [ ] 7.4 Update the project notes and MWU survey catalog with confirmed implementation behavior and any newly recognized source structures, without adding experimental implementation claims that were not verified.

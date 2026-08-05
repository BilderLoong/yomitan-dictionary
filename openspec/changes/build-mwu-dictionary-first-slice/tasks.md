## 1. First-Version Contract

- [x] 1.1 Create a compact coverage matrix for `main-canonical-entry`, `alternative-spelling-canonical-entry`, `drp-phrase-canonical-entry`, `main-to-alternative-spelling-soft-link`, `vr-mean-alternate-soft-link`, `phrase-alternate-soft-link`, `bare-affix-soft-link`, and dedicated dependency rows. Map each behavior to positive cases, negative cases, evidence assertions, deduplication assertions, and representative real MWU rows.
- [x] 1.2 Record the hand-authored design fixture as provisional reference evidence only. Remove it as a production snapshot, visual authority, required record count, or acceptance gate.
- [x] 1.3 Record the first-version boundary: explicit selected words, Level 1 ownership and links, conservative readable definitions, deterministic reporting, and an importable ZIP; defer the polished Level 1-6 renderer.

## 2. CLI and Source Selection

- [x] 2.1 Add failing CLI parsing tests for `--words <word...>`, quoted multiword arguments, `--words-file <path>`, combined selection, blank file lines, boundary trimming, exact Unicode deduplication, and first-seen ordering.
- [x] 2.2 Add failing CLI error tests for no selected words, an empty words file, unreadable files, unknown options, removed `--limit`/`--additional-words-list-file` options, and confirmation that stdin is not an input source.
- [x] 2.3 Implement the immutable CLI selection model and edge adapter. Remove the old selection flags and any implicit full-database fallback.
- [x] 2.4 Add failing source-index tests for deterministic row IDs, decoded keys such as `o%27`, exact target resolution, repeated decoded spellings, and unfamiliar encoding diagnostics without parsing every `word.m` payload.
- [x] 2.5 Implement the lightweight source-row index and on-demand HTML loading adapter.

## 3. Level 1 Planning Tests and Implementation

- [x] 3.1 Add focused failing canonical-entry tests for `main-canonical-entry`, separate same-spelling means, `alternative-spelling-canonical-entry` embedded ownership, dedicated-row deferral, rich display versus searchable identity, and missing lexical identity.
- [x] 3.2 Implement pure canonical-entry planning with one inspectable decision per independent `<mean>`.
- [x] 3.3 Add focused failing canonical-defined-phrase tests for independent `.drp` ownership, parent relationship retention, adjacent phrase boundaries, and example-only and undefined-run-on negatives.
- [x] 3.4 Implement pure canonical phrase planning without merging adjacent phrases or promoting non-definition expressions.
- [x] 3.5 Add focused failing `main-to-alternative-spelling-soft-link` tests for embedded and dedicated routes, empty rule chains, exact route deduplication, retained repeated evidence, target availability, and no copied definitions.
- [x] 3.6 Implement pure `main-to-alternative-spelling-soft-link` planning.
- [x] 3.7 Add focused failing `vr-mean-alternate-soft-link` tests for the correct local canonical target, qualifier and metadata retention, confirmed rule chains, exact Unicode identity, and rejection when local content establishes a distinct meaning.
- [x] 3.8 Implement pure VR mean alternate planning and explicit distinct-meaning diagnostics.
- [x] 3.9 Add focused failing `phrase-alternate-soft-link` tests for the correct phrase owner, `alternative` rule, qualifier retention, adjacent phrase isolation, exact deduplication, and no copied definitions.
- [x] 3.10 Implement pure phrase alternate planning.
- [x] 3.11 Add focused failing `bare-affix-soft-link` tests for confirmed prefix, suffix, infix, and marked-alternate identities; ordinary-hyphen and arbitrary-substring negatives; exact route reuse; rule-chain behavior; and retention of every evidence occurrence.
- [x] 3.12 Implement pure source-assisted `bare-affix-soft-link` derivation without a hardcoded word list.
- [x] 3.13 Add focused failing dependency tests for Case 3 targets, transitive closure, repeated dependencies, cycles, deterministic row-ID deduplication, missing owners, roots-versus-dependencies reporting, and the invariant that no serialized link dangles.
- [x] 3.14 Implement deterministic canonical dependency closure and fatal missing-owner diagnostics.

## 4. Conservative Canonical Conversion

- [x] 4.1 Add failing conversion tests proving that a `main-canonical-entry` or `alternative-spelling-canonical-entry` plan reads only its owning `<mean>` and a `drp-phrase-canonical-entry` plan reads only its owning definition-bearing phrase subtree.
- [x] 4.2 Add failing readable-content tests for source-order text, basic block boundaries, useful visible link text without GoldenDict targets, empty Yomitan readings, and fatal empty definitions.
- [x] 4.3 Add failing fallback tests proving that unsupported visible subtrees render once as neutral content, produce one ordered finding, and do not duplicate recognizable descendants.
- [x] 4.4 Implement immutable first-version conversion results and conservative supported Yomitan structured-content rendering without the final Level 1-6 presentation model.

## 5. Record Assembly and Reporting

- [x] 5.1 Add failing assembly tests for distinct canonical entry records, `drp-phrase-canonical-entry` records, every soft-link-entry family, empty readings, no copied definitions, direct-canonical priority, and stable record ordering.
- [x] 5.2 Implement pure Yomitan canonical and dictionary-deinflection record assembly.
- [x] 5.3 Add failing report tests for effective CLI roots, loaded rows, dependencies and reasons, every ownership decision, all serialized or reused soft-link evidence, alternative-local metadata, rejected owners, conversion findings, fatal errors, totals, and archive path.
- [x] 5.4 Implement one deterministic `build-report.json` model and serializer shared by successful and failed attempts.
- [x] 5.5 Add the real-source archive assertion that same-spelling canonical records reuse one Yomitan sequence and document the sequence contract.

## 6. End-to-End Selected Builds

- [x] 6.1 Add integration tests using isolated SQLite/file fixtures for flag-only, file-only, and combined selection; quoted phrases; exact deduplication; stable ordering; no input; unreadable files; missing roots; and missing dependencies.
- [x] 6.2 Replace the old build entry point with the new CLI and connect SQLite reads, pure planning, conversion, assembly, reporting, schema validation, and ZIP export.
- [x] 6.3 Build representative selected roots covering all seven Level 1 families, including researched rows from `what`, `take`, `in`, and `o`, plus discovered dedicated dependencies.
- [x] 6.4 Build the representative selection twice and assert equal semantic term-bank content and equal build-report content and ordering.
- [x] 6.5 Add archive tests for the repository-supported Yomitan index and term-bank schemas and assert that every soft-link target has a canonical record.
- [x] 6.6 Import the representative ZIP with the browser harness and verify completed progress, no import error, increased dictionary count, and smoke searches for canonical, alternate, phrase, and bare-affix routes.

## 7. Replacement and Handoff

- [x] 7.1 Run the focused CLI, source-index, seven-family planner, converter, assembler, report, integration, schema, and browser-import gates and resolve failures attributable to this change.
- [x] 7.2 Remove obsolete builder, parser, types, tests, and CLI options directly superseded by the verified first-version path. Do not retain a compatibility adapter or fallback builder.
- [x] 7.3 Update the package README, project notes, status checkpoint, and living survey with confirmed first-version behavior, observed findings, and the explicit boundary that polished Level 1-6 presentation remains future work.

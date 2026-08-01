## Context

The Merriam-Webster Unabridged package already reads `word(id, w, m)` rows from SQLite and exports Yomitan dictionaries through `yomichan-dict-builder`. Its current parser flattens portions of MWU HTML before the source hierarchy, local ownership, and relative ordering are fully represented. The living survey in `docs/mwu-html-survey/README.md` now defines the recognized information units, their MWU Levels 1–6, intentionally ignored units, and representative evidence from `what`, `turn`, `take`, `run`, and twelve additional words.

The first implementation must teach and validate the whole conversion path on a small real dictionary. It must preserve source information as much as possible, avoid silently treating a known container as proof that every descendant is understood, and stay small enough to extend as later reconnaissance discovers new source structures.

## Goals / Non-Goals

**Goals:**

- Build an importable Yomitan dictionary from the exact source rows for `what`, `turn`, `take`, and `run`.
- Represent every currently cataloged, non-ignored information unit at its nearest MWU owner without losing source order.
- Separate source parsing, the MWU semantic model, Yomitan rendering, record assembly, and I/O so the core transformations are pure and independently testable.
- Retain defined `.dro` phrases in their parent entries while also making each phrase and its defined phrase-local alternatives searchable.
- Report and visibly preserve unrecognized source content rather than silently dropping it.
- Use the first-slice archive and report to drive later incremental coverage.

**Non-Goals:**

- Converting the entire MWU database in this change.
- Generating a complete Yomitan tag bank or deciding every label's eventual tag-bank eligibility.
- Extracting pronunciation audio, first-known-use information, or entry-status artwork.
- Supporting definition images or other media before their source structures and asset requirements have been surveyed.
- Treating example-only text as dictionary entries or inventing wildcard headwords for separable phrasal verbs.
- Preserving GoldenDict-only internal navigation targets such as `gdlookup://` and `bword://`.

## Decisions

### Use a narrow functional conversion pipeline

The build is divided into five boundaries:

1. A source adapter reads explicitly selected SQLite rows.
2. A pure HTML parser converts one row into an MWU intermediate result.
3. A pure renderer converts the semantic model into Yomitan structured content.
4. A pure assembler creates canonical, phrase, and alternative searchable term records.
5. An I/O edge writes the findings report and dictionary ZIP.

The parser result contains converted entries plus source findings. Expected source variation is represented as data rather than exceptions. Missing required lexical identity produces a rejected-row result; unrecognized optional content produces a finding and fallback content but does not reject the row. Database and filesystem failures remain at the I/O edge.

This pipeline is preferred over extending the existing flattened parser because each boundary can be inspected and tested without importing a dictionary. It is preferred over a standalone survey framework because the immediate goal is a real vertical slice, while findings provide the minimum safety mechanism needed for incremental reconnaissance.

### Use a hybrid Level 1–6 intermediate model

Level 1 is an explicit lexical entry, Level 2 is an integer-ordered verb group, Levels 3–5 use a recursive sense node with an explicit level and marker, and Level 6 uses typed definition attachments. Entry, group, and sense bodies are ordered arrays rather than separate definition/example/note arrays.

Conceptually, the model has these shapes:

```ts
interface ParseResult {
  readonly entries: readonly LexicalEntry[];
  readonly findings: readonly SourceFinding[];
}

interface LexicalEntry {
  readonly term: string;
  readonly header: EntryHeader;
  readonly body: readonly EntryContent[];
  readonly lookupRules: readonly LookupRule[];
}

interface VerbGroup {
  readonly order: number;
  readonly subtype: RichText;
  readonly body: readonly GroupContent[];
}

interface SenseNode {
  readonly level: 3 | 4 | 5;
  readonly marker: RichText | null;
  readonly body: readonly SenseContent[];
}
```

Typed content variants cover entry identity and visible headword display; pronunciations; ordered inflection groups, labels, markers, and form pronunciations; origin; sense and definition labels; definitions; subordinate definitions; recursive usage notes; examples and attributions; comparisons and cross-references; phrases, variants, and qualifiers; undefined run-ons and defined derivatives; related items; called-also text; synonym discussions and pointers; and unrecognized fallback content.

Reusable leaf types such as pronunciation, inflection group, variant relation, and reference are admitted by the content union for each level where the survey has observed them. This preserves nearest-owner binding without creating a universal untyped property bag. Explicit ignored-unit variants recognize pronunciation audio, first-known-use text, and entry-status artwork without rendering them or reporting them as unknown.

Every semantic information unit also records or inherits its source owner and Level 1–6 position. Headword display and derivatives therefore use ordinary typed content variants and render at the level where MWU places them. Visible syllable dots are retained, but responsive `.breakpoint` span boundaries are not interpreted as linguistic syllables. The same rule applies when a later build encounters a new unit: first determine its nearest semantic owner and source level, then add a named typed variant and render it in MWU source order. Until its meaning or boundary is understood, preserve it atomically as unrecognized content at that owner instead of guessing a different level.

A completely generic DOM-shaped AST was rejected because it would not communicate the dictionary hierarchy. Six unrelated level types were rejected because they would duplicate content definitions and make units that legitimately bind at multiple levels difficult to represent.

### Preserve source order with owner-local content arrays

Every semantic owner receives one ordered body. A traversal classifies each direct child as semantic content, a structural/presentation wrapper to recurse through, an intentionally ignored unit, or unrecognized content. Recognized nested containers repeat the same direct-child process, so recognizing `.dt`, `.un`, or `.related-to` never automatically marks their descendants as understood.

A known transparent wrapper is traversed recursively. An unknown element is instead treated as one atomic subtree: its visible content is rendered once as fallback and the subtree is reported once, without separately parsing descendants. This conservative rule can temporarily lose rich structure inside that subtree, but it prevents duplicate or reordered text and makes the missing semantic parser visible in the report.

This representation preserves cases where an example precedes `.sdsense`. The renderer therefore emits the example first and then the subordinate definition as a normal continuation, retaining its styled qualifier such as `specifically`. Nested `.un` structures and examples inside usage notes retain the same ordering and ownership.

### Represent presentation with rich inline content

`RichText` contains ordered text and inline annotations instead of pre-rendered HTML. It preserves emphasis, MWU-style qualifier treatment, and target-highlight spans such as `.mw_t_wi`. Cross-references retain visible wording and relation type but discard internal source URLs.

All MWU pronunciation readings, including form-local readings and their qualifiers, are rendered visibly in structured content. The Yomitan reading field remains empty. Labels remain inline structured content during this change; no tag bank is generated. Examples display the first three items and place additional examples in a collapsed `details` section while retaining target highlighting and attribution.

### Extract defined phrases from their `.dro` ownership

Each `.drp` and its following owned definition tree form one `DefinedPhrase`. The parent lexical entry renders the phrase section from that object, and record assembly derives an independently searchable lexical entry from the same object. GoldenDict-only `See: 1 take` navigation is not emitted as the extracted definition.

A phrase-local `.va` becomes a searchable expression record retaining its `.vl` qualifier. For example, `take the word` stores the structured definition, while `take up the word` stores Yomitan's dictionary-deinflection tuple pointing to `take the word`. Both expressions are searchable without duplicating the definition. Adjacent `.drp` phrases are never merged. A phrase-local `.fl` belongs to the phrase, as in `by the run` labeled adverb. Example-only expressions remain examples, and inflected forms remain form metadata unless separately defined by MWU.

An undefined `.uro` run-on remains rendered under its Level 1 parent. For example, `abandoner` under `abandon` can retain its pronunciation, noun label, plural form, and examples, but it does not receive an independent record or soft link because MWU supplies no definition for it. A derivative with its own source-owned definition remains eligible for an independent entry.

Paired target-highlight spans with intervening object text create interposed-object evidence. That evidence assigns `v_phr` to the canonical phrase such as `give up` or `take apart`; the builder never emits `give XXX up` as a term.

### Emit an actionable build report

An unclassified element with nonblank visible text or media-like content becomes an `UnrecognizedContent` item under its nearest owner and a `SourceFinding` containing the source word, owner path and level, element name, classes, a text preview, and source position. The fallback renders visible text with neutral formatting so the first-slice dictionary does not silently lose it.

Known structural and presentation wrappers are recursively inspected but do not themselves produce findings. Explicitly ignored units are counted as recognized-and-ignored and do not pollute the unknown findings. Findings become one section of a deterministic build report rather than a separate survey tool.

The single `build-report.json` contains overall row and entry counts, counts by recognized information-unit name, ignored-unit counts, unrecognized findings, rejected rows, every emitted `v_phr` candidate, and every phrase-local alternative. Each `v_phr` item includes the canonical term, source word, owner path, evidence example, highlighted components, intervening text, and whether the rule was emitted. Each phrase-alternative item records any local pronunciation, part of speech, usage restriction, inflection, definition, or unrecognized content that could disprove the initial shared-definition model. The first-slice acceptance step reviews every `v_phr` item and every phrase alternative with extra local metadata.

### Assemble a deterministic selected-word dictionary

The first-slice command uses exact source-word selection for `what`, `turn`, `take`, and `run`. It emits one canonical record for each Level 1 lexical identity and one searchable record for each independently defined phrase or phrase-local alternative. Deduplication uses the exact Unicode expression plus source lexical identity; it does not case-fold, remove punctuation, remove diacritics, or otherwise normalize distinct source expressions. Definitions remain shared transformation data until final record serialization rather than being independently reparsed.

Record order, structured content, and findings order are deterministic. The generated archive uses the existing builder and current Yomitan term-bank schema. Automated tests validate the archive structure; final acceptance also includes importing the tiny archive into the local Yomitan installation and comparing representative entries with GoldenDict.

## Risks / Trade-offs

- [The four selected words do not cover every MWU structure] → Report unknown descendants and expand semantic variants only when new evidence appears.
- [Fallback text can be less attractive than a recognized rendering] → Mark it neutrally, include an actionable finding, and avoid guessing semantics.
- [A recursive ordered-content model can accept content at the wrong owner] → Use level-specific unions and parser tests for nearest-owner binding rather than one universal content union.
- [A phrase alternative may contain local metadata not represented by the shared definition] → Use a dictionary-deinflection record for the alternative, report all alternative-local metadata, and stop for a new representation when the report finds a semantic difference.
- [Interposed-object inference can produce false positives] → Require paired target-highlight spans with retained intervening text, include every emitted candidate and its evidence in the build report, and manually inspect the candidate inventory before accepting the build.
- [Manual import verification is not fully automated] → Keep schema and snapshot tests as the repeatable gate and document the exact manual first-slice checks.

## Migration Plan

1. Add the intermediate model and fixture-based parser without routing the full database through it.
2. Add structured-content rendering and record assembly for selected rows.
3. Add deterministic findings and archive integration tests.
4. Route only the first-slice build command through the new pipeline and verify `what`, `turn`, `take`, and `run` in Yomitan.
5. Retain the existing broad build path until the new vertical slice is accepted; generated archives are disposable, so rollback consists of using the prior command path.

## Open Questions

There are no blocking source-structure decisions for the first slice. Tag-bank eligibility, additional derivative shapes, definition media, and full-database performance remain explicitly deferred and will be reconsidered using later findings.

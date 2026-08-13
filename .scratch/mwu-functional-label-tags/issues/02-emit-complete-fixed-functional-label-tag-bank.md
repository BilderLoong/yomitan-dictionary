# 02 — Emit the complete fixed functional-label tag bank

**What to build:** Convert all current owned MWU functional labels into clear,
atomic definition tags with complete dictionary-owned metadata in every
Yomitan archive.

**Blocked by:** 01 — Enforce owner-local functional-label scope.

**Status:** resolved 2026-08-13

- [x] One `functionalLabels` feature module owns the fixed catalog, exact
      raw-label mapping, immutable resolved tag lists, deduplication, semantic
      ordering, descriptions, and coverage validation.
- [x] The old token and special-case mappings are removed; no compatibility
      resolver or general English label parser remains.
- [x] All 98 current normalized owned `.fl` labels have explicit mappings to
      fixed atomic tags.
- [x] Resolved tags stay as immutable arrays until the term-bank assembly
      boundary joins them with ASCII spaces.
- [x] Combined labels never create accidental tokens such as `or`.
- [x] Detailed verb, article, number, agreement, word-element, result-class,
      geographical-name, and mark distinctions follow the parent
      specification.
- [x] Each fixed tag has category `partOfSpeech`, a deterministic semantic
      order, a clear plain-English note, and score zero.
- [x] Fixed descriptions put the easy meaning first and include verified MWU
      wording or examples only when useful.
- [x] Every successful archive contains the complete fixed catalog in a
      schema-valid tag bank, even when a selected build does not use every
      fixed tag.
- [x] Every serialized `definitionTags` token has matching tag-bank metadata.
- [x] Fixed tags are deduplicated and ordered deterministically before
      serialization.
- [x] `termTags`, sense-local structured-content labels, rules, and lookup
      popularity remain unchanged.

# 04 — Preserve unknown functional labels as dynamic tags

**What to build:** Preserve a future or unexpected owned MWU functional label
as visible diagnostic metadata without making a normal dictionary build fail.

**Blocked by:** 02 — Emit the complete fixed functional-label tag bank.

**Status:** resolved 2026-08-13

- [x] An unknown normalized `.fl` label resolves to one visible dynamic tag
      with a leading question mark rather than raw space-separated tokens.
- [x] The dynamic identifier is readable and reversible: spaces become
      underscores, literal underscores and reserved punctuation are
      percent-encoded, case remains significant, and no hash is added.
- [x] Distinct normalized source labels cannot produce the same dynamic
      identifier.
- [x] Repeated occurrences of the same unknown label reuse one dynamic tag.
- [x] Each encountered dynamic tag has category `unmappedPartOfSpeech`, order
      9000, score zero, and a clear generated note containing the exact source
      label.
- [x] Each occurrence produces an `unmapped-functional-label` conversion
      finding with row, term, raw label, normalized label, and generated tag.
- [x] Selected builds retain the per-entry finding and an aggregate summary.
- [x] A normal build succeeds when it encounters an unknown label and adds
      only the dynamic tag records encountered by that build.
- [x] Dynamic tags sort after fixed tags and render with a dictionary-scoped
      amber dashed treatment that does not change fixed-tag presentation.
- [x] A controlled fixture proves spaces, literal underscores, percent signs,
      punctuation, case, collision prevention, reuse, finding data, archive
      metadata, and presentation category.

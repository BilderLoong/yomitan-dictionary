# 06 — Make cxl outcomes auditable

**What to build:** Give the dictionary builder one precise build-report outcome for each cxl target. The report must identify the source position, relationship, parsed target, target homograph identity, preview, and exact reason when a route cannot emit.

**Blocked by:** 03 — Process every cxl target independently; 04 — Inherit continuation relation phrases.

**Status:** ready-for-agent

- [ ] Each target outcome identifies its reference index and target index within the owning mean.
- [ ] Evidence contains the raw source relation and the effective inherited relation when they differ.
- [ ] Evidence contains the parsed target spelling, optional target homograph number, and a useful source preview.
- [ ] Target homograph identity comes from the `bword://` href and remains report evidence only; it does not enter searchable spelling or final unused metadata.
- [ ] Planning failures use the precise reasons `empty-relation`, `orphan-continuation`, `missing-target-href`, `unsupported-target-href`, `self-link`, and `target-row-absent`.
- [ ] An unsupported or missing href never falls back to visible anchor text.
- [ ] A failed target produces its own finding and does not remove valid sibling targets.
- [ ] Late canonical-target resolution retains the separate `soft-link-target-not-emitted` finding.
- [ ] The old broad unapproved-relation outcome is removed because complete relation phrases no longer use an allowlist.
- [ ] Report and selected-build tests prove exact fields and reasons for single-target, multi-target, continuation, and late-resolution examples.

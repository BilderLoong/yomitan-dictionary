# 02 — Tag-generation rules

**What to build:** A decided rule set for how source labels become Yomitan
tags — including whether/which `.sl` labels convert to tags — consistent with
the shared vocabulary: local labels stay visible structured content, global
tags live in the tag bank.

**Blocked by:** None — can start immediately

**Status:** resolved — 2026-08-07 on `worktree-1`; decision recorded in
`docs/adr/0005-tag-generation-rules.md`, mechanics verified against the
bundled Yomitan fixture source (v25.x), survey README updated.

- [x] Yomitan tag mechanics understood and documented (tag bank, how the
      term-bank tag field references it)
- [x] Boundary decided: which source labels become global tags vs stay local
      labels in structured content, consistent with CONTEXT.md's "Local
      label" definition
- [x] Tag-generation rules written and implemented, or explicitly deferred
      with the decision recorded
- [x] Hard-to-reverse choice recorded as an ADR

## Implementation notes (2026-08-07)

- Mechanics verified from the bundled fixture
  (`tests/fixture/yomitan-src`): tag bank entries are
  `[name, category, sortOrder, notes, score]`; the term-bank fields are
  definitionTags (space-separated string), rules (space-separated rule ids
  — Yomitan derives inflection conditions from THIS field via
  `getConditionFlagsFromPartsOfSpeech`), and termTags. English conditions:
  `v`, `v_phr`, `n`, `np`, `ns`, `adj`, `adv`.
- Boundary decided: definition tags = `.fl` POS whitelist
  (`POS_TOKEN`/`POS_SPECIAL` in the renderer); term tags empty; no tag bank
  emitted; all `.sl`/`.il`/`.vl`/`.sgram`/`.lb` labels stay inline
  structured content; tag-bank promotion deferred until the label inventory
  exists.
- Implemented: `v_phr` in the rules field for `.drp` phrases with
  interposed-object evidence (paired `.mw_t_wi` highlights), reported as an
  `interposed-object-v-phr` conversion finding.
- ADR: `docs/adr/0005-tag-generation-rules.md`.


## Reference sources

Migrated from PROJECT_NOTES.md (2026-08-06); verify currency before relying
on them:

- [Yomitan dictionary format](https://github.com/yomidevs/yomitan/blob/master/docs/making-yomitan-dictionaries.md)
- [Yomitan term-bank schema](https://github.com/yomidevs/yomitan/blob/master/ext/data/schemas/dictionary-term-bank-v3-schema.json)
- [Yomitan English transforms](https://github.com/yomidevs/yomitan/blob/master/ext/js/language/en/english-transforms.js)
- [Yomitan translator](https://github.com/yomidevs/yomitan/blob/master/ext/js/language/translator.js)
- [WTY project](https://github.com/yomidevs/wiktionary-to-yomitan)
- [WTY tag documentation](https://yomidevs.github.io/wiktionary-to-yomitan/tags/)

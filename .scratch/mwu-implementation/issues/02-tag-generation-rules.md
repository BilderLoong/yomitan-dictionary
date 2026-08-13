# 02 — Tag-generation rules

**What to build:** A decided rule set for how source labels become Yomitan
tags — including whether/which `.sl` labels convert to tags — consistent with
the shared vocabulary: local labels stay visible structured content, global
tags live in the tag bank.

**Blocked by:** None — can start immediately

**Status:** resolved — 2026-08-11 on `worktree-2`; decision recorded in
`docs/adr/0005-tag-generation-rules.md`, mechanics verified against the
bundled Yomitan fixture source, functional-label inventory audited, and
selected/full archive output verified.

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
- Boundary decided: definition tags come from the current owner's `.fl`
  functional label through the explicit fixed mapping in
  `src/conversion/functionalLabels.ts`; term tags stay empty; every archive
  emits the complete fixed tag bank; unknown owned `.fl` values remain visible
  as dynamic `?` tags with findings; all `.sl`/`.il`/`.vl`/`.sgram`/`.lb`
  labels stay inline structured content.
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

## How to find these examples

### Source evidence (DB)

DB: `packages/merriam_webster_unabridged/assets/MWU.db`, table `word(id, w, m)`. Word `take` (id 362180), needle `take-apart-anchor`, then the first paired-highlight example (needle `take</span> a town`):

```html
<span class="mw_t_sp"><span class="mw_t_wi">take</span> a town <span class="mw_t_wi">apart</span></span>
```

7 such examples in the `take apart` scope prove verb+particle with object between → the phrase gets `rules: "v_phr"`. Negative case: `give` (id 194504) — `you up` appears in 0 rows; the similar-looking example uses `em.mw_t_it` (emphasis), which is correctly ignored.

### Reproduce the build output

From `packages/merriam_webster_unabridged`:

```
bun run src/index.ts --words take
jq -c '.conversions[] | select(.rules=="v_phr")' build/build-report.json
```

Expected samples (verbatim from the 2026-08-07 build):

```json
{"term":"what for","rules":"v_phr","findings":["interposed-object-v-phr"]}
{"term":"turn one's back on","rules":"v_phr","findings":["interposed-object-v-phr"]}
{"term":"turn one's hand","rules":"v_phr","findings":["interposed-object-v-phr"]}
{"term":"turn tail","rules":"v_phr","findings":["interposed-object-v-phr"]}
```

In the ZIP, the rule lands in term-bank field 3 (the field Yomitan's `getConditionFlagsFromPartsOfSpeech` derives inflection conditions from):

```
unzip -p "build/Merriam Webster Unabridged.zip" term_bank_1.json | jq -c '.[] | select(.[0]=="take apart")'
# → ["take apart",...,"v_phr",...]
```

Code pointers: `src/conversion/convertCanonical.ts` (`interposedObjectExampleCount` — exactly two `.mw_t_wi` spans with retained text between, inside `.ex-sent`); `src/conversion/types.ts` (`ConvertedCanonical.rules: string | null`, finding kind `interposed-object-v-phr`); `src/pipeline/assembleRecords.ts` (writes field 3); decision: `docs/adr/0005-tag-generation-rules.md`.

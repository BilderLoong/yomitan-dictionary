# 04 — Unify phrase flow and disclosure hierarchy

**What to build:** Dictionary readers see continuous phrase meanings as one
flow and can distinguish phrase, origin or synonym, and extra-example
disclosures by importance. Secondary sections remain available without
obscuring the main definition tree.

**Blocked by:** 03 — Improve the definition reading path

**Status:** completed

- [x] In the `give` entry, `give thanks` and `specifically : to say grace`
      appear in one continuous definition flow when their source ownership
      shows one thought
- [x] The example owned by that `give thanks` meaning starts in the normal
      example block below the continuous definition flow
- [x] Phrase, origin, synonym-discussion, and extra-example disclosures all
      start closed in a fresh rendered entry
- [x] Phrase summaries form the strongest disclosure level, origin and
      synonym summaries form the secondary level, and extra-example summaries
      form the quietest level
- [x] Every disclosure uses its native marker, shows visible keyboard focus,
      and can be opened and closed with the keyboard
- [x] Fresh real-source checks use `give` for phrase flow, `what` for phrase
      and origin sections, and `turn` for synonym discussion in both the
      search page and narrow popup
- [x] Visual checks for `sum` and `down` cover only the agreed presentation;
      they do not change ranking, alternative-entry, or deinflection behavior
- [x] Light-theme and dark-theme checks preserve readable contrast, host
      typography, and the three disclosure levels without horizontal
      scrolling
- [x] Supporting rendered-content checks preserve exact disclosure text,
      collapsed defaults, semantic structure, source order, and the phrase
      definition-flow contract
- [x] Archive schema, deterministic output, lookup records, soft links,
      rules, and ranking behavior remain unchanged

## Verification

- `give` preserves the `give thanks` continuous definition flow and places its
  example below the flow. `what` and `turn` show closed phrase/origin/synonym
  disclosures with the native disclosure marker.
- The real-popup harness opens the actual Yomitan popup mode and confirms
  collapsed disclosures in both light and dark themes.
- Live hierarchy check: phrase summaries use the strongest text treatment,
  origin and synonym summaries use the secondary treatment, and extra-example
  summaries use smaller, quieter text. `Enter` opens an extra-example group.
- The live popup gate checks every origin, phrase-group, and related-item
  summary for zero logical start indentation or border, and checks every
  origin body against its own summary alignment.
- Desktop search and narrow-popup layouts keep the compact disclosure row.
  Mobile and touch adaptation are outside this work.
- The 32-state headless sweep covered all eight acceptance words in both
  themes on the 1100px search page and 360px popup, with zero disclosure or
  overflow failures.
- `uiContract.test.ts`, `what.test.ts`, and render smoke tests passed as part
  of the 194-test suite.

# 02 — Clarify the structured entry header

**What to build:** Dictionary readers see pronunciation readings,
pronunciation notes, and inflection groups as three clear header rows before
the definition tree. Dense entries stay complete and readable in both the
search page and narrow popup.

**Blocked by:** 01 — Make local tags match the host UI

**Status:** completed

- [x] Pronunciation readings form the first and strongest row of the MWU
      structured entry header without adding a generated `Pronunciation`
      label to recognizable pronunciation syntax
- [x] Pronunciation notes form a quieter second row and remain visible source
      content rather than using the Yomitan reading field
- [x] Every inflection group forms the third row, stays visible, and wraps
      naturally without a `More forms` control
- [x] Inflection labels such as `or`, `also`, and `or dialectal` remain
      subdued inline text while inflected forms remain easy to scan
- [x] Compact spacing and a subtle bottom boundary separate the structured
      entry header from definitions without adding a heavy card or saturated
      background
- [x] Fresh real-source checks for `in` and `put` show the same three-row
      hierarchy in the search page and narrow popup
- [x] The full `put` inflection group remains visible in the narrow popup and
      creates no horizontal scrolling
- [x] Light-theme and dark-theme checks preserve the same information
      hierarchy, readable contrast, and host typography
- [x] Supporting rendered-content checks preserve pronunciation,
      pronunciation-note, and inflection source order and ownership
- [x] Archive schema, deterministic output, lookup records, soft links,
      rules, and ranking behavior remain unchanged

## Verification

- Real-source `in` and `put` entries show pronunciation first, optional notes
  second, and visible inflection content after them. `put` keeps its complete
  inflection group in the 360px popup without horizontal overflow.
- The real-popup harness repeats the `put` wrapping and overflow checks in
  light and dark themes at a 360px viewport.
- Pronunciation notes and inflection forms use transparent, borderless metadata
  rows. One subtle header boundary separates them from definitions. Short
  `inflected form(s)` metadata stays on one compact row, while long qualifiers
  remain readable in normal case.
- Source marker gutters use calculated relative widths, and long markers such
  as `1c(1)` stay intact in the narrow popup.
- The 32-state headless sweep passed in light and dark themes on the 1100px
  search page and 360px popup.
- `uiContract.test.ts` proves header row order and pronunciation ownership;
  `bun test` passed with 194 tests.

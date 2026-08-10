# 01 — Make local tags match the host UI

**What to build:** Dictionary readers see local tags as compact, neutral,
static badges that fit Yomitan's visual language without looking like its
dictionary badge. This slice also establishes the repeatable real-source
search-page and narrow-popup check that later UI tickets use.

**Blocked by:** None — can start immediately

**Status:** completed

- [x] A fresh real-source dictionary import shows `archaic`, `chiefly
      British`, `of a ship`, `cricket`, `transitive verb`, and `intransitive
      verb` with one shared local-tag treatment in both the search page and
      narrow popup
- [x] Local tags have compact rounded geometry that is similar in scale to a
      Yomitan badge at runtime, while their neutral color remains distinct
      from the dictionary-identity badge
- [x] Local tags look static and expose no pointer cursor, help cursor,
      duplicate tooltip, click behavior, or navigation behavior
- [x] Inflection connectors such as `or`, `also`, and `or dialectal` remain
      quiet inline text instead of local-tag badges
- [x] Light-theme and dark-theme checks show readable local-tag text with the
      agreed accessible contrast and no fixed light-only color pair
- [x] Long local tags wrap or fit without creating horizontal scrolling in
      the narrow popup
- [x] Yomitan-owned headword, part-of-speech, dictionary, and tag-list badges
      retain their native appearance
- [x] The browser acceptance workflow rebuilds and imports a fresh
      real-source dictionary, then checks reader-visible behavior in both the
      search page and narrow popup
- [x] Supporting rendered-content and conversion checks continue to prove
      that local tags keep their nearest structured-content owner and source
      order
- [x] Archive schema, deterministic output, lookup records, soft links,
      rules, and ranking behavior remain unchanged

## Verification

- Fresh `bun run inspect:dict` build and import: 281 records for the 10
  selected roots.
- The inspect harness opens Yomitan's real search popup at a 360px viewport
  and checks local-tag geometry, neutral color separation, wrapping, and
  horizontal-overflow behavior in light and dark themes.
- Live acceptance: 42 states across `what`, `in`, `give`, `put`, `sum`,
  `down`, and `turn`; light/dark themes; 320/360/760px widths; zero local
  tag, overflow, or layout failures.
- Runtime geometry matches Yomitan's native badge metrics: 21.5px height,
  3.5px radius, 5.25px horizontal padding, and 11px tag text at the default
  host scale. The local fill remains neutral by design.
- `bun test`: 192 pass; Biome and `git diff --check`: pass.

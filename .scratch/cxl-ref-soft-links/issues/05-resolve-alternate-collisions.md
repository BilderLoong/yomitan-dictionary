# 05 — Resolve cxl and alternate collisions by meaning

**What to build:** Preserve all distinct semantic routes when a cxl relationship and a generic `.va` alternate share a lookup and target. Replace the generic alternate only when the cxl relationship is a spelling or variant relationship; otherwise keep both routes.

**Blocked by:** 01 — Emit complete cxl relations end to end.

**Status:** resolved 2026-08-13

- [x] Collision classification uses case-insensitive, whitespace-normalized complete words: `variant`, `variants`, `spelling`, or `spellings`.
- [x] Classification controls collision precedence only; it never filters cxl relation emission.
- [x] A spelling or variant cxl route with the same lookup and target shadows the generic `.va` alternate and merges its evidence into the cxl route.
- [x] The merged route stays at the cxl route’s first source position.
- [x] An inflection, synonym, or other non-spelling cxl route remains beside the generic `alternative` route.
- [x] Routes with the same lookup and target but different exact rules remain distinct and searchable.
- [x] Collision behavior applies consistently to the existing generic `.va` alternate relationship kinds without changing their ownership rules.
- [x] Main-to-alternative-spelling routes remain outside this policy and keep their current behavior.
- [x] Focused and selected-build tests prove both outcomes, for example `variant spelling of` shadows `alternative`, while `plural of` coexists with it.

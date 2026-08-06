# MWU Structured-Content Renderer Design

> Archived 2026-08-06 — implemented; the renderer contract now lives in
> `openspec/specs/mwu-entry-conversion/spec.md`.

**Date:** 2026-08-06

**Status:** Approved for implementation under the user's overnight implementation request.

## Goal

Replace the Level 1 converter's generic `div` flattening with a deterministic,
MWU-shaped Yomitan structured-content renderer. The existing Level 1 ownership,
dependency, soft-link, and archive-selection rules remain unchanged.

## Product contract

Each canonical source owner renders as one schema-valid structured-content root:

```text
mwu-entry
├── mwu-header
│   ├── homograph-number
│   ├── headword-display (only when source syllabification differs from lookup)
│   ├── pronunciation
│   ├── inflection-group
│   └── origin (collapsed details)
├── native ordered lists for source sense markers
│   ├── level 3: decimal sense numbers
│   ├── level 4: lower-alpha subsenses
│   └── level 5: decimal parenthetical definitions
├── scoped grammar and usage labels beside their owning definition
├── one visible example per local example group
│   └── remaining examples in collapsed extra-examples details
└── phrase (collapsed details) and run-on sections in source order
```

The term-bank definition-tag field receives a small pure mapping from common
MWU part-of-speech labels (`noun` -> `n`, `verb` -> `v`, `pronoun` -> `pron`,
etc.). The structured content retains the richer source text and pronunciation.
The Yomitan reading field remains empty, as established by the MWU contract.

## Rendering rules

1. Parse only the canonical owner's HTML already selected by `planCanonical`.
2. Extract header fields from `.hword`, `.fl`, `.lbs`, `.prs`, and `.vg-ins`.
   Ignore audio controls and navigation-only attributes; keep visible text.
3. Normalize MWU `¦` stress marks to `ˈ` and render pronunciation readings as
   slash-delimited inline text without duplicating form-local pronunciation.
4. Treat `.sb`/`.sb-*`/`.pseq`/`.sense` as a marker stream. Build immutable
   marker paths and render them as nested native `ol`/`li` nodes rather than
   a deep stack of anonymous `div` elements.
5. Render `.dt` as a definition flow. Keep source order for inline labels,
   cross references, examples, usage notes, and punctuation.
6. Render `.mw_t_wi` targets as orange, bold spans; render `.mw_t_it` and
   source labels as italic spans; preserve visible cross-reference text while
   discarding `gdlookup://`/`bword://` navigation targets.
7. Render the first `.ex-sent` in each `.ex-sent-group` directly and place the
   rest under a collapsed `details` node. Keep `.auth`, `.source`, and `.aqdate`
   as a small italic attribution child.
8. Render `.uns` usage notes at the nearest sense owner and keep their nested
   examples local. Render `.section[data-id=origin]` as collapsed origin details.
9. Render defined `.dro` phrases as collapsed sections. The existing phrase
   ownership planner still decides which phrase becomes a canonical record.
10. For an unsupported visible element, emit one plain-text fallback block and
    one `unsupported-visible-subtree` finding for that subtree. Never emit raw
    HTML tags that the Yomitan structured-content schema does not allow.

## Boundaries

- No changes to Level 1 canonical ownership, soft-link direction, dependency
  closure, or selected-word CLI behavior.
- No audio extraction, image packaging, tag-bank redesign, or full-database mode.
- No copying of the hand-authored design fixture into production output. It is
  an acceptance reference for structure and visual intent only.
- Browser import remains a separate gate from unit/schema tests. If the Chrome
  connector is unavailable, the deterministic local import harness must report
  that limitation rather than being presented as Chrome-MCP evidence.

## Verification contract

- Focused converter tests cover header extraction, pronunciation normalization,
  nested marker paths, scoped labels, target highlighting, one-visible-example
  collapsing, origin/phrase sections, cross-reference target removal, and the
  unsupported-subtree fallback.
- Real SQLite integration assertions cover `what`, `take`, `process`, `set`,
  and `hand` for structural units, source order, and absence of raw unsupported
  tags.
- Archive checks validate term-bank/index schemas and deterministic record
  counts. Browser checks import the archive, wait for progress completion, and
  inspect rendered result text and details/list structure for representative
  searches.
- Documentation records the renderer contract, current coverage, exact gates,
  and any browser-environment limitation.

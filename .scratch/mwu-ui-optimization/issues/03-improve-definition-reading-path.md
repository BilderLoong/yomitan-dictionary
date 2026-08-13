# 03 — Improve the definition reading path

**What to build:** Dictionary readers can follow definitions first, then
notes, examples, sources, references, and local expansion controls in a calm
and readable order. Long entries remain accessible without secondary content
competing with the meaning.

**Blocked by:** 01 — Make local tags match the host UI

**Status:** completed

- [x] Definition text remains the strongest content in the body, and ordinary
      emphasis inherits its owner's color instead of forcing global red
- [x] Example target expressions remain easy to find through restrained
      emphasis rather than a bright accent color
- [x] Long usage notes use readable normal text in a quiet inset region with
      a subtle boundary instead of paragraph-wide italics
- [x] Usage-note examples remain visually attached to the note that owns them
- [x] The first example in each local example group remains visible, while
      additional examples start closed behind the existing count-based
      disclosure summary
- [x] Extra-example summaries have clear spacing, a native disclosure marker,
      visible keyboard focus, and keyboard operation
- [x] Example sources use quieter text with accessible contrast and remain
      attached to the examples they identify
- [x] Sibling example attributions from real MWU entries stay inside the
      owning example sentence and its shared frame
- [x] Wrapped example attributions align with the example sentence text column
      using logical, relative spacing
- [x] Attribution text stays together when it wraps, so a citation moves as one
      unit to the example text column
- [x] An attribution only stays beside its sentence when its full inline unit
      fits there; otherwise it starts at the example text column and wraps only
      when it is wider than that full column
- [x] Noninteractive cross-references use neutral text instead of link-blue
      styling and do not suggest unavailable navigation
- [x] Fresh real-source checks for `what` and `in` prove the reading order in
      both the search page and narrow popup
- [x] Light-theme and dark-theme checks meet the agreed accessible contrast,
      inherit host typography, and create no horizontal scrolling
- [x] Supporting tests preserve every definition, note, example, source,
      reference, local owner, and source-order relationship
- [x] Archive schema, deterministic output, lookup records, soft links,
      rules, and ranking behavior remain unchanged

## Verification

- Real-source `what` and `in` entries show definitions first, quiet notes and
  examples, neutral dotted cross-references, and count-based extra-example
  disclosures in light and dark themes.
- The real `give thanks` phrase keeps its sibling source attribution inside
  the framed example sentence instead of rendering it as an unframed sibling.
- The real-popup harness checks list markers, collapsed extra-example rows,
  neutral references, and no horizontal overflow at a 360px viewport.
- Headless keyboard check: an extra-example summary receives a 2px focus
  outline, opens with `Enter`, and closes with `Enter`. The 32-state sweep found
  zero list, alignment, disclosure, reference, or overflow failures.
- `uiContract.test.ts`, conversion tests, and render smoke tests preserve the
  structured-content owners and source order; `bun test` passed with 194 tests.

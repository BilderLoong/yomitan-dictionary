# Optimize the MWU structured-content UI in Yomitan

**Status:** completed

## Problem Statement

The Merriam-Webster Unabridged dictionary preserves strong source structure,
but the current Yomitan presentation does not give that structure a clear
visual hierarchy. The MWU structured entry header blends into the definition
tree, local tags are larger and stronger than Yomitan's own badges, global red
emphasis attracts too much attention, long notes are difficult to scan,
noninteractive references look interactive, and secondary content competes
with primary definitions. Dense entries such as `what`, `in`, `give`, and
`put` therefore require more effort to read than their information structure
should require.

## Solution

Refine the dictionary-owned structured-content presentation without changing
Yomitan-owned headword, part-of-speech, or dictionary badges. Give the MWU
structured entry header a compact three-line hierarchy, render local tags as
small neutral badges with Yomitan-like geometry, make definitions and examples
the primary reading path, and give notes and collapsed sections clear but quiet
roles. Preserve all source-owned content, source order, semantic ownership, and
existing Yomitan archive behavior.

The result must work in both Yomitan's search page and its narrower popup. It
must remain readable in light and dark themes, support keyboard focus, and use
the existing real-source build and browser inspection workflow as the primary
acceptance seam.

## User Stories

1. As a dictionary reader, I want to identify the pronunciation immediately,
   so that I can start reading the entry without searching through metadata.
2. As a dictionary reader, I want pronunciation notes to be quieter than
   pronunciation readings, so that explanatory text does not look like another
   phonetic reading.
3. As a dictionary reader, I want inflected forms on a distinct header line,
   so that forms do not blend into the definition tree.
4. As a dictionary reader, I want long inflection groups to wrap without being
   hidden, so that every source form remains available in a narrow popup.
5. As a dictionary reader, I want inflection labels such as `or`, `also`, and
   `or dialectal` to remain quiet text, so that the structured entry header does
   not become a wall of badges.
6. As a dictionary reader, I want a subtle boundary below the MWU structured
   entry header, so that I can see where definitions begin.
7. As a dictionary reader, I want local tags to look different from definition
   prose, so that I can scan usage and scope before reading the definition.
8. As a dictionary reader, I want `archaic`, `chiefly British`, `cricket`, and
   `of a ship` to share one local-tag treatment, so that similar qualifiers are
   recognizable across entries.
9. As a dictionary reader, I want `transitive verb` and `intransitive verb` to
   use the local-tag treatment, so that verb subgroup boundaries are easy to
   find.
10. As a dictionary reader, I want local tags to use a compact shape and size
    similar to Yomitan's badges, so that the dictionary feels integrated with
    its host application.
11. As a dictionary reader, I want local tags to use a neutral color distinct
    from Yomitan's dictionary badge, so that repeated qualifiers do not compete
    with dictionary identity.
12. As a dictionary reader, I want local tags to look static, so that I do not
    mistake them for buttons, links, or help controls.
13. As a dictionary reader, I want definitions to remain the strongest content
    in the body, so that the main meaning is always the first reading path.
14. As a dictionary reader, I want emphasis to follow its surrounding content,
    so that ordinary emphasis does not become bright red global emphasis.
15. As a dictionary reader, I want the target expression in an example to be
    clear without a bright accent color, so that examples remain calm and easy
    to read.
16. As a dictionary reader, I want one example visible by default, so that I
    can understand usage without expanding another control.
17. As a dictionary reader, I want additional examples behind a clear
    disclosure row, so that long entries stay compact.
18. As a dictionary reader, I want `2 more examples` to look like a disclosure
    rather than definition text, so that its purpose is clear.
19. As a keyboard user, I want disclosure summaries to show visible focus, so
    that I know which section will open when I press a key.
20. As a dictionary reader, I want example attributions to remain readable, so
    that source information is available without competing with the example.
21. As a dictionary reader, I want long usage notes in a quiet inset block, so
    that I can distinguish guidance from the definition it qualifies.
22. As a dictionary reader, I want usage-note examples to remain attached to
    their owning note, so that their meaning does not become ambiguous.
23. As a dictionary reader, I want noninteractive cross-references to avoid
    link-blue styling, so that I do not try to click text that cannot navigate.
24. As a dictionary reader, I want the `give thanks` definition and
    `specifically : to say grace` to share one definition flow, so that one
    continuous source thought does not look like unrelated definitions.
25. As a dictionary reader, I want an example under `give thanks` to begin on a
    new line, so that the definition and its evidence remain distinct.
26. As a dictionary reader, I want phrase sections collapsed by default, so
    that a long phrase inventory does not obscure the main definition tree.
27. As a dictionary reader, I want origin sections collapsed by default, so
    that etymological history remains available but secondary.
28. As a dictionary reader, I want synonym discussions collapsed by default,
    so that comparison prose does not dominate the primary meaning.
29. As a dictionary reader, I want phrase disclosures to be stronger than
    origin and synonym disclosures, so that lexical phrase content keeps its
    higher importance.
30. As a dictionary reader, I want extra-example disclosures to be quieter than
    section disclosures, so that local expansion controls do not look like new
    entry sections.
31. As a dictionary reader, I want source order and sense ownership preserved,
    so that visual improvements do not change the dictionary's meaning.
32. As a dictionary reader, I want the same hierarchy in Yomitan's search page
    and popup, so that the entry does not change character between surfaces.
33. As a popup user, I want content to wrap without horizontal scrolling, so
    that the entry remains usable at narrow width.
34. As a light-theme user, I want readable text and quiet surfaces, so that no
    element loses contrast against a light background.
35. As a dark-theme user, I want the same semantic hierarchy without fixed
    light-theme colors, so that the dictionary remains readable in dark mode.
36. As a low-vision reader, I want normal text and metadata to meet accessible
    contrast targets, so that quiet styling does not become invisible styling.
37. As a Yomitan user, I want Yomitan's headword, POS, and dictionary badges to
    retain their native appearance, so that one dictionary does not modify the
    host interface.
38. As a dictionary maintainer, I want local tags to remain structured content
    rather than tag-bank metadata, so that sense-local ownership remains exact.
39. As a dictionary maintainer, I want the UI change to preserve schema-valid
    and deterministic archives, so that presentation work does not change
    dictionary lookup behavior.
40. As a dictionary maintainer, I want representative real-source entries to
    exercise every visual role, so that a visually attractive fixture cannot
    hide production-source problems.

## Implementation Decisions

- The change is limited to dictionary-owned structured content. It must not
  select or override Yomitan-owned headword, POS, dictionary, tag-list, search,
  or popup chrome.
- The dictionary stylesheet remains the presentation boundary. Structured
  content may receive the minimum semantic container or attribute changes
  needed for correct flow, but the renderer must not emit inline styles.
- The Yomitan reading field remains empty. Pronunciation readings and
  pronunciation notes remain visible source-owned structured content.
- The MWU structured entry header has three visual rows: pronunciation
  readings, pronunciation notes, and inflection groups.
- Recognizable pronunciation syntax does not receive a generated
  `Pronunciation` label. Quiet labels may identify pronunciation notes and
  inflected forms where they improve comprehension.
- The structured entry header uses compact spacing and a subtle bottom
  boundary. It does not use a heavy box, card, or saturated background.
- Every inflection group remains visible. Groups wrap naturally, and no form is
  hidden behind a `More forms` control.
- Inflection labels remain subdued inline text. They do not receive the local
  tag badge because source values include connectors such as `or` and `also`.
- A local tag is a short usage, register, subject, applicability, grammar, or
  definition qualifier owned inside structured content. Examples include
  `archaic`, `chiefly British`, `of a ship`, `cricket`, `transitive verb`, and
  `intransitive verb`.
- The local-tag visual treatment applies to the existing structured-content
  tag unit and the verb-subtype label. It covers usage, definition, and grammar
  categories already routed through the shared tag unit.
- Local tags use a compact rounded-rectangle geometry similar in size and
  shape to Yomitan's badges. Exact color values are tuned in the rendered UI,
  not copied from Yomitan or WTY.
- Local tags use one quiet, theme-safe neutral palette. They do not reuse the
  purple dictionary-identity color or depend on category-specific saturated
  colors.
- Local tags are static metadata. Remove the help cursor and duplicate tooltip
  behavior; do not add click, hover, or navigation behavior.
- Existing Yomitan definition tags continue to carry compact POS tokens. This
  visual work does not create a tag bank and does not change term tags,
  definition tags, rule fields, scores, categories, or lookup behavior.
- Global emphasis no longer forces red. Emphasis inherits color and weight
  from its semantic owner, while example target highlights may use restrained
  weight to remain findable.
- Definition text remains the visual anchor of the body. Notes, examples,
  sources, references, and disclosures use progressively quieter treatments.
- Usage notes use normal readable text in a lightly inset region with a subtle
  boundary. Long usage notes do not use paragraph-wide italics.
- The first example for each local example group remains visible. Remaining
  examples stay collapsed behind the existing count-based disclosure summary.
- Extra-example summaries receive clear spacing, a native disclosure marker,
  and a visible focus state. They remain less prominent than phrase, origin,
  and synonym section summaries.
- Example sentences use quiet list-item treatment with native disc markers.
  Example sources use smaller text with accessible contrast and remain attached
  to the example they identify. The extra-example summary text aligns with the
  example text column while keeping its native disclosure marker.
- Noninteractive cross-references use neutral text rather than link-blue. The
  visible relationship wording remains the navigation cue.
- An unnumbered continuation in a phrase definition remains in the same visual
  line as its preceding definition when source ownership and order show one
  continuous flow. The `give thanks` case is the required example. Its example
  starts in the normal example block below the definition flow.
- Phrase, origin, synonym discussion, and extra-example disclosures start
  closed. Phrase summaries are the strongest disclosure level, origin and
  synonym summaries are secondary, and extra-example summaries are tertiary.
- The stylesheet inherits Yomitan's font and theme context. It must avoid fixed
  foreground/background pairs that work only in light mode.
- Normal text must meet WCAG AA contrast. Smaller attribution and badge text
  must also remain readable. Native disclosure controls must have visible
  keyboard focus.
- The final layout must work without horizontal overflow in both the search
  page and the narrow popup.
- No new animation is required. Native disclosure behavior remains immediate
  and respects host behavior.
- Source content, source order, nearest semantic ownership, sense hierarchy,
  and fallback findings remain unchanged unless a minimal flow correction is
  required by this specification.

## Testing Decisions

- The primary acceptance seam is a fresh real-source dictionary ZIP imported
  into the Yomitan fixture and inspected in the real rendered interface. This
  is the highest existing seam because it includes conversion, archive
  assembly, stylesheet packaging, import, Yomitan rendering, and host theme
  interaction.
- The primary seam must cover both the search page and the narrow popup. If the
  current browser harness cannot open the popup, extend that same harness
  instead of creating a separate UI test application.
- Browser assertions must test visible behavior rather than stylesheet source
  text. Examples include computed appearance, disclosure state, focus
  visibility, wrapping, contrast, and absence of horizontal overflow.
- Local-tag browser checks must compare their geometry with Yomitan's badges at
  runtime instead of copying permanent pixel constants. The local tag must be
  compact and similar in scale, while its neutral color must remain distinct
  from the dictionary badge.
- Local-tag checks must prove that labels such as `archaic`, `chiefly British`,
  `of a ship`, `cricket`, `transitive verb`, and `intransitive verb` receive the
  shared treatment, while inflection labels such as `or` and `also` do not.
- Interaction checks must prove that local tags have no pointer/help affordance
  and that disclosure summaries can be reached and operated by keyboard.
- Theme checks must cover light and dark presentation and calculate contrast
  from computed foreground and background colors. Quiet metadata must not fall
  below the agreed accessible contrast target.
- Narrow-popup checks must prove that long pronunciation and inflection groups
  wrap and that the entry creates no horizontal scrolling.
- Real-source acceptance words are `what`, `in`, `give`, `put`, `sum`, `down`,
  and `turn`. Together they cover dense senses, local tags, pronunciation
  notes, inflections, verb subtypes, phrase flow, example disclosures, origin,
  and synonym discussion.
- The `give` acceptance state must show `give thanks` and
  `specifically : to say grace` in one definition flow with the example below
  it.
- The `what` acceptance state must show one visible example per local group,
  quiet extra-example disclosures, readable usage notes and sources, local
  tags, collapsed phrases, and a collapsed origin section.
- The `in` acceptance state must prove that pronunciation notes do not use the
  old global red emphasis and that local tags remain readable beside dense
  definition content.
- The `put` acceptance state must prove that the full inflection group remains
  visible and wraps in the popup without turning connectors into badges.
- The `turn` acceptance state must prove that the synonym discussion remains
  collapsed, preserves its structured entries, and uses the secondary
  disclosure hierarchy.
- Existing real-source rendered-content tests remain the supporting contract
  seam. They must assert semantic structure, source order, collapsed defaults,
  exact disclosure text, and the phrase definition-flow contract without
  duplicating browser computed-style assertions.
- Existing conversion tests remain the supporting semantic seam. They must
  continue to prove that source labels map to their correct structured-content
  units and nearest owners.
- Existing archive-schema and determinism tests must remain green. A UI change
  must not alter lookup records, soft-link relationships, rule behavior, or
  archive validity.
- Storybook remains useful for focused visual review of individual entries and
  disclosure interaction, but it does not replace the imported Yomitan browser
  acceptance seam.
- A good test observes reader-visible behavior or serialized dictionary
  behavior. It must not assert private helper calls, internal traversal order,
  or exact CSS declaration layout.

## Out of Scope

- Creating or emitting a Yomitan tag bank.
- Changing Yomitan-owned headword, POS, dictionary, tag-list, search-page, or
  popup styling.
- Changing POS token mappings or treating POS appearance as dictionary-owned.
- Changing term tags, definition-tag semantics, deinflection rules, popularity
  ranking, sequence behavior, or soft-link behavior.
- Investigating `sum` ranking, `down` alternatives, broader deinflection rules,
  or unrelated information-unit coverage work from the project TODO.
- Changing the full-database build mode or build-report data model.
- Adding pronunciation audio or moving pronunciation into the Yomitan reading
  field.
- Promoting sense-local labels to global metadata.
- Adding new animations, custom fonts, or a separate frontend application.
- Broad renderer refactoring that is not required for the agreed header,
  phrase-flow, or accessibility behavior.
- Removing, flattening, or reordering source-owned dictionary information for
  visual simplicity.

## Further Notes

- The project's existing phrase `WTY-style tag` normally refers to compact POS
  token mapping, such as `noun` to `n`. In this specification, WTY and Yomitan
  are only visual references for the local tag's compact geometry; they do not
  change local-tag semantics or metadata scope.
- Live baseline inspection showed that current local tags are larger and
  stronger than Yomitan's badges and use a help cursor. The target is similar
  compact geometry with a quieter dictionary-owned palette and static
  behavior.
- A fresh selected-root build produced 281 records for 10 roots during final
  acceptance. The browser harness opens Yomitan's real search popup at a
  360px viewport and checks both light and dark presentation states.
- The accepted structured-content fidelity and information-preservation
  decisions continue to govern the work: styling targets only dictionary-owned
  units, and presentation changes must not lose visible source information.
- No new ADR is required. The ownership and tag-generation boundaries are
  already recorded, while the remaining choices are reversible presentation
  decisions.

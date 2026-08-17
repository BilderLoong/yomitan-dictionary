Status: completed

## Problem Statement

The built MWU entry for `abstract` shows `See Synonym Discussion at detach`
inside its Related to section, but `detach` is plain text. The conversion loses
the source target boundary, so Yomitan cannot expose or style the target as a
cross-reference. The pointer is also classified as a full synonym discussion
instead of a synonym-discussion reference.

## Solution

Preserve each source synonym-discussion pointer as a
`synonym-discussion-reference`. Preserve each named `.sr` target inside the
pointer as a non-interactive `cross-reference`. Keep the Related to disclosure,
visible wording, source order, and punctuation unchanged. Remove source-only
navigation targets from the output and reuse the existing cross-reference
presentation.

## User Stories

1. As a dictionary user, I want `detach` to appear as a cross-reference, so that I can recognize it as the target of the synonym-discussion pointer.
2. As a dictionary user, I want `abridgment` to follow the same target rule, so that separate meanings of `abstract` behave consistently.
3. As a dictionary user, I want `See Synonym Discussion at` to remain ordinary pointer text, so that only the referenced term receives cross-reference semantics.
4. As a dictionary user, I want the Related to disclosure to remain collapsed and titled as before, so that the entry structure does not change unexpectedly.
5. As a dictionary user, I want the visible pointer wording and punctuation to stay unchanged, so that no source information is lost.
6. As a dictionary user, I want the target to remain non-interactive, so that internal MWU navigation schemes do not produce broken Yomitan links.
7. As a dictionary maintainer, I want all `.sr` targets in synonym-discussion pointers to use one source-based rule, so that the behavior is not special-cased for `detach`.
8. As a dictionary maintainer, I want the pointer and its target to keep separate semantic units, so that each unit has one clear responsibility.
9. As a dictionary maintainer, I want the target to avoid duplicate relation metadata, so that the parent pointer remains the owner of the synonym-discussion relationship.
10. As a dictionary maintainer, I want a focused conversion regression, so that the source rule fails clearly if target structure is lost again.
11. As a dictionary maintainer, I want a real-database regression for `abstract`, so that production wrapper traversal is verified instead of assumed from a synthetic fixture.
12. As a dictionary maintainer, I want the real regression to cover both `abridgment` and `detach`, so that both pointer instances in the selected source row are protected.

## Implementation Decisions

- The existing Related to disclosure remains a `related-item`.
- A source `.srefs.synonym-discussion` pointer is a
  `synonym-discussion-reference`, not a full synonym discussion.
- Every descendant source `.sr` target becomes one `cross-reference` unit.
- Each cross-reference target contains only its visible target label. The
  surrounding pointer text remains outside that target unit.
- Cross-reference targets remain non-interactive structured-content spans.
- Source navigation values such as `bword://detach` are not serialized.
- The parent synonym-discussion reference owns the relationship. Its target
  does not receive duplicate relation metadata.
- The conversion uses one source-shape rule for all matching pointers. It does
  not special-case a word, row, or target spelling.
- The existing cross-reference presentation is reused. No new style rule is
  added.
- The repair stays in structured-content conversion. Planning, record
  assembly, database loading, and tag generation do not change.
- No compatibility path or fallback representation is added.

## Testing Decisions

- Tests verify public conversion behavior and real selected-word build output.
  They do not call private renderer helpers or assert an internal traversal
  sequence.
- The focused conversion seam receives an exact source-shape example with a
  synonym-discussion pointer and one `.sr` target. It verifies the related
  disclosure, pointer unit, target unit, visible text, missing target relation
  metadata, and absence of source navigation data.
- The real selected-word build seam uses the current `MWU.db` row for
  `abstract`. It verifies the two known pointer targets, `abridgment` and
  `detach`, through serialized structured content.
- The real regression verifies that each target is a separate
  `cross-reference`, each pointer is a `synonym-discussion-reference`, and no
  `bword://` navigation value remains.
- Existing converter tests provide prior art for semantic unit assertions.
  Existing selected-word pipeline tests provide prior art for real-database
  traversal assertions.
- TDD proceeds in vertical slices: first the focused conversion test and its
  minimum implementation, then the real-database regression and only the
  additional implementation that the second red result proves necessary.

## Out of Scope

- Interactive dictionary navigation or preservation of `bword://` links.
- New cross-reference colors, typography, hover behavior, or CSS selectors.
- Relation metadata on each `.sr` target.
- Changes to full synonym-discussion rendering.
- Changes to usage-discussion references.
- Changes to other Related to source shapes that do not use
  `.srefs.synonym-discussion` and `.sr`.
- Planner, assembler, schema, database, tag-bank, or soft-link changes.
- Mobile or touch-specific presentation changes.
- Backward-compatibility logic for the incorrect plain-text output.

## Further Notes

- The current real source stores the affected `abstract` content in row 751.
  One meaning points to `abridgment`; another points to `detach`.
- The current source catalog already classifies `.srefs.synonym-discussion`
  and `.sr` as a synonym-discussion reference.
- The current renderer preserves the visible text but flattens the `.sr`
  anchor during loose fallback traversal.
- The existing stylesheet already targets `cross-reference` units.
- This decision is small and reversible, so it does not require a new ADR.

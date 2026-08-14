# Wrap MWU definition text as a structured-content unit

**Status:** ready-for-agent

## Problem Statement

The rendered Level 5 definition container currently mixes primary definition
text with the block content that it owns. For example, `: how much` is a bare
text child beside an example group. A dictionary stylesheet can select the
complete definition container, but it cannot select only the primary meaning
without also selecting its examples and usage notes. This makes definition
text difficult to style independently.

## Solution

Render each contiguous run of Level 5 definition text inside a semantic
`definition-text` span. Keep the span inside the existing Level 5 definition
container. Include the source definition marker and all inline semantic
content in the span. Keep examples, usage notes, and scoped definitions outside
the span and in their source order.

A definition that contains more primary meaning content after an example gets
another `definition-text` span for that later run. A definition that contains
only usage notes gets no empty span.

## User Stories

1. As a dictionary reader, I want primary definition text to have its own
   semantic unit, so that it can receive a clear visual treatment without
   changing its examples.
2. As a dictionary reader, I want the leading definition colon to stay with
   the meaning that it introduces, so that definition styling remains
   visually complete.
3. As a dictionary reader, I want cross-references inside a definition to stay
   inside the definition-text unit, so that linked meaning content keeps one
   reading flow.
4. As a dictionary reader, I want emphasis inside a definition to stay inside
   the definition-text unit, so that inline source meaning is not split into
   unrelated pieces.
5. As a dictionary reader, I want examples to remain outside definition text,
   so that example styling does not inherit definition-text styling.
6. As a dictionary reader, I want usage notes to remain outside definition
   text, so that guidance and primary meaning keep different semantic roles.
7. As a dictionary reader, I want scoped definitions to retain their existing
   ownership, so that nested meaning structure is not flattened into its
   parent definition text.
8. As a dictionary reader, I want definitions with several meaning-and-example
   runs to preserve their source order, so that every example stays beside the
   meaning that it supports.
9. As a dictionary reader, I want definitions that contain only usage notes to
   avoid empty definition-text elements, so that the rendered structure
   represents real content only.
10. As a dictionary reader, I want the visible definition wording and spacing
    to remain unchanged, so that the semantic wrapper does not alter the
    dictionary meaning.
11. As a dictionary stylesheet author, I want a stable `definition-text`
    selector, so that I can style primary meaning content without complex
    selectors over unrelated child units.
12. As a dictionary maintainer, I want the rule to apply to every Level 5
    definition with inline meaning content, so that behavior is not limited to
    one word or one source shape.
13. As a dictionary maintainer, I want the behavior proved through a real
    converted `what` entry, so that a hand-written fixture cannot hide source
    conversion errors.
14. As a dictionary maintainer, I want a multi-run `what` definition covered,
    so that an implementation that wraps only the first meaning cannot pass.
15. As a dictionary maintainer, I want Level 5 definitions to contain no bare
    non-whitespace text, so that future conversion changes preserve the
    semantic boundary.

## Implementation Decisions

- Keep the existing Level 5 definition container as the semantic owner of the
  complete definition flow.
- Add `definition-text` as a structured-content unit at Level 5.
- Render each definition-text unit as a span.
- Include the leading source definition marker, plain text, cross-references,
  emphasis, superscript references, inflection labels, and other inline
  semantic content owned by the definition.
- Treat examples, usage notes, and scoped definitions as boundaries. They stay
  outside definition-text spans.
- Wrap each contiguous inline run independently. If examples separate two
  meaning runs, emit one definition-text span before the examples and another
  span after them.
- Do not emit a definition-text span for an empty or whitespace-only run.
- Preserve the original structured-content order and visible text.
- Implement the grouping as a pure immutable transformation of rendered
  structured-content nodes.
- Do not add a compatibility path or reuse the `definition` unit name for the
  new span. The existing Level 3 scoped-definition unit keeps its current
  meaning.
- Do not add presentation styles in this change. The semantic span is the
  styling seam requested by the user.

## Testing Decisions

- Test at the rendered-HTML seam produced from the real converted `what`
  source word row. This is the highest existing focused seam and covers source
  conversion, structured-content construction, and HTML generation.
- Use the existing real-source rendered-entry test as prior art. Do not test a
  private grouping helper directly.
- First add an exact failing assertion for the `what` sense `1c`: a Level 5
  definition-text span contains `: how much` and is immediately followed by
  its example group.
- In the same real-source test, prove that each definition-text unit is a Level
  5 span.
- Prove that Level 5 definition containers have no direct non-whitespace text
  children after conversion.
- Cover a `what` definition with multiple meaning-and-example runs and prove
  that each meaning run has its own span in preserved order.
- Use exact literal text from the source fixture as the expected value. Do not
  reproduce the renderer algorithm in the test.
- Follow red then green: confirm that the focused test fails before changing
  production code, then make the smallest general implementation that passes.
- Run the focused rendered-entry test first. Then run the relevant package
  test gate and repository formatting or type gates that cover changed files.

## Out of Scope

- Styling the new definition-text unit.
- Changing the Level 5 definition container.
- Changing Level 3 scoped-definition rendering.
- Changing example, usage-note, cross-reference, or emphasis semantics.
- Changing dictionary records, lookup behavior, tags, popularity, sequence,
  archive assembly, or source selection.
- Adding wrappers to structured-content units outside Level 5 definitions.
- Refactoring unrelated renderer behavior.

## Further Notes

- The real `what` entry provides both the small `: how much` case and several
  multi-run definitions where example groups separate primary meaning runs.
- This is one narrow end-to-end change. It does not need an architecture
  decision record because the semantic wrapper is local and easy to reverse.

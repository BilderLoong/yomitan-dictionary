# Structure MWU usage discussions

**Status:** completed

Implementation, generated-HTML proof, and a bounded targeted real-Yomitan
inspection for `because` are complete. The separate full presentation suite
still reports its unrelated existing `what` failure.

## Problem Statement

An entry-level usage discussion can render its complete explanation, examples,
sources, and dates inside one generic text block. For example, the real
`because` discussion loses the semantic boundaries between its explanatory
prose and four sourced examples. The text remains readable, but it does not
behave or present like example content elsewhere in the dictionary.

## Solution

Render a usage discussion as explicit Level 6 structured content owned by its
nearest entry or definition. Preserve its explanatory prose as one usage
explanation. Pair each example sentence with its own author, source, and date,
and render the pairs through the dictionary's existing example-group behavior.
Keep any see-in-addition pointer after the examples.

An entry-owned usage discussion remains a titled disclosure such as
`Usage of BECAUSE`. A definition-local usage discussion remains inside its
definition and does not gain a second entry-level disclosure.

## User Stories

1. As a dictionary reader, I want a usage discussion to have meaningful parts,
   so that it is easier to scan than one long text block.
2. As a dictionary reader, I want explanatory prose to stay separate from
   examples, so that I can distinguish guidance from evidence.
3. As a dictionary reader, I want each example to stay paired with its author,
   source, and date, so that attribution remains unambiguous.
4. As a dictionary reader, I want usage examples to use the same presentation
   as examples elsewhere in the dictionary, so that the interface is
   consistent.
5. As a dictionary reader, I want the first usage example to be visible and
   later examples to use the existing extra-example disclosure, so that long
   discussions remain compact.
6. As a dictionary reader, I want the title `Usage of BECAUSE` to remain the
   disclosure summary, so that the source heading is preserved.
7. As a dictionary reader, I want the entry-level usage disclosure to remain
   closed by default, so that it follows Origin and Related behavior.
8. As a dictionary reader, I want see-in-addition content to remain after the
   usage examples, so that source order and meaning are preserved.
9. As a dictionary reader, I want emphasis and example highlights to remain
   visible, so that source emphasis is not flattened away.
10. As a dictionary reader, I want definition-local usage discussions to stay
    inside their definitions, so that semantic ownership does not move.
11. As a dictionary maintainer, I want the rule to support both confirmed
    usage-discussion locations, so that behavior is not limited to `because`.
12. As a dictionary maintainer, I want unsupported source shapes to remain
    visible with a finding, so that new source content is not silently lost.
13. As a dictionary maintainer, I want the real `because` source row to prove
    sentence-attribution pairing, so that a simplified fixture cannot hide the
    actual bare-example shape.
14. As a dictionary maintainer, I want a real Yomitan check, so that valid
    structured content is also proved in the user-visible renderer.

## Implementation Decisions

- Use `Usage discussion` as the domain term for the complete source-owned
  explanation.
- Keep the nearest semantic owner. Entry-owned and definition-local usage
  discussions do not move or copy content between levels.
- Keep the existing entry-level details and summary structure.
- Represent explanatory prose as a Level 6 usage-explanation unit.
- Reuse the existing example-group, example-sentence, example-source, and
  extra-examples behavior. Do not create a second example system.
- Pair each bare usage example with the immediately following source
  attribution in the same source container.
- Preserve source order, visible wording, emphasis, highlights, punctuation,
  authors, publications, and dates.
- Keep see-in-addition as the final owned Level 6 unit when it follows the
  examples.
- Preserve unknown shapes as visible fallback content with a finding.
- Add no dependency, compatibility path, configurable policy, or broad
  refactor.

## Testing Decisions

- Tests verify public conversion and rendered behavior, not private helpers.
- Start with one red converter test that uses the real bare-example shape:
  explanatory prose followed by alternating example and attribution spans.
- Prove one usage-explanation unit, one ordinary example group, four correctly
  paired examples, existing extra-example behavior, and final
  see-in-addition order.
- Extend the real-database integration test for `because` so the current
  source row must produce the same semantic units and exact attribution pairs.
- Keep the existing `he` regression to prove definition-local ownership.
- Run the focused conversion and real-source integration tests before broader
  package quality gates.
- Build the selected real dictionary and use a bounded real-Yomitan inspection
  to confirm the closed outer disclosure and the structured content after it
  opens.

## Out of Scope

- Changing dictionary lookup records, tags, popularity, sequence, or source
  selection.
- Copying a usage discussion into referenced entries.
- Making source navigation links interactive.
- Inventing new visual styling when existing example and disclosure styles are
  sufficient.
- Restructuring unrelated definition, Origin, Related, phrase, or synonym
  content.
- Supporting unconfirmed usage-discussion source shapes without evidence.

## Further Notes

- The real `because` row stores the explanation and alternating bare example
  and attribution spans inside one paragraph. Generic loose rendering cannot
  infer their semantic pairing.
- The existing example renderer already provides the required example and
  extra-example behavior. The smallest solution routes this confirmed source
  shape through that behavior.
- This local and reversible renderer change does not need a new ADR.

# TODO

## Research before the richer Level 1-6 parser

Source: [2026-08-03 design-fixture status](../../docs/2026-08-03-design-fixture-status.md).

- [ ] Classify every remaining unknown HTML class:
  `.caption`, `.date`, `.disc`, `.illustrations`, `.iw`, `.l`,
  `.mw_t_a_link`, `.mw_t_bold`, `.mw_t_i_link`, `.pn`,
  `.sense-(a)`, `.sense-(b)`, `.table-image`, `.table-section`, and
  `.visible-phone`.
  - Record representative source words and DOM owner paths.
  - Determine the information meaning and nearest Level 1-6 semantic owner.
  - Classify each shape as a semantic unit, transparent wrapper,
    intentionally ignored content, or atomic unrecognized fallback.
  - Update the shared information-unit catalog before implementing parser
    behavior for a newly understood shape.
- [ ] Audit every superscript shape and its owner.
  - Keep headword homograph numbers, sense references, cross-reference
    numbers, and called-also reference numbers distinct.
  - Verify where each number belongs and how it should render.
- [ ] Audit source line-break and block-boundary shapes.
  - Distinguish meaningful source blocks from responsive
    `.breakpoint` presentation.
  - Prevent ordinary inline labels from acquiring accidental line breaks.
- [ ] Settle the remaining presentation questions for recognized units.
  - Determine the visual treatment for nested citations, related inline
    items, called-also reference numbers, and Level 6 `.see-in-addition`.
  - Treat `.see-in-addition` ownership as resolved; only its Level 6
    presentation remains open.
  - Keep `.sgram` as scoped inline content for the first slice; tag-bank
    promotion is deferred research and does not block the parser.
- [ ] Investigate definition images, tables, phrase dates, dynamic sense
  marker classes, and unfamiliar link/style classes using representative
  source words before adding semantic parser mappings.

## Validation after the production mapping exists

- [ ] Review every interposed-object candidate and negative case before
  accepting `v_phr`.
  - Check representative searches such as `give you up`, `take apart`,
    and `take the word`.
  - Confirm that ordinary emphasis does not create `v_phr` evidence.
  - Confirm that the dictionary stores canonical phrases rather than wildcard
    expressions.

Production builder implementation, fixture completion, ZIP export, and
Yomitan import are tracked in the
[first-slice OpenSpec tasks](../../openspec/changes/build-mwu-dictionary-first-slice/tasks.md);
they are not source-research tasks.

## Open Level 1 generation TODOs

- [ ] [Decide and implement cross-reference-only mean soft-link generation](docs/mwu-level-1-entry-generation.md#todo-cross-reference-only-mean-soft-link-generation).
  Keep `.cxl-ref` out of canonical-entry ownership while evaluating it as
  possible relationship evidence.


## Tags
How is tag works?
I think we need .sl convert to tag. We need a tag generation rules too.
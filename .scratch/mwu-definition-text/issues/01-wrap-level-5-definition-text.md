# 01 — Wrap Level 5 definition text as a structured-content unit

**What to build:** Make every Level 5 definition render each contiguous run of
primary definition text inside its own semantic span, while preserving visible
text, inline meaning, semantic child boundaries, and source order.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The real `what` sense `1c` renders `: how much` inside one
      `definition-text` span at Level 5 immediately before its example group.
- [ ] The leading definition marker, plain text, cross-references, emphasis,
      superscript references, inflection labels, and other inline semantic
      content stay inside their owning definition-text span.
- [ ] Example groups, usage notes, and scoped definitions remain outside
      definition-text spans and retain source order.
- [ ] Each contiguous inline meaning run has its own definition-text span,
      including when example groups separate multiple runs in one definition.
- [ ] A Level 5 definition with no primary definition text emits no empty or
      whitespace-only definition-text span.
- [ ] Level 5 definition containers contain no direct non-whitespace text
      children.
- [ ] Every definition-text unit renders as a Level 5 span.
- [ ] Exact and general real-source `what` assertions fail before production
      code changes and pass after the smallest general implementation.
- [ ] Visible dictionary wording, spacing, records, lookup behavior, tags,
      examples, usage notes, and scoped-definition behavior remain unchanged.
- [ ] The focused test, relevant package gate, and changed-file quality gates
      pass without modifying unrelated dirty files.

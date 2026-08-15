# 01 — Structure usage discussions

**What to build:** Render each confirmed usage discussion as explanatory prose,
paired sourced examples using the existing example-group behavior, and an
optional final see-in-addition pointer, while preserving its nearest entry or
definition owner.

**Blocked by:** None — can start immediately.

**Status:** completed

Implementation, generated-HTML proof, and a bounded targeted real-Yomitan
inspection for `because` are complete. The separate full presentation suite
still reports its unrelated existing `what` failure.

- [x] The entry-level `because` usage discussion remains a closed disclosure
      with the exact source summary `Usage of BECAUSE`.
- [x] Its explanatory prose is one Level 6 usage-explanation unit rather than
      part of one generic block with its examples.
- [x] Its four examples form one ordinary example group in source order.
- [x] Every example stays paired with its exact author, publication, and date.
- [x] The first example is visible and later examples use the existing
      extra-example disclosure behavior.
- [x] Emphasis, highlights, punctuation, and visible wording remain unchanged.
- [x] The see-in-addition pointer remains after the examples with its exact
      target order and no navigation href.
- [x] Definition-local usage discussions use the same internal semantic units
      but remain inside their definitions without an entry-level disclosure.
- [x] Unknown source shapes remain visible and create a conversion finding.
- [x] A public converter test fails before the production change and passes
      after the smallest general implementation.
- [x] The real `because` and `he` database integration assertions pass.
- [x] The selected real dictionary passes archive and bounded Yomitan checks,
      and the browser closes cleanly.
- [x] Changed-file quality gates pass without altering unrelated dirty work.

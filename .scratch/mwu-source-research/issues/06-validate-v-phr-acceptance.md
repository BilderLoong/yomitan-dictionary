# 06 — Validate `v_phr` acceptance

**What to build:** An evidence-backed verdict on whether the interposed-object
phrase evidence (`v_phr`) is safe to accept in production — confirmed against
real searches and negative cases, with no false positives from ordinary
emphasis.

**Blocked by:** None — can start immediately (production mapping already
exists via the archived first-slice build)

**Status:** ready-for-agent

**Source:** TODO.md, "Validation after the production mapping exists".

- [ ] Interposed-object candidates reviewed on representative searches:
      `give you up`, `take apart`, `take the word`
- [ ] Negative cases checked: ordinary emphasis must NOT create `v_phr`
      evidence
- [ ] Confirmed the dictionary stores canonical phrases rather than wildcard
      expressions
- [ ] Verdict recorded (accept or reject `v_phr`) with the source evidence

# 01 — Classify remaining unknown HTML classes

**What to build:** Every remaining unclassified MWU source class understood —
what it means, which Level 1-6 semantic owner it binds to, and whether the
parser should treat it as content, a wrapper, or ignore it. This is the
prerequisite for any parser mapping of these shapes.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Source:** TODO.md, "Research before the richer Level 1-6 parser".

- [ ] All 13 classes classified: `.caption`, `.date`, `.disc`,
      `.illustrations`, `.iw`, `.l`, `.mw_t_a_link`, `.mw_t_bold`,
      `.mw_t_i_link`, `.pn`, `.sense-(a)`, `.sense-(b)`, `.table-image`,
      `.table-section`, `.visible-phone`
- [ ] Representative source words and DOM owner paths recorded for each class
- [ ] Information meaning and nearest Level 1-6 semantic owner determined per
      class
- [ ] Each shape classified as one of: semantic unit, transparent wrapper,
      intentionally ignored content, or atomic unrecognized fallback
- [ ] Shared information-unit catalog updated before any parser behavior is
      implemented for a newly understood shape

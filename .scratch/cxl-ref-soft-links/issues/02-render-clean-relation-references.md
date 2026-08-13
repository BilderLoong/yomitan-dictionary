# 02 — Render clean general relation references

**What to build:** Render visible `.cxl-ref` content as a general relation reference. Keep the exact source relation on the wrapper, use a general cross-reference target, and remove only a leading target homograph number from confirmed reference-anchor labels.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Visible `.cxl-ref` content uses the information-unit name `relation-reference`; the old variant-only unit name is removed without an alias.
- [ ] The relation-reference wrapper stores the exact source phrase, for example `plural of` or `taxonomic synonym of`.
- [ ] Its target uses general cross-reference metadata and does not invent the relation `variant`.
- [ ] A leading homograph `<sup>` direct child in a confirmed reference anchor does not enter the visible target label or create a target superscript unit.
- [ ] For example, a source label `<sup>2</sup>booty` renders as `booty`.
- [ ] The same leading homograph rule applies consistently to other confirmed source reference-anchor classes.
- [ ] Superscripts in general definition prose, chemical formulas, pronunciation content, and non-leading label positions remain unchanged.
- [ ] Structured-content conversion tests prove both the cleaned reference label and the preserved legitimate superscripts.

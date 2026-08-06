# 02 — Tag-generation rules

**What to build:** A decided rule set for how source labels become Yomitan
tags — including whether/which `.sl` labels convert to tags — consistent with
the shared vocabulary: local labels stay visible structured content, global
tags live in the tag bank.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Source:** TODO.md, "Tags".

- [ ] Yomitan tag mechanics understood and documented (tag bank, how the
      term-bank tag field references it)
- [ ] Boundary decided: which source labels become global tags vs stay local
      labels in structured content, consistent with CONTEXT.md's "Local
      label" definition
- [ ] Tag-generation rules written and implemented, or explicitly deferred
      with the decision recorded
- [ ] Hard-to-reverse choice recorded as an ADR

## Reference sources

Migrated from PROJECT_NOTES.md (2026-08-06); verify currency before relying
on them:

- [Yomitan dictionary format](https://github.com/yomidevs/yomitan/blob/master/docs/making-yomitan-dictionaries.md)
- [Yomitan term-bank schema](https://github.com/yomidevs/yomitan/blob/master/ext/data/schemas/dictionary-term-bank-v3-schema.json)
- [Yomitan English transforms](https://github.com/yomidevs/yomitan/blob/master/ext/js/language/en/english-transforms.js)
- [Yomitan translator](https://github.com/yomidevs/yomitan/blob/master/ext/js/language/translator.js)
- [WTY project](https://github.com/yomidevs/wiktionary-to-yomitan)
- [WTY tag documentation](https://yomidevs.github.io/wiktionary-to-yomitan/tags/)

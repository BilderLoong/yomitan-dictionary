# 01 — Emit complete cxl relations end to end

**What to build:** Make one complete `.cxl-ref` relationship with one valid target work from source planning through dependency closure and Yomitan term-bank output. A cross-reference-only mean emits a `cxl-ref-soft-link`; its rule is the exact source relation phrase. A definition-bearing mean keeps canonical ownership and does not gain a soft-link route.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A cross-reference-only mean with relation `plural of` and one valid `bword://` target emits one searchable soft-link record for the canonical target.
- [ ] The emitted rule preserves source text exactly, including capitalization, abbreviations, legacy wording, and source spelling.
- [ ] Every non-empty complete relation phrase can emit; no spelling-variant allowlist controls validity.
- [ ] The relationship uses the clean name `cxl-ref-soft-link`; the old variant-only relationship name is removed without an alias.
- [ ] The target spelling comes from the decoded `bword://` href, never from visible anchor text, and a trailing homograph suffix is not part of the searchable spelling.
- [ ] The valid target row joins the build dependency closure and resolves to a canonical term before serialization.
- [ ] Empty relations, invalid hrefs, self-links, absent target rows, and targets with no emitted canonical term do not create broken Yomitan records.
- [ ] Definition-bearing means keep their canonical definition and do not emit cxl soft links.
- [ ] Focused planning and selected-build acceptance tests prove the complete single-target route and rule chain.

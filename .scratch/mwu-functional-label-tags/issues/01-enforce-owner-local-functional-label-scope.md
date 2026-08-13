# 01 — Enforce owner-local functional-label scope

**What to build:** Make every definition-owning Level 1 canonical entry use
only the functional label that it owns, while preserving local nested labels
and existing lookup behavior.

**Blocked by:** None — can start immediately.

**Status:** resolved 2026-08-13

- [x] A main canonical entry resolves only its own `.fl` label.
- [x] An alternative-spelling canonical entry resolves only its own `.fl`
      label and never inherits from its parent or canonical target.
- [x] A defined phrase always receives `phrase` and also receives the tags
      from its own `.fl` label when one exists.
- [x] A canonical entry with no owned `.fl` label emits no functional tag; it
      does not create a dynamic missing-label tag.
- [x] A nested undefined run-on keeps its local functional label in structured
      content and cannot lend that label to its parent canonical entry.
- [x] Soft-link entries keep empty `definitionTags` and `termTags` because
      they own lookup relationships rather than definitions.
- [x] Regressions prove that `Hall of Fame`, `homeothermic`, and `role-play`
      do not borrow labels from their nested undefined run-ons.
- [x] Focused conversion and selected-archive tests prove the behavior through
      serialized term-bank output.
- [x] Existing rules, deinflection behavior, term popularity, and sense-local
      structured content remain unchanged.

# 04 — Inherit continuation relation phrases

**What to build:** Make connective-only cxl references inherit a complete relationship from the nearest preceding sibling reference in the same mean. Preserve the predecessor’s exact source phrase as the emitted rule and reject continuations that have no valid predecessor.

**Blocked by:** 03 — Process every cxl target independently.

**Status:** resolved 2026-08-13

- [x] Only the exact whitespace- and case-normalized phrases `or`, `and`, `or of`, and `and of` are continuations.
- [x] A continuation inherits the nearest preceding complete relation phrase in the same mean, not a phrase from another mean.
- [x] The effective rule preserves the predecessor’s raw source text exactly rather than the normalized connective text.
- [x] All valid targets under a continuation receive the inherited relation independently.
- [x] A continuation with no preceding complete relation emits no route and records an `orphan-continuation` finding.
- [x] A complete phrase that merely contains `or` or `and` remains its own relation and is not changed by continuation logic.
- [x] Source order and exact-route deduplication remain stable after inheritance.
- [x] Focused tests prove `plural of arsis` followed by `or of arse` emits both routes with the rule `plural of`.
- [x] A source audit confirms the current Unabridged continuation inventory can inherit without hard-coding its counts into production behavior.

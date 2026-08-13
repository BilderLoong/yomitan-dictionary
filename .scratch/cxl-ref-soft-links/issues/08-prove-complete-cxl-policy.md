# 08 — Prove the complete cxl policy

**What to build:** Prove the complete accepted relation-reference behavior against the real Unabridged source, a selected dictionary build, the package validation suite, and a rendered Yomitan popup. Reconcile measured results with the accepted baseline before release.

**Blocked by:** 07 — Record the accepted cxl policy.

**Status:** resolved 2026-08-13

- [x] The real-source audit reports 17,402 source cxl references, 17,297 planner-reached references, and 145 distinct source phrase texts.
- [x] The audit reports 15,058 raw valid cxl links, 15,017 distinct routes, and 14,822 resolved cxl records.
- [x] The audit reports 69 continuation references and confirms that every current continuation inherits a complete predecessor.
- [x] The audit reports 50 secondary targets: 43 valid outcomes and 7 findings, including 6 absent target rows and 1 self-link.
- [x] Collision reconciliation reports 1,127 lookup-target pairs with generic alternates and 1,121 spelling or variant pairs that shadow the alternate.
- [x] The cxl plus generic `.va` families reconcile from 36,427 current records to 45,324 final records, a net increase of 8,897.
- [x] A selected build proves a complete relation, continuation, multi-target route, conditional alternate collision, precise finding, dependency closure, and valid archive serialization.
- [x] The complete package tests and formatter and type diagnostics pass.
- [x] Real Yomitan inspection proves an inflection route such as `'avas → 'ava [plural of]`, a continuation route, a multi-target route, and a clean `booty` or `well` target label without its leading homograph number.
- [x] Any baseline difference is investigated as a source or implementation change; accepted counts are not silently rewritten to make validation pass.

# 03 — Process every cxl target independently

**What to build:** Make a `.cxl-ref` with several `.cxt` anchors produce one ordered route per valid target. Treat every target as an independent outcome, keep valid siblings when another target fails, and merge only exact duplicate routes.

**Blocked by:** 01 — Emit complete cxl relations end to end.

**Status:** resolved 2026-08-13

- [x] Every `.cxt` target in one relation reference is inspected in source order; processing does not stop after the first target.
- [x] Each valid target emits its own `cxl-ref-soft-link` route under the same effective relation phrase.
- [x] Each valid target row joins the dependency closure independently.
- [x] A missing row, self-link, invalid href, or other failure for one target does not remove valid sibling routes.
- [x] Paragraph order is preserved first, followed by target-anchor order inside each paragraph.
- [x] Exact duplicate lookup-target-rule routes merge at the first route position and retain all source evidence.
- [x] Routes with the same lookup and target but different relation phrases remain distinct.
- [x] A selected build proves a representative multi-target relation, including one case with a valid first target and an invalid secondary target.
- [x] Focused tests cover valid secondary targets, six absent-target-style outcomes, self-link behavior, ordering, dependency closure, and deduplication without depending on current corpus counts.

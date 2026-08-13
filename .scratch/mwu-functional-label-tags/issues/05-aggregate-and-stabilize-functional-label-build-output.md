# 05 — Aggregate and stabilize functional-label build output

**What to build:** Make selected and full dictionary builds report, serialize,
and validate fixed and dynamic functional-label metadata with bounded,
deterministic output.

**Blocked by:** 03 — Add the current-database functional-label inventory
audit; 04 — Preserve unknown functional labels as dynamic tags.

**Status:** resolved 2026-08-13

- [x] The build report contains one functional-label summary for selected and
      full builds.
- [x] Each dynamic-label summary keeps the complete occurrence count and at
      most five deterministic row-and-term samples.
- [x] Full builds retain bounded dynamic-label aggregates when per-entry
      conversion details are omitted.
- [x] Finding totals include unmapped functional-label findings without
      changing fatal-error behavior.
- [x] Every archive contains the complete fixed catalog and only the dynamic
      tag records encountered by that build.
- [x] Every term-bank definition-tag token resolves to exactly one emitted
      tag-bank record.
- [x] Tag-bank and term-bank files conform to the repository-supported Yomitan
      schemas.
- [x] The current full database produces zero dynamic tags after the fixed
      inventory is complete.
- [x] Repeated builds from identical source input produce equal semantic
      term-bank, tag-bank, inventory, and build-report content and ordering.
- [x] Existing selected-build report detail and full-build size controls
      remain intact.
- [x] Archive-level tests prove complete metadata, bounded reporting,
      deterministic output, and no dangling soft-link behavior regression.

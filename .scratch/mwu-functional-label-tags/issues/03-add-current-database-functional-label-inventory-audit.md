# 03 — Add the current-database functional-label inventory audit

**What to build:** Give maintainers a deterministic read-only command that
proves the current MWU database is fully covered by the reviewed fixed
functional-label catalog.

**Blocked by:** 02 — Emit the complete fixed functional-label tag bank.

**Status:** resolved 2026-08-13

- [x] The `inventory:functional-labels` command scans canonical owners through
      the production ownership model while opening the source database in
      read-only mode.
- [x] The command writes deterministic JSON evidence under the generated build
      output and does not modify the source database or dictionary archive.
- [x] Each inventory row includes the normalized label, occurrence count,
      canonical-owner kind counts, one deterministic row-and-term sample,
      mapping status, and resolved tags.
- [x] The current database reports exactly 98 real owned normalized labels,
      all mapped, with zero unmapped labels.
- [x] The false `noun,` label from the nested `homeotherm` undefined run-on is
      absent from the corrected inventory.
- [x] The command writes its complete report and exits with failure when any
      inventoried label lacks a fixed mapping.
- [x] Repeated runs against the same database produce equal semantic inventory
      content and ordering.
- [x] Focused tests cover complete coverage, incomplete coverage, owner-kind
      aggregation, deterministic sampling, and the failing exit contract.
- [x] Package documentation explains how to run the audit and how to interpret
      mapped and unmapped results.

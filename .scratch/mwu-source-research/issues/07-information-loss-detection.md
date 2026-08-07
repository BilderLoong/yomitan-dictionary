# 07 — Programmatic information-loss detection

**What to build:** A runnable way to prove no information is lost in
conversion — the conversion's coverage measurable and auditable per row, not
a matter of eyeballing examples.

**Blocked by:** None — can start immediately

**Status:** resolved — 2026-08-07 on `worktree-1`; runnable audit shipped as
`bun run coverage:audit` (`tests/coverage_audit.ts` + `src/pipeline/coverage.ts`).

- [x] Candidate approaches surveyed (e.g. DOM-coverage diffing between source
      article and rendered structured content, findings-based metrics)
- [x] A runnable check or report that flags dropped or unclassified content
      (the build already records findings; this makes coverage quantitative)
- [x] Baseline measurement produced on representative rows
- [x] Approach decision recorded (ADR if hard to reverse)

## Approach decision (2026-08-07)

Text-token coverage per converted record, combined with the build's existing
findings — no ADR needed (the metric is a report; reversing it is cheap).

- **Per-record token coverage**: the source owner HTML is normalized to text,
  the record's own term tokens are excluded (the term is the Yomitan row
  headword and is deliberately not repeated in content for phrase entries
  and same-spelling main entries), and the remaining unique source tokens
  are checked against the unique tokens of the rendered structured content
  (`renderedText` walks the content tree, space-joining node boundaries).
  Output: `build/coverage-report.json` with per-record coverage, missing
  tokens, finding kinds, planning-findings counts, and a flag list for
  records below 95%.
- **Findings-based metrics**: the report carries every planning finding kind
  count and each record's conversion-finding kinds; `unsupported-visible-subtree`
  and `definition-free-mean`/`cxl-ref-not-emitted` remain the exact
  dropped/unclassified signals.

## Baseline (2026-08-07, words: what, o, take, in, oh, turn, run)

- 202 records, mean token coverage **94.3%**, 64 records flagged below 95%.
- Remaining missing-token categories after the term exclusion (all
  explained, none a silent drop):
  - sense markers (`1a`, `2b`, `(1)`, `g`) — rendered by CSS list numbering,
    not text;
  - `First Known Use` lines (unit `first-known-use`, Ignore=true);
  - etymological syllabification-dot artifacts (`ur·rann·jan` tokenizes to
    `ur`, `rann`, `jan` in both sides, and one side can carry the un-dotted
    form);
  - adjacent-node spacing artifacts from the collapsed `details` bodies
    (space-joining reduced these from 105 to 64 flagged records);
  - homograph-prefix adjacency (`1turn` where a `sup` touches the anchor
    text) and ordinal/century fragments inside `First Known Use` text.
- Attribution spots checked on the `.sdsense`-sibling rows the presentation
  audit (04) flagged (`A post` 92, `a priori` 95, `abaft` 170, `turn`
  450356): every `.auth` sits inside an `.ex-sent` and the converted content
  carries the example-source units — no attribution loss found.
- The audit doubles as a regression canary: any future silent drop shows up
  as a new missing token with its record and row id.

## How to reproduce the baseline

From the package dir `packages/merriam_webster_unabridged`:

```
bun run coverage:audit --words what o take in oh turn run
```

Writes `build/coverage-report.json` (`totals`: records 202, meanCoverage ~0.9425, flaggedRecords 64). Per-record entries carry `term`, `rowId`, `findingKinds`, and `coverage {sourceTokenCount, renderedTokenCount, missingTokens, coverage}`.

- Perfect record to inspect: `no matter what` (rowId 464223 — the `what` row) → coverage 1.0, `missingTokens: []`.
- Flagged record to inspect: `take apart` (rowId 362180) → coverage ~0.96, missing tokens `["1","2","3a","b"]` — CSS-drawn sense numbers, not a real loss.
- Flagged record to inspect: `turn` (rowId 450356) → missing tokens are sense markers (`1a`, `2a`, …), `First Known Use` lines (unit `first-known-use`, Ignore=true), and syllabification-dot artifacts (`ur·rann·jan`).

Tool implementation: `src/pipeline/coverage.ts` (`textTokens`, `renderedText`, `computeTextCoverage`); runner `tests/coverage_audit.ts`; npm script `coverage:audit`.

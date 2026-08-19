# 01 — Build public release assets

**What to build:** A dictionary maintainer can run one explicit release build
with a release revision and converter commit. The command performs a
full-database build and produces a stable update archive, matching update
index, provenance-bearing build report, checksums, and provenance notes.
Selected and development builds remain outside the public update channel.

**Blocked by:** None — can start immediately

**Status:** completed

- [x] A release revision accepts `YYYY.MM.DD` and an optional positive `.N`
      same-day sequence, while rejecting bad padding, impossible dates, zero or
      padded sequences, and values outside this shape
- [x] Release revision validation does not depend on the current date, runner
      time, or timezone
- [x] The release build requires a full converter commit SHA and records it in
      release provenance
- [x] The release build always converts the full source database and does not
      accept selected words
- [x] The release build hashes the database bytes and rejects a checksum that
      does not match the source-data contract before conversion starts
- [x] The update archive is named `Merriam-Webster-Unabridged.zip`
- [x] The archive `index.json` and standalone
      `Merriam-Webster-Unabridged.index.json` contain equal data
- [x] The public index uses title `Merriam Webster Unabridged`, uses the release
      revision, is updatable, and contains the stable GitHub latest-release
      index and download URLs
- [x] Selected and development builds do not announce the public update channel
- [x] The public build report preserves full-build evidence and records the
      release revision, release tag, converter commit, source-data revision,
      database filename, and database SHA-256
- [x] `SHA256SUMS` covers the update archive, update index, and public build
      report with conventional lowercase SHA-256 lines
- [x] Provenance notes are generated from the same release and source
      inputs but is not listed as a public release asset
- [x] A temporary full source database test proves the complete release-build
      path without requiring the production database

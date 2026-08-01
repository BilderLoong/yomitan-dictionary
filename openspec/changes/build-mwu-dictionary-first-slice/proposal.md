## Why

The current MWU conversion path flattens dictionary HTML before its hierarchy and attached information can be represented faithfully, which risks silently omitting or misplacing source information. A small, importable dictionary built from representative words will let us validate the complete MWU-to-Yomitan path before attempting a full-database conversion.

## What Changes

- Introduce an immutable intermediate model that preserves MWU Levels 1–6, nearest-owner binding, source order, rich inline text, defined phrases, variants, and lookup-rule evidence.
- Parse the recognized information units cataloged by the MWU reconnaissance documents while explicitly classifying ignored units and reporting unrecognized visible content.
- Render the intermediate model as Yomitan structured content without using Yomitan's reading field for MWU pronunciation.
- Emit independently searchable entries for defined `.dro` phrases and their defined phrase-local alternatives while retaining each phrase in its parent entry.
- Apply the `v_phr` lookup rule only to canonical phrases supported by interposed-object evidence.
- Build and export an importable first-slice dictionary for `what`, `turn`, `take`, and `run`, together with a build report containing conversion statistics, every emitted `v_phr` candidate, unrecognized source findings, ignored-unit counts, and conversion errors.

## Capabilities

### New Capabilities

- `mwu-entry-conversion`: Parse an MWU HTML row into the approved level-aware model and render its recognized information units as Yomitan structured content.
- `mwu-dictionary-build`: Select source rows, assemble canonical and phrase term records, report unrecognized source content, and export a testable Yomitan dictionary ZIP.

### Modified Capabilities

None.

## Impact

- Affects `packages/merriam_webster_unabridged`, especially its source-row orchestration, parser, structured-content renderer, and tests.
- Reuses the existing SQLite, Cheerio, and `yomichan-dict-builder` dependencies; no new runtime dependency is expected.
- Adds a selected-word first-slice build path plus one structured JSON build report alongside the dictionary output.
- Does not process pronunciation audio, first-known-use data, entry-status artwork, or the full MWU database in this change.

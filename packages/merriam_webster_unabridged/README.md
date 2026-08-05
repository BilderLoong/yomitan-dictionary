# Merriam-Webster Unabridged selected-word dictionary

This package builds a Yomitan-compatible ZIP from the MWU SQLite source at
`assets/MWU.db`.

## Setup

```bash
pnpm install
```

## Build selected words

v1 requires explicit target words. A multiword target must be quoted when it
is passed as a shell argument:

```bash
bun run src/index.ts --words give in "take the word"
bun run src/index.ts --words-file words.txt
bun run src/index.ts --words give --words-file words.txt
```

The two input sources are combined in first-seen order. Boundary whitespace is
trimmed, blank file lines are ignored, and exact Unicode spellings are
deduplicated. The command does not read stdin or perform an implicit
full-database build.

Successful builds write:

- `build/Merriam Webster Unabridged.zip`
- `build/build-report.json`

The report records selected roots, source rows, dedicated dependencies,
ownership decisions, canonical entry plans, soft-link entry plans, source
evidence, findings, rejections, and fatal errors.

## v1 boundary

The first version implements selected-word Level 1 ownership and approved
`main-to-alternative-spelling-soft-link`, `vr-mean-alternate-soft-link`,
`phrase-alternate-soft-link`, and `bare-affix-soft-link` relationships. It emits
conservative readable definitions, deterministic reports, and schema-valid
Yomitan archives. The final six-level presentation model, full-database
coverage, pronunciation audio, and richer media rendering remain future work.

## Verification

Focused planner, conversion, assembly, report, integration, archive-schema,
and determinism tests are under `tests/`. The browser harness can import a
production ZIP with:

```bash
bun run tests/import_dict.ts \
  "build/Merriam Webster Unabridged.zip" \
  --query "what, take the word, in, o, il" \
  --close

bun run tests/import_dict.ts \
  "build/Merriam Webster Unabridged.zip" \
  --query-file tests/testWords.txt \
  --close
```

The harness accepts either one comma- or newline-delimited `--query` value or a
newline-delimited `--query-file`. The two options are mutually exclusive. If
neither is supplied, it uses `tests/testWords.txt`. It uses bundled Chromium
and checks that import progress completes, no import error is shown, and the
installed dictionary count increases.

## Origin data

The SQLite source is derived from the Merriam-Webster Unabridged 2024 MDX
release using [pyglossary](https://github.com/ilius/pyglossary). The source
license and download details are maintained with the project data.

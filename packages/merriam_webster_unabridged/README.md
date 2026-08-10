# Merriam-Webster Unabridged selected-word dictionary

This package builds a Yomitan-compatible ZIP from the MWU SQLite source at
`assets/MWU.db`.

End users: see [USER-MANUAL.md](USER-MANUAL.md) for how to read the entries —
including why definitions start with a colon (`: that which : those which`).

## Setup

```bash
pnpm install
```

## Yomitan test fixture

Tests that drive the real extension (`tests/inspect_dict.ts`,
`tests/archive/schema.test.ts`) need the Yomitan fixture — a Chrome-extension
build of upstream Yomitan with the schemas and browser harness — installed at
`tests/fixture/` (gitignored):

```bash
# main checkout: clone upstream, build the fixture, install it
bun run update:fixture

# pin a specific upstream release instead of the newest tag
bun run update:fixture --ref 26.7.29.0

# preview without touching anything
bun run update:fixture --dry-run
```

The same pass refreshes the vendored Yomitan structured-content renderer under
`tests/rendered/vendor/`, so the render-contract tests always exercise the
generator version the fixture ships.

### Worktrees

A worktree must not own a second fixture: running `update:fixture` inside any
worktree detects the checkout kind and links `tests/fixture` to the main
checkout's fixture instead of cloning and building:

```bash
git worktree add ../my-worktree master
cd ../my-worktree/packages/merriam_webster_unabridged
bun run update:fixture        # links to the main checkout fixture
```

If the main checkout has no fixture yet, the worktree run fails with an error
telling you to run `update:fixture` there first — a worktree can never silently
become the fixture owner. `--ref` is ignored in worktrees; the main checkout
owns the fixture version.

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

## Build the whole database

`--full` builds every row of the source database instead of selected words:

```bash
bun run src/index.ts --full
bun run build:full
```

`--full` cannot be combined with `--words` or `--words-file`. A full build
plans and converts all 470k source rows — expect it to take a long time and
to produce a large archive. The build report keeps the full-database shape
(roots, decisions, findings, errors, totals) but omits the per-entry detail
arrays (plans, conversions, soft-link entries) that would multiply the file
size; the terminal prints the final statistics (rows planned,
canonical entries, soft links, records, findings, errors, elapsed time,
archive size).

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
Yomitan archives. Canonical entries now use MWU-shaped structured content:
semantic headers, WTY-style POS tags, native nested sense lists, scoped labels,
highlighted targets, collapsed examples/origin/phrases, and visible
cross-reference text without MWU navigation URLs. Broader uncommon markup
coverage, pronunciation audio, and richer media rendering remain future
work.

## Production structured-content renderer

The renderer is pure and owner-local: Level 1 planning selects the canonical
`<mean>` first, then the converter maps only that HTML subtree. Source marker
paths such as `1 a (1)` become nested ordered lists; `.uns` remains beside its
own definition; each local `.vis` example group shows its first example and
collapses the remainder; `.dro` phrases become separately titled collapsed
sections in the parent entry; the origin section carries the etymology and
the First Known Use dateline; and audio controls are omitted by policy.
Unsupported visible elements are retained once as readable fallback text and
recorded as conversion findings.

The Yomitan reading field stays empty. MWU pronunciations remain visible in the
structured header, with `¦` normalized to `ˈ`; the canonical tuple's definition
tag carries the compact POS mapping (`pron`, `v`, `n`, `phrase`, and related
aliases), while sense-local labels remain inside structured content.

## Tests

```bash
bun test                       # full suite (root-safe: bunfig.toml prunes tests/fixture/**)
bunx biome check src tests
bun run update:render-fixtures # re-extract tests/rendered/fixtures/ from assets/MWU.db
bun run storybook              # visual review
bun run test-storybook         # the one interaction story, in headless Chromium
```

The render contract (per-entry, per-mean, collapsing, phrase, origin) is
asserted by the bun tests; storybook is visuals plus the native
details/summary toggle interaction.

## Verification

Focused planner, conversion, assembly, report, integration, archive-schema,
and determinism tests are under `tests/`. The browser harness can import a
production ZIP with:

```bash
bun run tests/inspect_dict.ts \
  "build/Merriam Webster Unabridged.zip" \
  --query "what, take the word, in, o, il" \
  --close

bun run tests/inspect_dict.ts \
  "build/Merriam Webster Unabridged.zip" \
  --query-file tests/testWords.txt \
  --close
```

The harness accepts either one comma- or newline-delimited `--query` value or a
newline-delimited `--query-file`. The two options are mutually exclusive. If
neither is supplied, it uses `tests/testWords.txt`. It uses bundled Chromium
and checks that import progress completes, no import error is shown, the
installed dictionary count increases, and each query produces a rendered
result. It also opens Yomitan's real search popup with the final query at a
360px viewport and checks the light and dark presentation for wrapping,
overflow, local-tag geometry, example list markers, and collapsed disclosures.
Use `--extension-path` when the ignored Yomitan fixture lives in a different
checkout, `--user-data-dir /path/to/profile` to point
the bundled Chromium at a specific profile (defaults to a fresh
`/tmp/test-user-data-dir` so your real Chrome profile is never touched), and
`--screenshot /tmp/mwu.png` to capture the rendered search page for visual
inspection.

## Origin data

The SQLite source is derived from the Merriam-Webster Unabridged 2024 MDX
release using [pyglossary](https://github.com/ilius/pyglossary). The source
license and download details are maintained with the project data.

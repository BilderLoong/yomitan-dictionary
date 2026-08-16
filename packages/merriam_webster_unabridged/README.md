# Merriam-Webster Unabridged selected-word dictionary

This package builds a Yomitan-compatible ZIP from the MWU SQLite source at
`assets/MWU.db`. The archive includes a complete fixed functional tag bank,
plus dynamic functional tags for source labels that are not yet in that fixed
catalog.

End users: see [USER-MANUAL.md](USER-MANUAL.md) for how to read the entries —
including why definitions start with a colon (`: that which : those which`).

## Setup

```bash
bun install
```

## Yomitan test fixture

Scripts that drive the real extension (`scripts/dictionary-inspection/`,
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

Every archive also contains `tag_bank_1.json`. It contains all reviewed fixed
functional tags, even when a selected build does not use every tag. An unknown
entry-level `.fl` label is kept in the term-bank definition tag field with a
leading `?` and is added to the tag bank only when encountered. For example,
`future label` becomes `?future_label`. The dictionary styles dynamic tags as
amber dashed chips. A selected-build report records each finding with its
source owner. A full-build report omits per-entry conversion details, but keeps
each dynamic label's total count and at most five deterministic source samples.

To audit the source vocabulary without exporting a dictionary, run:

```bash
bun run inventory:functional-labels
```

This writes `build/functional-label-inventory.json`. It scans the database
with the same owner-local rule used by conversion. The report contains every
normalized `.fl` value, owner-kind counts, deterministic sample rows, and any
unmapped value. The current source inventory contains 98 labels and no
unmapped values.

The report records selected roots, source rows, dedicated dependencies,
ownership decisions, canonical entry plans, soft-link entry plans, source
evidence, findings, rejections, and fatal errors.

## v1 boundary

The first version implements selected-word Level 1 ownership and the soft-link
relationships `main-to-alternative-spelling-soft-link`,
`vr-mean-alternate-soft-link`, `phrase-alternate-soft-link`,
`bare-affix-soft-link`, and `cxl-ref-soft-link`. Per ADR 0006,
`cxl-ref-soft-link` accepts every complete relation phrase as its rule,
inherits continuation relations (`or`, `and`, `or of`, `and of`) from the
nearest preceding complete relation, and drops routes whose target emits no
canonical entry with a `soft-link-target-not-emitted` report finding. It emits
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
structured header, with `¦` normalized to `ˈ`. The canonical tuple's
definition tag carries the fixed or dynamic functional-label mapping
(`pron`, `v`, `n`, `phrase`, and related atomic aliases). `termTags` stays
empty, and sense-local labels remain inside structured content.

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
# Targeted headless smoke check: requested entries on search and popup surfaces.
bun run inspect:dict:headless -- --query because --close

# Headless full E2E: eight words, both themes, search and popup surfaces,
# computed-layout checks, and keyboard disclosure interaction.
bun run inspect:dict:headless -- --query-file tests/testWords.txt --close

# Human visual review: open one real entry and leave the visible browser open.
bun run inspect:dict -- --query turn

# Visible smoke test with bounded cleanup.
bun run inspect:dict -- --query turn --close

# Package help exits before the build, browser launch, or profile creation.
bun run inspect:dict -- --help
bun run inspect:dict:headless -- --help

# Run a script directly against an existing ZIP, without rebuilding it.
bun run scripts/dictionary-inspection/inspect-headless.ts \
  "build/Merriam Webster Unabridged.zip" --query because --close

# Direct adapter help documents the required existing ZIP argument.
bun run scripts/dictionary-inspection/inspect-headless.ts --help

# Run exactly the eight presentation queries against an existing ZIP.
bun run inspect:dict:headless -- \
  --query "what, in, give, put, sum, down, turn, o" \
  --close

# Park a headless browser for live Chrome DevTools MCP control.
bun run inspect:dict:headless -- --mcp-port 9222
curl http://127.0.0.1:9222/json/version
```

The package commands build the selected real MWU records before starting the
inspector. Their `--help` and `-h` forms exit before `dev:build`, browser
launch, profile creation, or build-artifact mutation. The direct adapters under
`scripts/dictionary-inspection/` require an existing dictionary ZIP as their
first argument and do not build it.

The headless harness accepts either one comma- or newline-delimited `--query`
value or a newline-delimited `--query-file`. The two options are mutually
exclusive. If neither is supplied, it uses `tests/testWords.txt`. The visible
inspector accepts one query and defaults to `what`. Both workflows use bundled
Chromium, import the dictionary ZIP first, and import the settings backup
through Yomitan's real settings file input. The headless workflow also checks
that import progress completes, no import error is shown, the installed
dictionary count increases, every acceptance query produces a rendered result,
and the 360px popup passes the light/dark presentation and disclosure checks.
The visible workflow opens only the requested entry for human review.
Use `--extension-path` when the ignored Yomitan fixture lives in a different
checkout. By default, each run creates a unique temporary browser profile.
The runner removes that profile after a bounded `--close` run. An explicit
`--user-data-dir /path/to/profile` must be absent or empty; a non-empty or
symbolic-link path is refused and preserved. This protects an existing profile
from deletion and prevents settings from another run from contaminating the
inspection. Use `--screenshot /tmp/mwu.png` to capture the rendered search page
for visual inspection.

## Origin data

The SQLite source is derived from the Merriam-Webster Unabridged 2024 MDX
release using [pyglossary](https://github.com/ilius/pyglossary). The source
license and download details are maintained with the project data.

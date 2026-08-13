# Handoff — structured-content agent (branch `structure-content`)

You are an omp agent session launched in the worktree
`.worktrees/structure-content` (git branch `structure-content`). You are the
continuation of the plan-agent work on the **structured-content renderer** for
the Merriam-Webster Unabridged → Yomitan dictionary builder.

## Where you are

- Worktree root: `/Users/birudo/Projects/yomitan-dictionary/.worktrees/structure-content`
- Branch `structure-content` (master is merged in; the last merge brought the
  `src/build` → `src/pipeline` and `tests/build` → `tests/pipeline` renames
  plus the test-side dictionary importer → `scripts/dictionary-inspection/`
  and `test:dict` → `inspect:dict` / `inspect:dict:headless` renames).
- **Read `CONTEXT.md` in this worktree root first** — it is the shared project
  vocabulary (domain names like `main-canonical-entry`, `soft-link-entry`,
  `plan` vs `record` layers, functional-style rules, `Result<T,E>` errors,
  docs-first and test-first conventions).

## What exists (implemented baseline)

- **Structured-content renderer**: `packages/merriam_webster_unabridged/src/conversion/renderStructuredContent.ts`
  (+ `src/conversion/types.ts`, thin facade `convertCanonical.ts`).
  Level 1–6 structure: `mwu-entry` root; header (homograph, headword display,
  entry qualifier, pronunciation with `¦→ˈ`/ZWSP normalization, inflection
  group, `or il-` alternates); verb-subtype labels; nested sense `ol` lists
  (decimal → lower-alpha → decimal) with MWU marker inheritance; usage notes;
  example groups (1 visible + `N more examples` collapse); attributions;
  orange `target-highlight`; cross/comparison references; called-also;
  collapsed Origin/Synonym Discussion/phrase sections; flat standalone phrase
  records; WTY-style POS tags (`noun→n`, `transitive verb→v`, 128-value map).
- **Pipeline**: `src/pipeline/{cli,selection,report,runBuild}.ts`;
  tests in `tests/pipeline/`.
- **Tests**: 94 pass / 0 fail in this worktree (20 files). The `tests/archive/*`
  tests build from the real 3.4 GB `assets/MWU.db` — slow (~50 s sequential),
  timeouts are 90 s; they can exceed that under parallel `bun test` load.
- **E2E harness**: `inspect:dict` is the visible manual inspector and
  intentionally leaves its Playwright browser open unless `--close` is
  supplied. `inspect:dict:headless` owns the full desktop E2E sweep and can
  either close deterministically with `--close` or park on CDP port 9222 for
  MCP. The Chrome MCP was not available in this session because the Chrome
  extension/native host was absent, so no Chrome-page DOM or visual result is
  claimed here.
- **Docs**: `docs/mwu-level-1-entry-generation.md` (§ Structured-content
  rendering), `docs/mwu-html-survey/README.md`.

## Repo state notes

- `tests/fixture` is a **deliberate symlink** (to the main repo's fixture dir),
  intentionally untracked — leave it alone.
- The user-facing inspector is
  `packages/merriam_webster_unabridged/scripts/dictionary-inspection/inspect.ts`.
  It is intentionally manual. The headless adapter owns automated assertions
  and MCP parking; both adapters call the shared runner.
- `assets/MWU.db` is gitignored; in this worktree it is a symlink into the main
  repo so real-DB builds work.
- The main repo (master) and this branch are kept in sync by the user's
  explicit merge requests; do not merge this branch into master on your own.

## What comes next

The user will now tell you the improvements they want for the structured
content. Follow the project's conventions (docs-first, test-first, e2e
verification, functional style) and work entirely inside this worktree.

## 2026-08-06 source/render audit

The latest selected build used 42 requested roots and 11 dependency roots. It
produced 680 canonical entries, 115 soft-link entries, and 795 records with
zero build errors, zero conversion findings, and zero link rejections. The ten
planning findings were definition-free means, not conversion failures.

The all-candidate HTML survey found the following high-value source shapes:

- `.uro/.ure`: 14,845 rows. In `in` mean 3, the run-on `in–ness`, its
  pronunciation, POS, plural label, and `-es` marker are absent from output.
- `.prt-a`: 31,471 rows. Alternate-form readings are dropped: `sett` loses
  `ˈset`, and `gett` loses `ˈget`; primary inflection-group readings still
  render.
- `.if/.ix/.il`: 25,489 / 80,669 / 90,433 rows. Sense-local forms such as
  `turns`, `runs`, and `hands` are not emitted as inflection units; they are
  flattened or omitted depending on the owner path.
- `.mw_t_wi`: the selected owners contain 3,665 source target spans but only
  3,635 `target-highlight` units. Eight owners differ: seven under-render by
  31 spans (`in` ×5, `turned`, `take`/`taken` ×3, `used` ×3, `upped` ×2,
  `oohs, aahs`/`aahs`/`ahs`, and several `on the basis of`/`on a basis`
  fragments), while `up` mean 0 over-renders one `up` span; the net is 30
  fewer output units.
- `.prs/.pr`: the renderer wraps explanatory pronunciation prose as IPA. For
  `in`, source text such as `usually ᵊn after t` becomes
  `/usually ᵊn after t/` instead of remaining an inline pronunciation note.
- Phrase-local `.sl` labels are often visible but lose their semantic tag
  styling. Examples include `archaic`, `British`, `slang`, `of a blade`, and
  `of a whale`.

The renderer is already strong for nested sense hierarchy, WTY-style POS tags,
grammar labels, origin sections, related items, local inflection groups,
example collapse, attributions, and most target highlighting. The survey also
records deferred or partially recognized units that should not be silently
treated as complete: `.cxl-ref/.cxn`, `.see-in-addition`, `.urefs/.ur`,
`.utxt`, `.mw_t_phrase/.mw_t_gloss`, `.psl`, `.ri`, and media/table classes.
`.entry-status` and pronunciation audio are intentionally excluded from this
dictionary slice.

Recommended implementation order for the next slice: run-on ownership and
rendering, alternate-form pronunciation, sense-local inflection units,
pronunciation-note boundaries, then the remaining target and phrase-label
ownership cases. Keep `inspect:dict` manual; add focused fixtures/tests beside
the renderer for each source shape.

## 2026-08-06 structured-content implementation update

The approved slice is now implemented in the renderer and documented in the
shared catalog and generation guide:

- `.uro` derivatives render under the parent as one `undefined-run-on` with
  `run-on-form`, `form-pronunciation`, `part-of-speech`, local inflection
  labels, and markers. They do not create records or soft links.
- Pronunciation readings and explanatory notes are separate units. Reading
  fragments receive delimiters; ambiguous explanatory text remains raw and
  outside those delimiters.
- Sense-local forms and labels stay in one definition flow. `.sls` remains a
  source-block boundary, and local labels remain structured content rather
  than global tag-bank metadata.
- Usage-discussion pointers preserve their visible source text but discard
  internal navigation targets and emit no clickable cross-reference.
- Synonym Discussion is parsed into one collapsed related disclosure with an
  introductory term group, introduction, one entry per compared term, local
  example collapse, target highlights, and a separate see-in-addition line.

The focused conversion suite now passes 32 tests and 220 assertions. The
broader conversion/level-1/pipeline/source/Yomitan suite passes 82 tests and
337 assertions. A selected real-DB build for six roots produces 148 records
with zero build errors and zero conversion findings; a real `take` build
produces 93 records with the same zero-error/finding result. Source/output
target-highlight counts align for the representative `what`, `in`, `turn`, and
`run` owners after handling nested example groups and direct usage-wrapper
examples. The new CSS keeps the output text-led and MWU/Wty-like: restrained
separators, local indentation, readable term headings, responsive wrapping,
and no card grid.

At the time of this audit, the connected Chrome MCP did not expose a Chrome
browser and the shared Playwright fixture path was a symlink loop. The
production archive and structured-content tests were still validated locally;
neither the manual inspector nor its fixture was modified to work around that
blocker. The later 2026-08-07 local bundled-Chromium gate is recorded below.

## 2026-08-07 Synonym Discussion inline-flow update

The Synonym Discussion slice now follows the source relationship rather than
promoting every `mw_t_sc` anchor into a new entry. The source is a flat stream,
so the renderer uses the evidence around adjacent anchors to identify a real
entry boundary:

- an entry head is rendered as a local `synonym-term` unit;
- an embedded term in that entry's prose is rendered as a non-clickable
  `cross-reference` unit;
- the head term and its explanation share one inline `span`, so the displayed
  result reads like MWU: `twirl adds to the ideas of spin and whirl ...`;
- examples and attributions remain owned by the entry, with the existing one
  visible example plus collapsed extras behavior;
- the related disclosure remains collapsed by default and keeps the separate
  “see in addition” line.

This fixes the earlier split where `spin` and `whirl` inside the `twirl`
description, or `eddy` inside the `swirl` description, were mistaken for new
synonym entries. A real `turn` conversion now produces the ordered heads
`revolve`, `rotate`, `gyrate`, `circle`, `spin`, `twirl`, `whirl`, `wheel`,
`eddy`, `swirl`, and `pirouette`; `twirl` owns `spin` as an inline reference and
`swirl` owns `eddy` as an inline reference.

Verification for this slice:

- focused and broader structured-content suites: 84 passing tests and 356
  assertions;
- archive/schema suite: 5 passing tests and 20 assertions;
- selected real-DB build: 148 records, zero build errors, zero conversion
  findings, and one known planning finding for the definition-free `O → oh`
  row;
- local bundled-Chromium import and style E2E: both passed, including
  `ALL E2E STYLE ASSERTIONS PASSED`.

Chrome MCP was checked separately but exposed only the Codex In-app Browser in
this session, so no Chrome-specific DOM or screenshot claim is made. The
inspection workflow now has a visible `inspect:dict` adapter and a headless
`inspect:dict:headless` adapter over one shared runner.

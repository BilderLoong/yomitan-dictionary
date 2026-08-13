# 05 — Split human and agent dictionary inspection workflows

**What to build:** Dictionary maintainers and agents can inspect the same real
MWU build through purpose-specific commands. A visible inspector supports
human review. A headless inspector supports deterministic E2E checks and MCP
control without opening a browser window. Both commands share the same
Yomitan setup, real dictionary import, and premade settings import workflow.

**Blocked by:** None — can start immediately

**Status:** completed

- [x] Move the operational dictionary inspector out of the test directory and
      remove the obsolete entry path instead of leaving a compatibility wrapper
- [x] Keep one shared inspection module for Chromium launch, Yomitan extension
      setup, real dictionary ZIP import, premade settings import, query opening,
      and browser cleanup
- [x] Provide a visible `inspect:dict` command for human review that opens the
      requested entry and remains available until the maintainer stops it
- [x] Provide a headless `inspect:dict:headless` command for agent E2E and MCP
      work without opening a desktop browser window
- [x] Preserve deterministic headless verification with `--close` and preserve
      a parked CDP session when MCP control is requested without `--close`
- [x] Import the real dictionary ZIP before importing one repository-owned,
      valid Yomitan settings backup through Yomitan's settings file input
- [x] Make the premade settings select English, apply the recommended English
      lookup behavior, and disable the part-of-speech filter for Merriam Webster
      Unabridged without manual setup clicks
- [x] Verify the imported dictionary count, importer error state, active
      language, recommended English behavior, dictionary presence, and disabled
      part-of-speech filter before opening acceptance queries
- [x] Preserve the current eight representative acceptance words, search and
      popup surfaces, light and dark themes, desktop viewports, computed-layout
      checks, collapsed disclosure checks, and keyboard disclosure interaction
- [x] Keep CLI option parsing as a tested script module and use clear help text
      for query, query-file, extension, profile, MCP port, screenshot, and close
      options
- [x] Replace the narrow `chrome-mcp-inspect-dict` skill with one model-invoked
      build-dictionary inspection skill that triggers when an agent is asked to
      build, use, inspect, view, see, E2E-test, or check the built MWU dictionary
- [x] Make the skill route agents to the visible command for human visual review,
      the headless command for automated checks, and the parked headless command
      plus CDP evidence for live MCP inspection
- [x] Include concrete skill examples and focused trigger test cases for a
      headless E2E request, a human visual-review request, and a live MCP request
- [x] Update package scripts and repository documentation so every documented
      path and example uses the new commands and script locations
- [x] Preserve all existing uncommitted MWU UI work and avoid unrelated changes,
      staging, commits, and mobile adaptation

## Reopened CLI correction

- [x] Add one shared package launcher that handles package help before the
      build and forwards non-help options to the existing ZIP-based adapters
- [x] Separate package usage text from direct script usage text
- [x] Report the correct visible result for bounded `--close` runs
- [x] Add package-command help and bounded-status tests, then update the
      README, skill, and completion evidence

## Reopened strict TypeScript correction

- [x] Remove strict TypeScript errors from the new inspection test without
      broad casts or type-checker suppression
- [x] Determine from the renderer diff whether the line-2003 errors were
      introduced by the current UI work, and fix them only if they were
- [x] Re-run the focused, full-package, formatting, and strict typecheck gates
      and record exact baseline-separated evidence

## Verification

- CLI option unit tests pass from the package and from the repository root.
- The real selected-word archive is built from `MWU.db` and imported into the
  real Yomitan extension fixture with no importer error.
- The premade settings file is imported by Yomitan's real settings-import flow,
  and browser-side checks prove that every required setting is active.
- `inspect:dict:headless --close` completes the existing 32-state desktop sweep
  and keyboard disclosure check, exits successfully, and leaves no parked
  browser process.
- A headless run with an MCP port stays available, exposes a working CDP version
  endpoint, and permits a live query or disclosure action before cleanup.
- The visible command opens one requested real entry in headed Chromium and can
  be stopped cleanly after the smoke check.
- The new skill has one clear trigger description and no competing obsolete
  dictionary-inspection skill remains.

## Completion evidence

- Package and repository-root focused option/settings tests passed: 22 passed,
  0 failed in each invocation.
- The isolated strict typecheck for the four inspection TypeScript files plus
  `package-entry.ts` passed with zero errors. Biome, skill-schema validation,
  and `git diff --check` also passed.
- `bun run inspect:dict:headless -- --close` built 377 real records and passed
  all 32 desktop states plus keyboard disclosure; it exited successfully.
- `bun run inspect:dict -- --help` and
  `bun run inspect:dict:headless -- --help` both printed package usage without
  a `dev:build` line or a `Built ...` line. The same was verified for `-h`,
  with unchanged build-artifact timestamps and no created profile.
- Direct adapter help now documents
  `bun run scripts/dictionary-inspection/inspect-headless.ts <dictionary.zip>
  [options]`. A pure status test confirms bounded visible runs report
  completion and do not claim that the browser remains open.
- MCP launch command: `bun run inspect:dict:headless -- --mcp-port 9222`.
  `http://127.0.0.1:9222/json/version` returned Chrome 151 and protocol 1.3.
  A live CDP action on `search.html?query=turn` clicked the first disclosure,
  changing `beforeOpen: false` to `afterOpen: true` with label `4 more examples`.
- The final replacement parked-session cleanup stopped the runner and all
  inspection browser processes, closed port 9222, and removed its owned
  profile/settings directories (`MEGYbK` and `mU45Fc`). The earlier invalid
  wrapper leftovers (`SKB1Dm` and `gJDMrE`) were moved to
  `/Users/birudo/.Trash`; no explicit profile was deleted.
- The visible adapter was not launched by the agent because of the user's
  no-popup rule. Its help and option contract are covered by focused tests.
- Strict compilation of `tests/dictionary_inspection_options.test.ts` and its
  imported dependencies passed with zero errors after narrowing every piped
  `Bun.spawn` stream before constructing a `Response`. No cast or type-checker
  suppression was added.
- The five inspection production files passed their isolated strict typecheck
  with zero errors. Focused tests passed 22/22 from both the package and the
  repository root. The full package suite passed 208/208 with 2,104
  expectations.
- The package project typecheck no longer reports the new inspection test. Its
  two `renderStructuredContent.ts:2003` errors are baseline: the exact unsafe
  `isSynonymEntryBoundary` indexing exists in `HEAD`, and the current renderer
  diff does not modify that function. The baseline renderer code was preserved.
- Biome and `git diff --check` passed. The headless browser gate was not rerun
  because this correction changed only the test helper and ticket evidence;
  production behavior did not change.

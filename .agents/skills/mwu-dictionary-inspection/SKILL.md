---
name: mwu-dictionary-inspection
description: Always use this when you want to inspect the build dict or e2e test.
---

# MWU dictionary inspection

Use the real selected-word build and the real Yomitan extension fixture as the
source of truth. Do not replace the browser workflow with a static HTML page or
a hand-written fixture when the request is about the built dictionary. You should always use headless mode, when what you do is not involving big daddy, otherwise you disrupt him.

## Choose the workflow

Run commands from `packages/merriam_webster_unabridged`.

| Request                                    | Command                                            | Result                                                                                                                                  |
| ------------------------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Human visual review or “show me the entry” | `bun run inspect:dict -- --query turn`             | Headed Chromium opens one entry and stays open; add `--close` for a bounded smoke test.                                                 |
| Automated E2E or deterministic check       | `bun run inspect:dict:headless -- --close`         | Headless Chromium checks all eight acceptance words, both themes, both desktop surfaces, and keyboard disclosure behavior, then closes. |
| Live MCP inspection                        | `bun run inspect:dict:headless -- --mcp-port 9222` | Headless Chromium stays parked on CDP port `9222` for MCP control.                                                                      |

The package commands build the selected real MWU records before starting the
inspector. Their `--help` and `-h` forms are handled before `dev:build`, browser
launch, profile creation, or build-artifact mutation. To run a script against
an existing ZIP, use the script path under `scripts/dictionary-inspection/` and
pass the ZIP as the first argument.

Examples:

```bash
# Human review of one real entry.
bun run inspect:dict -- --query turn

# Agent E2E gate. --close is required for deterministic cleanup.
bun run inspect:dict:headless -- --close

# Package help does not build the dictionary.
bun run inspect:dict -- --help
bun run inspect:dict:headless -- -h

# Direct adapter help and direct existing-ZIP execution.
bun run scripts/dictionary-inspection/inspect-headless.ts --help
bun run scripts/dictionary-inspection/inspect-headless.ts \
  "build/Merriam Webster Unabridged.zip" --close

# Park a headless browser for MCP. The port is opt-in.
bun run inspect:dict:headless -- --mcp-port 9222
curl http://127.0.0.1:9222/json/version
```

## What the shared runner does

Both adapters call the shared runner in
`packages/merriam_webster_unabridged/scripts/dictionary-inspection/run.ts`.
The runner performs these steps in order:

1. Use the package command to build the selected real MWU dictionary ZIP, or
   pass an existing ZIP to the script.
2. Start a clean Chromium profile with the Yomitan extension fixture.
3. Import the dictionary ZIP through Yomitan's real dictionary file input.
4. Open Yomitan Settings and import
   a temporary copy of
   `scripts/dictionary-inspection/yomitan-inspection-settings.json` through the
   real `#settings-import-file` input with Playwright `setInputFiles`. The
   temporary copy contains the exact `styles.css` extracted from the ZIP used
   in this run, so a stale checked-in stylesheet cannot make the E2E pass.
5. Verify the dictionary count, importer error state, English language,
   recommended English lookup settings, dictionary presence, and disabled MWU
   part-of-speech filter.
6. Open the requested entry or run the full real-Yomitan acceptance sweep.

The runner creates a unique temporary browser profile by default. It removes
that profile after a bounded `--close` run. An explicit `--user-data-dir` must
be absent or empty; non-empty and symbolic-link paths are refused and left
unchanged.

The settings file is a Yomitan backup envelope with `version`, `options`,
profiles, and current Yomitan option fields. It is not a custom profile
format. The dictionary ZIP and settings backup are separate because a settings
backup does not contain dictionary records.

## MCP control

Use the parked headless command with `--mcp-port 9222` when the request
requires live browser control. A normal `--close` E2E run does not reserve a
CDP port.
The project MCP configuration attaches `chrome-devtools-mcp` to:

```text
http://127.0.0.1:9222
```

First prove that the browser is available:

```bash
curl http://127.0.0.1:9222/json/version
```

Then use the configured `chrome-devtools-gate` MCP. Navigate to a Yomitan
search page when needed:

```text
chrome-extension://mlbjoknafgaddicpadejdmfnimmacble/search.html?query=turn
```

Use a live page action, such as navigating to `turn`, taking a snapshot, or
opening an example disclosure. Do not claim MCP control from the CDP endpoint
alone.

Do not use `--close` until all MCP actions are complete. Use `--close` after
the live inspection to close the browser. If a parked run is interrupted,
confirm that port `9222` is no longer listening before starting another run.

## Guardrails

- Do not write directly to `chrome.storage.local`.
- Do not click the operating-system file chooser. Use Playwright
  `setInputFiles` on Yomitan's real file input.
- Import the dictionary before importing the settings backup.
- Keep the eight acceptance words: `what`, `in`, `give`, `put`, `sum`, `down`,
  `turn`, and `o`.
- Keep the 1100px search-page and 360px popup desktop checks, light and dark
  themes, computed-layout assertions, collapsed disclosures, and keyboard
  `Enter` interaction.
- Do not add mobile or touch adaptation to this inspection workflow.
- Keep operational files under `scripts/dictionary-inspection/`; keep only
  parser unit tests under `tests/`.

## Troubleshooting

If the fixture is missing or its manifest cannot be read, repair the fixture
with `bun run update:fixture` in the owning checkout before diagnosing the
dictionary or renderer. A worktree uses the main checkout's fixture.

If a deterministic run does not exit, check that `--close` was supplied. For a
visible smoke test, pass `--close` so the browser has a bounded cleanup path.
If a live MCP run cannot attach, check the CDP endpoint and the configured port
before changing selectors or dictionary data.

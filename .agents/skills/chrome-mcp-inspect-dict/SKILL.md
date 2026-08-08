---
name: chrome-mcp-inspect-dict
description: Use the chrome-devtools MCP with the inspect:dict browser in this repo (Yomitan with the Merriam Webster Unabridged dictionary imported). Use when driving the inspect:dict browser through MCP tools, attaching the MCP to port 9222, or debugging the inspect:dict/MCP setup.
---

# Chrome MCP with inspect:dict

## Setup

1. From `packages/merriam_webster_unabridged`: `bun run inspect:dict`
   - Builds a fresh test zip, launches Chrome (must be ≥ 149, currently 151 via Playwright 1.62.1) with the Yomitan fixture, auto-imports the dictionary, disables the part-of-speech filter, and parks on port `9222`.
2. The MCP server `chrome-devtools-gate` is configured in the project's `.omp/mcp.json` (attach mode: `--browserUrl http://127.0.0.1:9222 --isolated=false --categoryExtensions=false --experimentalIncludeAllPages`). It loads only when the session's working directory is inside this repo checkout (project config is keyed to the exact session cwd). Run `/mcp reload` after editing that file.

## Use

- `list_pages` only shows `about:blank` — extension pages are not listed. Navigate by URL instead:
  - `new_page` / `navigate_page` → `chrome-extension://mlbjoknafgaddicpadejdmfnimmacble/search.html?query=<word>`
  - Then `take_snapshot` or `evaluate_script` to inspect entries.
- Do NOT use `install_extension` / file upload — the gate already imported the dictionary.

## Troubleshooting

- `list_pages` empty or tools fail: the gate is not parked (port 9222 must be listening — check `curl http://127.0.0.1:9222/json/version`).
- Only one gate at a time: the gate uses a fixed profile (`/tmp/test-user-data-dir`) and port. A second gate needs `--user-data-dir <path> --chrome-flag "--remote-debugging-port=<port>"` on `bun run tests/inspect_dict.ts ...`.
- Attach requires Chrome 149+; chrome-devtools-mcp 1.6.0 cannot attach to older Chromium.
- Cleanup: stop the parked gate (`pkill -f "test-user-data-dir"`).

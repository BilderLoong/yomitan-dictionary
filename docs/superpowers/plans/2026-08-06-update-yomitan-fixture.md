# Update Yomitan Fixture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale Yomitan 25.3.3.0 extension fixture at `tests/fixture/yomitan-chrome-playwright` with the newest upstream release build, via a repeatable, fail-closed automation script.

**Architecture:** A bun CLI script `tests/update-fixture.ts` maintains a gitignored source cache (`tests/fixture/yomitan-src`) of the upstream `yomidevs/yomitan` repo, resolves the newest numeric release tag by default (`--ref` overrides with any branch/tag/commit), builds the `chrome-dev` extension variant with the upstream's own build (`node dev/bin/build.js --target chrome-dev --version <tag>`), verifies the produced zip, swaps it into the fixture directory atomically via a staging dir, and writes a provenance sidecar (`tests/fixture/UPSTREAM.json`). The fixture itself stays gitignored (dev-local, by existing design); the script is the single documented way to refresh it.

**Tech Stack:** Bun (script runtime + `Bun.spawn`), git (clone/fetch/checkout/tag resolution), npm + Node >= 22 (upstream build; machine has v22.23.1), `unzip` (macOS built-in). Existing consumers: `scripts/dictionary-inspection/` (Playwright E2E) and `tests/archive/schema.test.ts` (imports the fixture's `lib/validate-schemas.js`).

---

## Current state (verified 2026-08-06)

| Item | Value |
|---|---|
| Fixture version | `Yomitan Popup Dictionary (development build) 25.3.3.0` (Mar 2025 era) |
| Upstream repo | `https://github.com/yomidevs/yomitan.git` |
| Latest upstream tag | `26.7.29.0` (2026-07-29) |
| Fixture provenance | A copy of the upstream `ext/` build output (`builds/yomitan-chrome-dev.zip`); **no `.git` of its own**; `tests/fixture/` is gitignored (`fixture/` pattern in `packages/merriam_webster_unabridged/.gitignore`) |
| Build pipeline | `npm ci` then `npm run build -- --target chrome-dev --version <x.y.z.w>` → `builds/yomitan-chrome-dev.zip`; upstream's own dev default version is `0.0.0.0`, so the script stamps the release tag's version when building a tag (matches how the old 25.3.3.0 fixture was stamped) |
| Node | `v22.23.1` at `~/.local/bin/node` (upstream `engines.node >= 22.0.0`) |

Risks (handled in Tasks 3-4): Yomitan 26.x may have changed the term-bank schema (our `schema.test.ts` gate) or the extension UI (our e2e gate). The script supports `--ref 25.3.3.0` for rollback (which also restores the old version stamp).

**Decisions (user-approved 2026-08-06):** default ref = newest numeric release tag; execution = subagent-driven.

---

### Task 1: Write the fixture updater script

**Files:**
- Create: `packages/merriam_webster_unabridged/tests/update-fixture.ts`

- [ ] **Step 1: Write `tests/update-fixture.ts`**

```ts
import { mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Result } from "../src/shared/result";

const UPSTREAM_REPO = "https://github.com/yomidevs/yomitan.git";
const VERSION_PATTERN = /^\d+\.\d+\.\d+(\.\d+)?$/u;

export interface FixtureOptions {
  readonly ref: string;
  readonly cacheDir: string;
  readonly dryRun: boolean;
}

export interface FixtureArgumentError {
  readonly kind: "usage";
  readonly message: string;
}

interface ParsedOptions {
  readonly ref: string;
  readonly cacheDir: string | null;
  readonly dryRun: boolean;
}

const usage =
  "Usage: bun run tests/update-fixture.ts [--ref <git-ref>] [--cache <dir>] [--dry-run]\n" +
  "  --ref defaults to latest: the newest numeric release tag of yomidevs/yomitan";

const parseOptions = (
  argumentsList: readonly string[],
  index: number,
  options: ParsedOptions,
): Result<ParsedOptions, FixtureArgumentError> => {
  const argument = argumentsList[index];
  if (argument === undefined) return { ok: true, value: options };

  if (argument === "--dry-run") {
    return parseOptions(argumentsList, index + 1, { ...options, dryRun: true });
  }

  if (argument !== "--ref" && argument !== "--cache") {
    return {
      ok: false,
      error: {
        kind: "usage",
        message: `Unknown option: ${argument}\n${usage}`,
      },
    };
  }

  const value = argumentsList[index + 1];
  if (value === undefined || value.length === 0) {
    return {
      ok: false,
      error: {
        kind: "usage",
        message: `Missing value for ${argument}\n${usage}`,
      },
    };
  }

  return parseOptions(
    argumentsList,
    index + 2,
    argument === "--ref"
      ? { ...options, ref: value }
      : { ...options, cacheDir: value },
  );
};

export const parseFixtureArguments = (
  argumentsList: readonly string[],
): Result<FixtureOptions, FixtureArgumentError> => {
  const parsed = parseOptions(argumentsList, 0, {
    ref: "latest",
    cacheDir: null,
    dryRun: false,
  });
  if (!parsed.ok) return parsed;
  const fixtureRoot = path.resolve(import.meta.dirname, "fixture");
  return {
    ok: true,
    value: {
      ref: parsed.value.ref,
      cacheDir: path.resolve(
        parsed.value.cacheDir ?? path.join(fixtureRoot, "yomitan-src"),
      ),
      dryRun: parsed.value.dryRun,
    },
  };
};

const run = async (
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<Result<string, string>> => {
  let process: Bun.Subprocess<"ignore", "pipe", "pipe">;
  try {
    process = Bun.spawn([command, ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (error) {
    return {
      ok: false,
      error: `Failed to start ${command}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const exitCode = await process.exited;
  const stdout = await new Response(process.stdout).text();
  const stderr = await new Response(process.stderr).text();
  return exitCode === 0
    ? { ok: true, value: stdout }
    : { ok: false, error: stderr.trim() || stdout.trim() };
};

const prepareCache = async (
  cacheDir: string,
): Promise<Result<string, string>> => {
  try {
    await stat(path.join(cacheDir, ".git"));
    return { ok: true, value: cacheDir };
  } catch {
    // not a clone yet; never delete a user-supplied directory — only clone
    // into a missing or empty one (a killed clone fails with a clear message)
  }

  let entries: string[] = [];
  try {
    entries = await readdir(cacheDir);
  } catch {
    // cacheDir does not exist; git clone will create it
  }
  if (entries.length > 0) {
    return {
      ok: false,
      error: `Cache directory exists and is not empty: ${cacheDir}\nRemove it manually or pass a different --cache path`,
    };
  }

  await mkdir(path.dirname(cacheDir), { recursive: true });
  const clone = await run(
    "git",
    ["clone", "--filter=blob:none", "--no-checkout", UPSTREAM_REPO, cacheDir],
    path.dirname(cacheDir),
  );
  if (!clone.ok) return clone;
  return { ok: true, value: cacheDir };
};

const resolveRef = async (
  ref: string,
  cacheDir: string,
): Promise<Result<string, string>> => {
  if (ref !== "latest") {
    const fetchRef = await run("git", ["fetch", "origin", ref], cacheDir);
    if (!fetchRef.ok) return fetchRef;
    return { ok: true, value: "FETCH_HEAD" };
  }

  const fetchTags = await run("git", ["fetch", "--tags", "origin"], cacheDir);
  if (!fetchTags.ok) return fetchTags;
  const tagList = await run(
    "git",
    ["tag", "--list", "--sort=-v:refname"],
    cacheDir,
  );
  if (!tagList.ok) return tagList;
  const latestTag = tagList.value
    .split("\n")
    .map((name: string): string => name.trim())
    .find((name: string): boolean => VERSION_PATTERN.test(name));
  if (latestTag === undefined) {
    return {
      ok: false,
      error: "No numeric release tags found on upstream yomidevs/yomitan",
    };
  }
  return { ok: true, value: latestTag };
};

const main = async (): Promise<number> => {
  const optionsResult = parseFixtureArguments(process.argv.slice(2));
  if (!optionsResult.ok) {
    console.error(optionsResult.error.message);
    return 1;
  }
  const { ref, cacheDir, dryRun } = optionsResult.value;
  const fixtureDir = path.resolve(
    import.meta.dirname,
    "fixture/yomitan-chrome-playwright",
  );
  const provenancePath = path.resolve(
    import.meta.dirname,
    "fixture/UPSTREAM.json",
  );
  const provenanceTmpPath = `${provenancePath}.tmp`;
  const stagingDir = path.resolve(
    import.meta.dirname,
    "fixture/.yomitan-staging",
  );

  const cacheReady = await prepareCache(cacheDir);
  if (!cacheReady.ok) {
    console.error(`Failed to prepare source cache: ${cacheReady.error}`);
    return 1;
  }

  const resolvedRef = await resolveRef(ref, cacheDir);
  if (!resolvedRef.ok) {
    console.error(`Failed to resolve ${ref}: ${resolvedRef.error}`);
    return 1;
  }

  const checkout = await run(
    "git",
    ["checkout", "--detach", resolvedRef.value],
    cacheDir,
  );
  if (!checkout.ok) {
    console.error(`Failed to check out ${ref}: ${checkout.error}`);
    return 1;
  }

  const commitResult = await run("git", ["rev-parse", "HEAD"], cacheDir);
  if (!commitResult.ok) {
    console.error(`Failed to read commit: ${commitResult.error}`);
    return 1;
  }
  const commit = commitResult.value.trim();

  const resolvedLabel =
    resolvedRef.value === "FETCH_HEAD" ? ref : resolvedRef.value;

  const version = VERSION_PATTERN.test(ref)
    ? ref
    : VERSION_PATTERN.test(resolvedRef.value)
      ? resolvedRef.value
      : "0.0.0.0";

  const install = await run("npm", ["ci"], cacheDir);
  if (!install.ok) {
    console.error(`npm ci failed: ${install.error}`);
    return 1;
  }
  const build = await run(
    "npm",
    ["run", "build", "--", "--target", "chrome-dev", "--version", version],
    cacheDir,
  );
  if (!build.ok) {
    console.error(`Yomitan build failed: ${build.error}`);
    return 1;
  }

  const zipPath = path.join(cacheDir, "builds/yomitan-chrome-dev.zip");
  const zipListing = await run("unzip", ["-Z1", zipPath], cacheDir);
  if (!zipListing.ok) {
    console.error(`Cannot list build zip: ${zipListing.error}`);
    return 1;
  }
  const zipEntries = new Set(
    zipListing.value
      .split("\n")
      .map((entry: string): string => entry.trim())
      .filter((entry: string): boolean => entry.length > 0),
  );
  for (const required of ["manifest.json", "lib/validate-schemas.js"]) {
    if (!zipEntries.has(required)) {
      console.error(`Build zip is missing ${required}; refusing to install`);
      return 1;
    }
  }

  const manifestOutput = await run(
    "unzip",
    ["-p", zipPath, "manifest.json"],
    cacheDir,
  );
  if (!manifestOutput.ok) {
    console.error(
      `Cannot read manifest from build zip: ${manifestOutput.error}`,
    );
    return 1;
  }
  let manifest: { readonly name?: string; readonly version?: string };
  try {
    const parsed: unknown = JSON.parse(manifestOutput.value);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      console.error(
        "Cannot parse manifest from build zip: expected a JSON object",
      );
      return 1;
    }
    const record = parsed as Record<string, unknown>;
    manifest = {
      name: typeof record.name === "string" ? record.name : undefined,
      version: typeof record.version === "string" ? record.version : undefined,
    };
  } catch {
    console.error("Cannot parse manifest from build zip");
    return 1;
  }

  const provenance = {
    ref,
    resolvedRef: resolvedLabel,
    commit,
    version: manifest.version ?? version,
    extensionName: manifest.name ?? "unknown",
    builtAt: new Date().toISOString(),
    fixtureDir: "tests/fixture/yomitan-chrome-playwright",
    sourceCache: cacheDir,
  };

  if (dryRun) {
    console.log(
      `[dry-run] ref=${ref} resolved=${resolvedLabel} commit=${commit.slice(0, 12)} name=${provenance.extensionName} version=${provenance.version}`,
    );
    console.log(`[dry-run] would replace ${fixtureDir} with ${zipPath}`);
    console.log(JSON.stringify(provenance, null, 2));
    return 0;
  }

  try {
    await mkdir(path.dirname(stagingDir), { recursive: true });
    await rm(stagingDir, { recursive: true, force: true });
    const extract = await run(
      "unzip",
      ["-q", zipPath, "-d", stagingDir],
      path.dirname(stagingDir),
    );
    if (!extract.ok) {
      console.error(`Failed to extract build zip: ${extract.error}`);
      return 1;
    }
    await writeFile(
      provenanceTmpPath,
      `${JSON.stringify(provenance, null, 2)}\n`,
    );
    await rm(fixtureDir, { recursive: true, force: true });
    await rename(stagingDir, fixtureDir);
    await rename(provenanceTmpPath, provenancePath);
  } catch (error) {
    console.error(
      `Failed to install fixture: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }

  console.log(
    `Fixture updated: ${provenance.extensionName} ${provenance.version} (${commit.slice(0, 12)}, resolved ${resolvedLabel})`,
  );
  console.log(`Provenance: ${provenancePath}`);
  return 0;
};

const exitCode = await main();
process.exit(exitCode);
```

- [ ] **Step 2: Verify the usage-error path (fail-closed smoke)**

Run: `cd packages/merriam_webster_unabridged && bun run tests/update-fixture.ts --bogus`
Expected: exit code 1, stderr contains `Unknown option: --bogus` and the usage line. No files touched.

- [ ] **Step 3: Commit**

```bash
git add packages/merriam_webster_unabridged/tests/update-fixture.ts
git commit -m "feat(mwu): add fixture updater script for yomitan extension"
```

---

### Task 2: Update the fixture to the newest upstream release

**Files:** (all gitignored — expected: no git diff from this task)
- Replace: `packages/merriam_webster_unabridged/tests/fixture/yomitan-chrome-playwright/**`
- Create: `packages/merriam_webster_unabridged/tests/fixture/UPSTREAM.json`
- Create: `packages/merriam_webster_unabridged/tests/fixture/yomitan-src/**` (source cache)

- [ ] **Step 1: Run the updater (default `latest` = newest release tag)**

Run: `cd packages/merriam_webster_unabridged && bun run tests/update-fixture.ts`
Expected: exit 0; final line `Fixture updated: Yomitan Popup Dictionary (development build) 26.7.29.0 (<short-commit>, resolved 26.7.29.0)`. First run takes minutes (`npm ci` + webpack build); later runs are incremental for git but re-run `npm ci`.

- [ ] **Step 2: Verify the installed fixture**

Run: `python3 -c "import json; m=json.load(open('tests/fixture/yomitan-chrome-playwright/manifest.json')); print(m['name'], m['version'])"` and `cat tests/fixture/UPSTREAM.json`
Expected: manifest name `Yomitan Popup Dictionary (development build)`, version `26.7.29.0`; provenance JSON has `ref: "latest"`, `resolvedRef: "26.7.29.0"`, and a real commit SHA.

- [ ] **Step 3: Confirm git ignores the fixture (no accidental diff)**

Run: `git status --short`
Expected: no `tests/fixture` entries (matches existing `fixture/` gitignore). Nothing to commit.

---

### Task 3: Schema gate — validate our term-bank records against the new extension

The fixture's `lib/validate-schemas.js` is imported by `tests/archive/schema.test.ts`; Yomitan 26.x may have changed the term-bank schema.

- [ ] **Step 1: Run the schema + archive tests**

Run: `cd packages/merriam_webster_unabridged && bun test tests/archive/schema.test.ts`
Expected: PASS. If FAIL: the new schema rejects our `TermInformation` records — **roll back immediately**:

```bash
bun run tests/update-fixture.ts --ref 25.3.3.0
```

then record the validation failure (which tuple/field) as a follow-up issue — do NOT leave the repo red.

- [ ] **Step 2: Run the full unit suite**

Run: `cd packages/merriam_webster_unabridged && bun test tests/`
Expected: PASS (converter contract, level1 archive, schema, integration). Fix only failures caused by the new fixture; unrelated failures are pre-existing — note them, don't fix.

> Note: the source cache `tests/fixture/yomitan-src` contains the upstream repo's own test suite, which `bun test tests/` would otherwise discover. `packages/merriam_webster_unabridged/bunfig.toml` excludes `tests/fixture/**` from test discovery (`[test] pathIgnorePatterns`); it must exist before the first full-suite run after a fixture update.

- [ ] **Step 2b: Commit the discovery exclusion (only when created)**

```bash
git add packages/merriam_webster_unabridged/bunfig.toml
git commit -m "fix(mwu): exclude fixture source cache from bun test discovery"
```

- [ ] **Step 3: Commit (only if Step 1/2 required source changes)**

```bash
git add -A packages/merriam_webster_unabridged
git commit -m "fix(mwu): align term records with yomitan 26.7.29.0 schema"
```

---

### Task 4: E2E gate — import and query in the real extension

- [ ] **Step 1: Build the test dictionary**

Run: `cd packages/merriam_webster_unabridged && bun run dev:build`
Expected: `build/Merriam Webster Unabridged.zip` written, `build/build-report.json` with `errors: []` and `findings: []`.

- [ ] **Step 2: Run the inspect e2e loop**

Run: `cd packages/merriam_webster_unabridged && bun run inspect:dict:headless -- --close`
Expected: exit 0 — Chromium launches with the NEW fixture via `--disable-extensions-except`, the zip imports, and every `tests/testWords.txt` query returns entries.

- [ ] **Step 3: Handle UI drift (only if Step 2 fails)**

Yomitan 26.x may have changed the import/search DOM that
`scripts/dictionary-inspection/` drives (`#dictionary-list[data-count]`,
`#dictionary-import-file-input`, `.dictionary-import-progress`, result rows).
Diagnose with the `mwu-dictionary-inspection` skill's CDP flow and update the
shared runner selectors, then re-run Step 2. Commit:

```bash
git add packages/merriam_webster_unabridged/scripts/dictionary-inspection/
git commit -m "fix(mwu): adapt inspect e2e to yomitan 26.7.29.0 UI"
```

---

### Task 5: Docs and inspection commands

**Files:**
- Modify: `packages/merriam_webster_unabridged/package.json` (inspection scripts)
- Modify: `CONTEXT.md` (add Tooling section)
- Modify: `.agents/skills/mwu-dictionary-inspection/SKILL.md`

- [ ] **Step 1: Add the inspection scripts**

In `packages/merriam_webster_unabridged/package.json` scripts, keep the visible
command and add the headless command:

```json
    "inspect:dict": "bun run scripts/dictionary-inspection/package-entry.ts visible",
    "inspect:dict:headless": "bun run scripts/dictionary-inspection/package-entry.ts headless",
```

- [ ] **Step 2: Document the fixture in CONTEXT.md**

Append a short section at the end of `CONTEXT.md` (match existing plain-prose style):

```markdown
## Tooling

**Yomitan fixture**:
The unpacked Yomitan extension under
`packages/merriam_webster_unabridged/tests/fixture/yomitan-chrome-playwright`
used by the inspection commands (`inspect:dict` and
`inspect:dict:headless`) and by the archive schema tests
(its `lib/validate-schemas.js`). Dev-local and gitignored. Refresh it with
`bun run update:fixture` (defaults to the newest upstream release tag;
`--ref master` for the latest development build, `--ref <tag>` to pin an
older release); provenance is recorded in
`tests/fixture/UPSTREAM.json`, and the source cache lives in
`tests/fixture/yomitan-src`.
```

- [ ] **Step 3: Update the e2e skill**

Edit `.agents/skills/mwu-dictionary-inspection/SKILL.md` to route visible review,
headless E2E, and parked MCP inspection to their separate commands. Keep the
fixture provenance and refresh instructions in the skill instead of pointing
to the obsolete managed-skill path.

- [ ] **Step 4: Commit**

```bash
git add packages/merriam_webster_unabridged/package.json CONTEXT.md
git commit -m "docs(mwu): document yomitan fixture refresh workflow"
```

---

## Self-Review

**Spec coverage:**
- "Update fixture with newest yomitan build" → Task 2 (default resolves newest release tag `26.7.29.0`).
- "Automate it" → Task 1 script + Task 5 alias (`bun run update:fixture`), repeatable and fail-closed; rollback via `--ref 25.3.3.0`.
- Regression safety → Task 3 (schema gate, rollback) + Task 4 (e2e gate, UI-drift handling).
- Documentation → Task 5 (CONTEXT.md + skill).

**Placeholder scan:** No TBD/TODO; every step has exact commands or code. The script code above is the complete file.

**Type consistency:** `FixtureOptions`/`FixtureArgumentError`/`ParsedOptions` used consistently; `parseFixtureArguments` mirrors `parseInspectionArguments` from `scripts/dictionary-inspection/options.ts` (same `Result` from `src/shared/result`, same usage-error envelope). `run()` returns `Result<string, string>` everywhere it is called.

**Known accepted tradeoffs:**
- Version stamp derives from the resolved ref: numeric release tags stamp their own version (e.g. `26.7.29.0`); branch/commit refs stamp `0.0.0.0` (upstream's own dev default, matching `~/Projects/yomitan/builds/yomitan-chrome-dev.zip`).
- The script runs `npm ci` on every update (deterministic; ~1-2 min).
- Fixture swap is `rm` + `rename`; a crash between the two leaves the fixture absent (re-run the script to recover — it is fully re-runnable).
- The fixture stays gitignored by design; updates are visible in `UPSTREAM.json` (dev-local) and are not part of git history.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-06-update-yomitan-fixture.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks.
2. **Inline Execution** — execute tasks in this session with checkpoints.

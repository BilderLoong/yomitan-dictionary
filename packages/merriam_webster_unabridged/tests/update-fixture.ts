import {
  copyFile,
  mkdir,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
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

const VENDORED_RENDERER_FILES = [
  "display/structured-content-generator.js",
  "display/display-content-manager.js",
  "templates/anki-template-renderer-content-manager.js",
  "language/text-utilities.js",
  "language/ja/japanese.js",
  "language/zh/chinese.js",
  "language/CJK-util.js",
  "core/event-listener-collection.js",
  "data/array-buffer-util.js",
] as const;

const refreshVendoredRenderer = async (
  fixtureDir: string,
): Promise<Result<string, string>> => {
  const vendorDir = path.resolve(import.meta.dirname, "rendered/vendor");
  try {
    for (const relativePath of VENDORED_RENDERER_FILES) {
      const source = path.join(fixtureDir, "js", relativePath);
      const target = path.join(vendorDir, "js", relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
    }
    return {
      ok: true,
      value: `Vendored renderer refreshed from ${fixtureDir} (${VENDORED_RENDERER_FILES.length} files)`,
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to refresh vendored renderer: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
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

  const vendored = await refreshVendoredRenderer(fixtureDir);
  if (!vendored.ok) {
    console.error(vendored.error);
    return 1;
  }
  console.log(vendored.value);
  return 0;
};

const exitCode = await main();
process.exit(exitCode);

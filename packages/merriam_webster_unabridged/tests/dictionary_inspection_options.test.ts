import { expect, test } from "bun:test";
import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  headlessUsage,
  inspectUsage,
  packageHeadlessUsage,
  packageInspectUsage,
  parseInspectionArguments,
  queriesFromText,
} from "../scripts/dictionary-inspection/options";
import {
  getOwnedInspectionProfilePath,
  getVisibleInspectionStatus,
  materializeInspectionSettings,
  prepareInspectionProfile,
} from "../scripts/dictionary-inspection/run";

test("parses a query file and close option", () => {
  expect(
    parseInspectionArguments(
      [
        "dictionary.zip",
        "--query-file",
        "queries.txt",
        "--extension-path",
        "/tmp/yomitan-extension",
        "--screenshot",
        "mwu-search.png",
        "--close",
      ],
      headlessUsage,
    ),
  ).toEqual({
    ok: true,
    value: {
      dictionaryPath: "dictionary.zip",
      query: null,
      queryFilePath: "queries.txt",
      close: true,
      chromeFlags: [],
      screenshotPath: "mwu-search.png",
      extensionPath: "/tmp/yomitan-extension",
      userDataDirectory: null,
    },
  });
});

test("forwards chrome flags verbatim in order", () => {
  expect(
    parseInspectionArguments(
      [
        "dictionary.zip",
        "--chrome-flag",
        "--remote-debugging-port=9222",
        "--chrome-flag",
        "--remote-allow-origins=*",
      ],
      headlessUsage,
    ),
  ).toEqual({
    ok: true,
    value: {
      dictionaryPath: "dictionary.zip",
      query: null,
      queryFilePath: null,
      close: false,
      chromeFlags: ["--remote-debugging-port=9222", "--remote-allow-origins=*"],
      screenshotPath: null,
      extensionPath: null,
      userDataDirectory: null,
    },
  });
});

test("opens an MCP port with the required Chrome flags", () => {
  expect(
    parseInspectionArguments(
      ["dictionary.zip", "--mcp-port", "9222"],
      headlessUsage,
    ),
  ).toEqual({
    ok: true,
    value: {
      dictionaryPath: "dictionary.zip",
      query: null,
      queryFilePath: null,
      close: false,
      chromeFlags: ["--remote-debugging-port=9222", "--remote-allow-origins=*"],
      screenshotPath: null,
      extensionPath: null,
      userDataDirectory: null,
    },
  });
});

test("rejects an empty chrome flag", () => {
  expect(
    parseInspectionArguments(
      ["dictionary.zip", "--chrome-flag", ""],
      headlessUsage,
    ),
  ).toEqual({
    ok: false,
    error: {
      kind: "usage",
      message: "--chrome-flag requires a non-empty value",
    },
  });
});

test("prints the visible inspector help", () => {
  expect(
    parseInspectionArguments(["dictionary.zip", "--help"], inspectUsage),
  ).toEqual({
    ok: false,
    error: { kind: "help", message: inspectUsage },
  });
});

test("recognizes help before a dictionary path is required", () => {
  expect(parseInspectionArguments(["--help"], inspectUsage)).toEqual({
    ok: false,
    error: { kind: "help", message: inspectUsage },
  });
  expect(parseInspectionArguments(["-h"], headlessUsage)).toEqual({
    ok: false,
    error: { kind: "help", message: headlessUsage },
  });
});

test("documents separate direct and package usage forms", () => {
  expect(inspectUsage).toContain(
    "Usage: bun run scripts/dictionary-inspection/inspect.ts <dictionary.zip> [options]",
  );
  expect(headlessUsage).toContain(
    "Usage: bun run scripts/dictionary-inspection/inspect-headless.ts <dictionary.zip> [options]",
  );
  expect(packageInspectUsage).toContain(
    "Usage: bun run inspect:dict [options]",
  );
  expect(packageInspectUsage).not.toContain("<dictionary.zip>");
  expect(packageHeadlessUsage).toContain(
    "Usage: bun run inspect:dict:headless [options]",
  );
  expect(packageHeadlessUsage).not.toContain("<dictionary.zip>");
});

test("selects a truthful visible inspection status", () => {
  expect(getVisibleInspectionStatus("turn", false)).toBe(
    "Visible inspection ready for turn; browser remains open until stopped",
  );
  expect(getVisibleInspectionStatus("turn", true)).toBe(
    "Visible inspection completed for turn; browser will close after this bounded run",
  );
});

test("parses a user data directory", () => {
  expect(
    parseInspectionArguments(
      ["dictionary.zip", "--user-data-dir", "/tmp/profile"],
      headlessUsage,
    ),
  ).toEqual({
    ok: true,
    value: {
      dictionaryPath: "dictionary.zip",
      query: null,
      queryFilePath: null,
      close: false,
      chromeFlags: [],
      screenshotPath: null,
      extensionPath: null,
      userDataDirectory: "/tmp/profile",
    },
  });
});

test("rejects an empty user data directory", () => {
  expect(
    parseInspectionArguments(
      ["dictionary.zip", "--user-data-dir", ""],
      headlessUsage,
    ),
  ).toEqual({
    ok: false,
    error: {
      kind: "usage",
      message: "--user-data-dir requires a non-empty value",
    },
  });
});

test("rejects simultaneous query sources", () => {
  expect(
    parseInspectionArguments(
      ["dictionary.zip", "--query", "what", "--query-file", "queries.txt"],
      headlessUsage,
    ),
  ).toEqual({
    ok: false,
    error: {
      kind: "usage",
      message: "--query and --query-file cannot be used together",
    },
  });
});

test("reads comma- and newline-delimited queries in order", () => {
  expect(queriesFromText("what, take the word\n\nin\r\no")).toEqual([
    "what",
    "take the word",
    "in",
    "o",
  ]);
});

test("materializes the current archive CSS into the premade settings", () => {
  const premadeSettings = JSON.stringify({
    version: 0,
    options: {
      profiles: [
        {
          name: "MWU inspection",
          options: {
            dictionaries: [
              {
                name: "Merriam Webster Unabridged",
                styles: "stale CSS",
              },
            ],
          },
        },
      ],
    },
  });
  const result = materializeInspectionSettings(
    premadeSettings,
    "Merriam Webster Unabridged",
    "CSS from this build",
  );

  expect(result).toEqual({
    ok: true,
    value: `${JSON.stringify(
      {
        version: 0,
        options: {
          profiles: [
            {
              name: "MWU inspection",
              options: {
                dictionaries: [
                  {
                    name: "Merriam Webster Unabridged",
                    styles: "CSS from this build",
                  },
                ],
              },
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  });
});

test("rejects settings materialization when the dictionary is absent", () => {
  const result = materializeInspectionSettings(
    JSON.stringify({
      version: 0,
      options: { profiles: [{ options: { dictionaries: [] } }] },
    }),
    "Merriam Webster Unabridged",
    "CSS from this build",
  );

  expect(result).toEqual({
    ok: false,
    error:
      "Inspection settings do not contain dictionary: Merriam Webster Unabridged",
  });
});

test("creates unique temporary profiles by default", async () => {
  const first = await prepareInspectionProfile(null);
  const second = await prepareInspectionProfile(null);
  try {
    expect(first.temporary).toBe(true);
    expect(second.temporary).toBe(true);
    expect(first.path).not.toBe(second.path);
  } finally {
    await rm(first.path, { force: true, recursive: true });
    await rm(second.path, { force: true, recursive: true });
  }
});

test("refuses and preserves a non-empty explicit profile", async () => {
  const profilePath = await mkdtemp(
    path.join(os.tmpdir(), "mwu-inspection-explicit-profile-"),
  );
  const sentinelPath = path.join(profilePath, "sentinel");
  await writeFile(sentinelPath, "preserve this file");
  try {
    await expect(prepareInspectionProfile(profilePath)).rejects.toThrow(
      "Refusing non-empty browser profile",
    );
    await expect(readFile(sentinelPath, "utf8")).resolves.toBe(
      "preserve this file",
    );
  } finally {
    await rm(profilePath, { force: true, recursive: true });
  }
});

test("creates but does not own an absent explicit profile", async () => {
  const parentPath = await mkdtemp(
    path.join(os.tmpdir(), "mwu-inspection-explicit-parent-"),
  );
  const profilePath = path.join(parentPath, "profile");
  try {
    const profile = await prepareInspectionProfile(profilePath);
    expect(profile).toEqual({ path: profilePath, temporary: false });
  } finally {
    await rm(parentPath, { force: true, recursive: true });
  }
});

test("cleanup ownership excludes explicit profiles", () => {
  expect(
    getOwnedInspectionProfilePath({
      path: "/tmp/temporary-profile",
      temporary: true,
    }),
  ).toBe("/tmp/temporary-profile");
  expect(
    getOwnedInspectionProfilePath({
      path: "/tmp/explicit-profile",
      temporary: false,
    }),
  ).toBeNull();
  expect(getOwnedInspectionProfilePath(null)).toBeNull();
});

const readPipedProcessText = async (stream: unknown): Promise<string> => {
  if (!(stream instanceof ReadableStream)) {
    throw new Error("Expected piped process output");
  }
  return new Response(stream).text();
};

const processTable = async (): Promise<readonly string[]> => {
  const process = Bun.spawn(["ps", "-axo", "pid=,command="], {
    stdout: "pipe",
  });
  const output = await readPipedProcessText(process.stdout);
  await process.exited;
  return output.split("\n").filter((line): boolean => line.length > 0);
};

interface BuildArtifactState {
  readonly exists: boolean;
  readonly modifiedAtMs: number | null;
}

const isMissingPathError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ENOENT";

const buildArtifactPath = path.resolve(
  import.meta.dirname,
  "../build/Merriam Webster Unabridged.zip",
);

const readBuildArtifactState = async (): Promise<BuildArtifactState> => {
  try {
    const stats = await lstat(buildArtifactPath);
    return { exists: true, modifiedAtMs: stats.mtimeMs };
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
    return { exists: false, modifiedAtMs: null };
  }
};

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await lstat(targetPath);
    return true;
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
    return false;
  }
};

const runPackageHelpCommand = async (
  scriptName: string,
  helpFlag: "--help" | "-h",
  usage: string,
): Promise<void> => {
  const temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), "mwu-package-help-"),
  );
  const profilePath = path.join(temporaryDirectory, "profile");
  const beforeArtifact = await readBuildArtifactState();
  const child = Bun.spawn(
    ["bun", "run", scriptName, "--", helpFlag, "--user-data-dir", profilePath],
    {
      cwd: path.resolve(import.meta.dirname, ".."),
      stderr: "pipe",
      stdout: "pipe",
    },
  );
  const stdoutPromise = readPipedProcessText(child.stdout);
  const stderrPromise = readPipedProcessText(child.stderr);
  const exitCode = await child.exited;
  const stdout = await stdoutPromise;
  const stderr = await stderrPromise;
  const afterArtifact = await readBuildArtifactState();
  const processes = await processTable();

  try {
    expect(exitCode).toBe(0);
    expect(stdout).toContain(usage);
    expect(stdout).not.toContain("dev:build");
    expect(stdout).not.toContain("Built ");
    expect(stderr).not.toContain("dev:build");
    expect(stderr).not.toContain("Built ");
    expect(afterArtifact).toEqual(beforeArtifact);
    expect(
      processes.filter((line): boolean => line.includes(profilePath)),
    ).toEqual([]);
    expect(await pathExists(profilePath)).toBe(false);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
};

const runHelpCommand = async (scriptName: string): Promise<void> => {
  const temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), "mwu-inspection-help-"),
  );
  const profilePath = path.join(temporaryDirectory, "profile");
  const sentinelPath = path.join(temporaryDirectory, "sentinel");
  await writeFile(sentinelPath, "must survive help");
  const scriptPath = path.resolve(
    import.meta.dirname,
    `../scripts/dictionary-inspection/${scriptName}`,
  );
  const child = Bun.spawn(
    ["bun", scriptPath, "--help", "--user-data-dir", profilePath],
    {
      cwd: path.resolve(import.meta.dirname, ".."),
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const stdoutPromise = readPipedProcessText(child.stdout);
  const stderrPromise = readPipedProcessText(child.stderr);
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<number>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(-1), 10_000);
  });
  const exitCode = await Promise.race([child.exited, timeoutPromise]);
  if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  if (exitCode === -1) {
    child.kill();
    await child.exited;
  }
  const stdout = await stdoutPromise;
  const stderr = await stderrPromise;
  const processes = await processTable();
  const inspectionProcesses = processes.filter((line): boolean =>
    line.includes(profilePath),
  );

  try {
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
    expect(stderr).toBe("");
    expect(inspectionProcesses).toEqual([]);
    await expect(rm(sentinelPath)).resolves.toBeUndefined();
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
};

test("visible help exits without launching Chromium or deleting the profile", async () => {
  await runHelpCommand("inspect.ts");
});

test("headless help exits without launching Chromium or deleting the profile", async () => {
  await runHelpCommand("inspect-headless.ts");
});

test("package visible help runs before the build for both help flags", async () => {
  await runPackageHelpCommand("inspect:dict", "--help", packageInspectUsage);
  await runPackageHelpCommand("inspect:dict", "-h", packageInspectUsage);
});

test("package headless help runs before the build for both help flags", async () => {
  await runPackageHelpCommand(
    "inspect:dict:headless",
    "--help",
    packageHeadlessUsage,
  );
  await runPackageHelpCommand(
    "inspect:dict:headless",
    "-h",
    packageHeadlessUsage,
  );
});

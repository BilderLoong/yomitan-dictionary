import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  formatReleaseDate,
  nextReleaseRevision,
  selectReleaseTagPlan,
} from "../scripts/release";

interface ProcessOutput {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

const run = async (
  command: string,
  argumentsList: readonly string[],
  cwd: string,
): Promise<ProcessOutput> => {
  const process = Bun.spawn([command, ...argumentsList], {
    cwd,
    stderr: "pipe",
    stdout: "pipe",
  });
  const exitCode = await process.exited;
  return {
    exitCode,
    stderr: await new Response(process.stderr).text(),
    stdout: await new Response(process.stdout).text(),
  };
};

const runOrThrow = async (
  command: string,
  argumentsList: readonly string[],
  cwd: string,
): Promise<string> => {
  const result = await run(command, argumentsList, cwd);
  if (result.exitCode === 0) return result.stdout;
  throw new Error(
    `${command} ${argumentsList.join(" ")} failed:\n${result.stderr || result.stdout}`,
  );
};

const runGit = async (
  argumentsList: readonly string[],
  cwd: string,
): Promise<string> => runOrThrow("git", argumentsList, cwd);

const createTemporaryRepository = async (): Promise<{
  readonly checkoutDirectory: string;
  readonly directory: string;
  readonly remoteDirectory: string;
}> => {
  const directory = await mkdtemp(join(tmpdir(), "mwu-release-tag-"));
  const checkoutDirectory = join(directory, "checkout");
  const remoteDirectory = join(directory, "remote.git");

  await runGit(["init", "--bare", remoteDirectory], directory);
  await runGit(["init", checkoutDirectory], directory);
  await runGit(
    ["symbolic-ref", "HEAD", "refs/heads/master"],
    checkoutDirectory,
  );
  await runGit(["config", "user.email", "test@example.com"], checkoutDirectory);
  await runGit(["config", "user.name", "Release Test"], checkoutDirectory);
  await writeFile(join(checkoutDirectory, "entry.txt"), "initial\n", "utf8");
  await runGit(["add", "entry.txt"], checkoutDirectory);
  await runGit(["commit", "-m", "initial"], checkoutDirectory);
  await runGit(["remote", "add", "origin", remoteDirectory], checkoutDirectory);
  await runGit(
    ["push", "--set-upstream", "origin", "master"],
    checkoutDirectory,
  );

  return { checkoutDirectory, directory, remoteDirectory };
};

describe("release-tag selection", () => {
  test("uses the base revision, then increments the largest same-day sequence", () => {
    expect(nextReleaseRevision("2026.08.20", [])).toBe("2026.08.20");
    expect(
      nextReleaseRevision("2026.08.20", [
        "2026.08.20",
        "2026.08.20.1",
        "2026.08.20.5",
        "2026.08.19.9",
      ]),
    ).toBe("2026.08.20.6");
  });

  test("uses the local calendar date in release-revision form", () => {
    expect(formatReleaseDate(new Date(2026, 7, 20))).toBe("2026.08.20");
  });

  test("reuses release tags on the current commit", () => {
    expect(
      selectReleaseTagPlan({
        currentCommitTags: ["2026.08.20.1", "2026.08.20.2"],
        releaseDate: "2026.08.20",
        remoteTags: ["2026.08.20"],
      }),
    ).toEqual({
      ok: true,
      value: {
        kind: "existing",
        tags: ["2026.08.20.1", "2026.08.20.2"],
      },
    });
  });

  test("does not add a release tag beside a non-release tag", () => {
    expect(
      selectReleaseTagPlan({
        currentCommitTags: ["v1.0.0"],
        releaseDate: "2026.08.20",
        remoteTags: [],
      }),
    ).toEqual({
      ok: false,
      error:
        "Current commit is already tagged but has no calendar release tag: v1.0.0",
    });
  });
});

test("creates and pushes a new release tag only with --publish", async () => {
  const repository = await createTemporaryRepository();
  try {
    const releaseDate = formatReleaseDate(new Date());
    await runGit(
      ["tag", "-a", releaseDate, "-m", `Release ${releaseDate}`],
      repository.checkoutDirectory,
    );
    await runGit(
      ["push", "origin", `refs/tags/${releaseDate}`],
      repository.checkoutDirectory,
    );
    await writeFile(
      join(repository.checkoutDirectory, "entry.txt"),
      "release\n",
      "utf8",
    );
    await runGit(["add", "entry.txt"], repository.checkoutDirectory);
    await runGit(["commit", "-m", "release"], repository.checkoutDirectory);

    const scriptPath = resolve(import.meta.dirname, "../scripts/release.ts");
    const result = await run(
      "bun",
      [scriptPath, "--publish"],
      repository.checkoutDirectory,
    );
    const releasePrefix = "Pushed master and release tag(s): ";
    const releaseLine = result.stdout
      .trim()
      .split("\n")
      .find((line: string): boolean => line.startsWith(releasePrefix));

    expect(result.exitCode).toBe(0);
    if (releaseLine === undefined) {
      throw new Error(`Missing release output: ${result.stdout}`);
    }
    const revision = releaseLine.slice(releasePrefix.length);
    expect(
      await runGit(
        [
          "--git-dir",
          repository.remoteDirectory,
          "rev-parse",
          "refs/heads/master",
        ],
        repository.directory,
      ),
    ).toBe(await runGit(["rev-parse", "HEAD"], repository.checkoutDirectory));
    expect(
      await runGit(
        ["ls-remote", "--tags", "--refs", "origin", `refs/tags/${revision}`],
        repository.checkoutDirectory,
      ),
    ).toContain(`refs/tags/${revision}`);
  } finally {
    await rm(repository.directory, { force: true, recursive: true });
  }
});

test("is dry by default and pushes existing current-commit release tags", async () => {
  const repository = await createTemporaryRepository();
  try {
    const releaseTag = "2026.08.20.1";
    await writeFile(
      join(repository.checkoutDirectory, "entry.txt"),
      "release\n",
      "utf8",
    );
    await runGit(["add", "entry.txt"], repository.checkoutDirectory);
    await runGit(["commit", "-m", "release"], repository.checkoutDirectory);
    await runGit(
      ["tag", "-a", releaseTag, "-m", `Release ${releaseTag}`],
      repository.checkoutDirectory,
    );

    const scriptPath = resolve(import.meta.dirname, "../scripts/release.ts");
    const dryRun = await run("bun", [scriptPath], repository.checkoutDirectory);

    expect(dryRun.exitCode).toBe(0);
    expect(dryRun.stdout).toContain("Dry run");
    expect(dryRun.stdout).toContain(releaseTag);
    expect(
      await runGit(
        [
          "--git-dir",
          repository.remoteDirectory,
          "rev-parse",
          "refs/heads/master",
        ],
        repository.directory,
      ),
    ).not.toBe(
      await runGit(["rev-parse", "HEAD"], repository.checkoutDirectory),
    );
    expect(
      await runGit(
        ["ls-remote", "--tags", "--refs", "origin", `refs/tags/${releaseTag}`],
        repository.checkoutDirectory,
      ),
    ).toBe("");

    const published = await run(
      "bun",
      [scriptPath, "--publish"],
      repository.checkoutDirectory,
    );

    expect(published.exitCode).toBe(0);
    expect(published.stdout).toContain(releaseTag);
    expect(
      await runGit(
        [
          "--git-dir",
          repository.remoteDirectory,
          "rev-parse",
          "refs/heads/master",
        ],
        repository.directory,
      ),
    ).toBe(await runGit(["rev-parse", "HEAD"], repository.checkoutDirectory));
    expect(
      await runGit(
        ["ls-remote", "--tags", "--refs", "origin", `refs/tags/${releaseTag}`],
        repository.checkoutDirectory,
      ),
    ).toContain(`refs/tags/${releaseTag}`);
    expect(
      await runGit(
        ["ls-remote", "--tags", "--refs", "origin"],
        repository.checkoutDirectory,
      ),
    ).not.toContain("refs/tags/2026.08.20.2");
  } finally {
    await rm(repository.directory, { force: true, recursive: true });
  }
});

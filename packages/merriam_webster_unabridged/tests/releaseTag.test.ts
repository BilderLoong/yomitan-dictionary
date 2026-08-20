import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { formatReleaseDate, nextReleaseRevision } from "../scripts/release";

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
});

test("pushes master and the next release tag to a temporary remote", async () => {
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
    const result = await run("bun", [scriptPath], repository.checkoutDirectory);
    const releasePrefix = "Pushed master and release tag: ";
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

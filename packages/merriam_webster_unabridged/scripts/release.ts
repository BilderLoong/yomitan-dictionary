import { parseReleaseRevision } from "../src/pipeline/release";
import type { Result } from "../src/shared/result";

const formatNumber = (value: number): string =>
  value.toString().padStart(2, "0");

export const formatReleaseDate = (date: Date): string =>
  `${date.getFullYear().toString().padStart(4, "0")}.${formatNumber(
    date.getMonth() + 1,
  )}.${formatNumber(date.getDate())}`;

const sequenceForTag = (releaseDate: string, tag: string): bigint | null => {
  if (tag === releaseDate) return 0n;

  const prefix = `${releaseDate}.`;
  if (!tag.startsWith(prefix) || !parseReleaseRevision(tag).ok) return null;

  return BigInt(tag.slice(prefix.length));
};

export const nextReleaseRevision = (
  releaseDate: string,
  existingTags: readonly string[],
): string => {
  const highestSequence = existingTags
    .flatMap((tag: string): readonly bigint[] => {
      const sequence = sequenceForTag(releaseDate, tag);
      return sequence === null ? [] : [sequence];
    })
    .reduce<bigint | null>(
      (highest: bigint | null, sequence: bigint): bigint =>
        highest === null || sequence > highest ? sequence : highest,
      null,
    );

  return highestSequence === null
    ? releaseDate
    : `${releaseDate}.${(highestSequence + 1n).toString()}`;
};

const parseRemoteTagNames = (output: string): readonly string[] =>
  output.split("\n").flatMap((line: string): readonly string[] => {
    const reference = line.split("\t").at(1);
    return reference?.startsWith("refs/tags/")
      ? [reference.slice("refs/tags/".length)]
      : [];
  });

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const runGit = async (
  argumentsList: readonly string[],
): Promise<Result<string, string>> => {
  let process: Bun.Subprocess<"ignore", "pipe", "pipe">;
  try {
    process = Bun.spawn(["git", ...argumentsList], {
      stderr: "pipe",
      stdout: "pipe",
    });
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Unable to start git: ${errorMessage(error)}`,
    };
  }

  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);
  if (exitCode === 0) return { ok: true, value: stdout };

  const details = stderr.trim() || stdout.trim();
  return {
    ok: false,
    error: `git ${argumentsList.join(" ")} failed${details === "" ? "" : `: ${details}`}`,
  };
};

const pushRelease = async (): Promise<Result<string, string>> => {
  const status = await runGit(["status", "--porcelain"]);
  if (!status.ok) return status;
  if (status.value.trim() !== "") {
    return {
      ok: false,
      error: "Release requires a clean working tree.",
    };
  }

  const branch = await runGit(["branch", "--show-current"]);
  if (!branch.ok) return branch;
  if (branch.value.trim() !== "master") {
    return {
      ok: false,
      error: "Release requires the local master branch.",
    };
  }

  const remoteTags = await runGit(["ls-remote", "--tags", "--refs", "origin"]);
  if (!remoteTags.ok) return remoteTags;
  const revision = nextReleaseRevision(
    formatReleaseDate(new Date()),
    parseRemoteTagNames(remoteTags.value),
  );

  const localTag = await runGit(["tag", "--list", revision]);
  if (!localTag.ok) return localTag;
  if (localTag.value.trim() !== "") {
    return {
      ok: false,
      error: `Release tag already exists locally: ${revision}`,
    };
  }

  const pushedMaster = await runGit(["push", "origin", "master"]);
  if (!pushedMaster.ok) return pushedMaster;

  const createdTag = await runGit([
    "tag",
    "-a",
    revision,
    "-m",
    `Release ${revision}`,
  ]);
  if (!createdTag.ok) return createdTag;

  const pushedTag = await runGit(["push", "origin", `refs/tags/${revision}`]);
  if (pushedTag.ok) return { ok: true, value: revision };

  return {
    ok: false,
    error: `${pushedTag.error}\nThe local release tag was kept: ${revision}`,
  };
};

const main = async (): Promise<void> => {
  if (process.argv.slice(2).length > 0) {
    console.error("Usage: bun run release");
    process.exitCode = 1;
    return;
  }

  const result = await pushRelease();
  if (!result.ok) {
    console.error(`Release failed: ${result.error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Pushed master and release tag: ${result.value}`);
};

if (import.meta.main) {
  void main().catch((error: unknown): void => {
    console.error(`Release failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  });
}

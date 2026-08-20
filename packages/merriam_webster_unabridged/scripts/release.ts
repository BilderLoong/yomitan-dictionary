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

export type ReleaseTagPlan =
  | { readonly kind: "create"; readonly tag: string }
  | { readonly kind: "existing"; readonly tags: readonly string[] };

type ReleaseMode = "dry-run" | "publish";

const failure = <T>(error: string): Result<T, string> => ({ ok: false, error });

const isReleaseTag = (tag: string): boolean => parseReleaseRevision(tag).ok;

export const selectReleaseTagPlan = (input: {
  readonly currentCommitTags: readonly string[];
  readonly releaseDate: string;
  readonly remoteTags: readonly string[];
}): Result<ReleaseTagPlan, string> => {
  const currentTags = input.currentCommitTags.filter(
    (tag: string): boolean => tag !== "",
  );
  const currentReleaseTags = currentTags.filter(isReleaseTag);

  if (currentReleaseTags.length > 0) {
    return {
      ok: true,
      value: { kind: "existing", tags: currentReleaseTags },
    };
  }
  if (currentTags.length > 0) {
    return failure(
      `Current commit is already tagged but has no calendar release tag: ${currentTags.join(", ")}`,
    );
  }

  return {
    ok: true,
    value: {
      kind: "create",
      tag: nextReleaseRevision(input.releaseDate, input.remoteTags),
    },
  };
};

const parseRemoteTagNames = (output: string): readonly string[] =>
  output.split("\n").flatMap((line: string): readonly string[] => {
    const reference = line.split("\t").at(1);
    return reference?.startsWith("refs/tags/")
      ? [reference.slice("refs/tags/".length)]
      : [];
  });

const parseLocalTagNames = (output: string): readonly string[] =>
  output
    .split("\n")
    .map((tag: string): string => tag.trim())
    .filter((tag: string): boolean => tag !== "");

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

const parseReleaseMode = (
  argumentsList: readonly string[],
): Result<ReleaseMode, string> => {
  if (argumentsList.length === 0) return { ok: true, value: "dry-run" };
  if (argumentsList.length === 1 && argumentsList[0] === "--publish") {
    return { ok: true, value: "publish" };
  }
  return failure("Usage: bun run release [--publish]");
};

const tagReferences = (plan: ReleaseTagPlan): readonly string[] =>
  plan.kind === "create"
    ? [`refs/tags/${plan.tag}`]
    : plan.tags.map((tag: string): string => `refs/tags/${tag}`);

const dryRunMessage = (plan: ReleaseTagPlan): string => {
  const tagAction =
    plan.kind === "create"
      ? `Would create: git tag -a ${plan.tag} -m "Release ${plan.tag}"`
      : `Would reuse current-commit release tag(s): ${plan.tags.join(", ")}`;
  return [
    "Dry run. No Git changes were made.",
    "Would push: git push origin master",
    tagAction,
    `Would push: git push origin ${tagReferences(plan).join(" ")}`,
    "Run `bun run release -- --publish` to publish.",
  ].join("\n");
};

const prepareRelease = async (): Promise<Result<ReleaseTagPlan, string>> => {
  const status = await runGit(["status", "--porcelain"]);
  if (!status.ok) return failure(status.error);
  if (status.value.trim() !== "") {
    return failure("Release requires a clean working tree.");
  }

  const branch = await runGit(["branch", "--show-current"]);
  if (!branch.ok) return failure(branch.error);
  if (branch.value.trim() !== "master") {
    return failure("Release requires the local master branch.");
  }

  const currentTags = await runGit(["tag", "--points-at", "HEAD"]);
  if (!currentTags.ok) return failure(currentTags.error);

  const remoteTags = await runGit(["ls-remote", "--tags", "--refs", "origin"]);
  if (!remoteTags.ok) return failure(remoteTags.error);

  const plan = selectReleaseTagPlan({
    currentCommitTags: parseLocalTagNames(currentTags.value),
    releaseDate: formatReleaseDate(new Date()),
    remoteTags: parseRemoteTagNames(remoteTags.value),
  });
  if (!plan.ok) return plan;
  if (plan.value.kind === "existing") return plan;

  const localTag = await runGit(["tag", "--list", plan.value.tag]);
  if (!localTag.ok) return failure(localTag.error);
  if (localTag.value.trim() !== "") {
    return failure(`Release tag already exists locally: ${plan.value.tag}`);
  }

  return plan;
};

const publishRelease = async (
  plan: ReleaseTagPlan,
): Promise<Result<readonly string[], string>> => {
  const pushedMaster = await runGit(["push", "origin", "master"]);
  if (!pushedMaster.ok) return failure(pushedMaster.error);

  if (plan.kind === "create") {
    const createdTag = await runGit([
      "tag",
      "-a",
      plan.tag,
      "-m",
      `Release ${plan.tag}`,
    ]);
    if (!createdTag.ok) return failure(createdTag.error);
  }

  const pushedTags = await runGit(["push", "origin", ...tagReferences(plan)]);
  if (!pushedTags.ok) {
    return plan.kind === "create"
      ? failure(
          `${pushedTags.error}\nThe local release tag was kept: ${plan.tag}`,
        )
      : failure(pushedTags.error);
  }

  return {
    ok: true,
    value: plan.kind === "create" ? [plan.tag] : plan.tags,
  };
};

const main = async (): Promise<void> => {
  const mode = parseReleaseMode(process.argv.slice(2));
  if (!mode.ok) {
    console.error(mode.error);
    process.exitCode = 1;
    return;
  }

  const plan = await prepareRelease();
  if (!plan.ok) {
    console.error(`Release failed: ${plan.error}`);
    process.exitCode = 1;
    return;
  }
  if (mode.value === "dry-run") {
    console.log(dryRunMessage(plan.value));
    return;
  }

  const result = await publishRelease(plan.value);
  if (!result.ok) {
    console.error(`Release failed: ${result.error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Pushed master and release tag(s): ${result.value.join(", ")}`);
};

if (import.meta.main) {
  void main().catch((error: unknown): void => {
    console.error(`Release failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  });
}

import path from "node:path";

import { packageHeadlessUsage, packageInspectUsage } from "./options";

export type PackageInspectionMode = "visible" | "headless";

const isPackageInspectionMode = (
  value: string | undefined,
): value is PackageInspectionMode =>
  value === "visible" || value === "headless";

const packageUsageForMode = (mode: PackageInspectionMode): string =>
  mode === "visible" ? packageInspectUsage : packageHeadlessUsage;

const adapterForMode = (mode: PackageInspectionMode): string =>
  mode === "visible" ? "inspect.ts" : "inspect-headless.ts";

const hasHelpOption = (argumentsList: readonly string[]): boolean =>
  argumentsList.some(
    (argument: string): boolean => argument === "--help" || argument === "-h",
  );

const runChild = async (argumentsList: readonly string[]): Promise<number> => {
  const childProcess = Bun.spawn([...argumentsList], {
    stderr: "inherit",
    stdout: "inherit",
  });
  return childProcess.exited;
};

export const runPackageInspection = async (
  mode: PackageInspectionMode,
  argumentsList: readonly string[],
): Promise<number> => {
  if (hasHelpOption(argumentsList)) {
    console.log(packageUsageForMode(mode));
    return 0;
  }

  const buildExitCode = await runChild([process.execPath, "run", "dev:build"]);
  if (buildExitCode !== 0) return buildExitCode;

  const dictionaryPath = path.resolve(
    import.meta.dirname,
    "../../build/Merriam Webster Unabridged.zip",
  );
  const adapterPath = path.resolve(import.meta.dirname, adapterForMode(mode));
  return runChild([
    process.execPath,
    adapterPath,
    dictionaryPath,
    ...argumentsList,
  ]);
};

const main = async (): Promise<void> => {
  const modeArgument = process.argv[2];
  if (!isPackageInspectionMode(modeArgument)) {
    console.error("Package inspection mode must be visible or headless");
    process.exitCode = 1;
    return;
  }

  process.exitCode = await runPackageInspection(
    modeArgument,
    process.argv.slice(3),
  );
};

if (import.meta.main) {
  void main().catch((error: unknown): void => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

import { headlessUsage, parseInspectionArguments } from "./options";
import { runDictionaryInspection } from "./run";

const main = async (): Promise<void> => {
  const parsed = parseInspectionArguments(process.argv.slice(2), headlessUsage);
  if (!parsed.ok) {
    if (parsed.error.kind === "help") {
      console.log(parsed.error.message);
    } else {
      console.error(parsed.error.message);
      process.exitCode = 1;
    }
    return;
  }

  await runDictionaryInspection({ ...parsed.value, mode: "headless" });
};

if (import.meta.main) {
  void main().catch((error: unknown): void => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

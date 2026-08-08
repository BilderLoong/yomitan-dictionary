import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "playwright";
import { parseImportArguments, queriesFromText } from "./import_options";

const readDictionaryCount = async (page: Page): Promise<number> => {
  const rawCount = await page
    .locator("#dictionary-list")
    .getAttribute("data-count");
  const count = Number(rawCount);
  if (!Number.isInteger(count)) {
    throw new Error(`Invalid dictionary count: ${rawCount ?? "missing"}`);
  }
  return count;
};

const closeWelcomePage = async (
  page: Page,
  welcomePageUrl: string,
): Promise<boolean> => {
  if (page.url() !== welcomePageUrl) return false;
  await page.close();
  return true;
};

const importDictionary = async (
  page: Page,
  dictionaryPath: string,
): Promise<void> => {
  const beforeCount = await readDictionaryCount(page);
  await page.setInputFiles("#dictionary-import-file-input", dictionaryPath);
  // A full-database build (~354k records, 60 MB) imports in well over a
  // minute on a loaded machine; give it ten.
  await page.waitForSelector(".dictionary-import-progress", {
    state: "hidden",
    timeout: 600000,
  });

  const importError = (
    await page.locator("#dictionary-error").textContent()
  )?.trim();
  if (importError !== undefined && importError.length > 0) {
    throw new Error(`Dictionary import failed: ${importError}`);
  }

  const afterCount = await readDictionaryCount(page);
  if (afterCount <= beforeCount) {
    throw new Error(
      `Dictionary count did not increase: ${beforeCount} -> ${afterCount}`,
    );
  }
};

const _assertSearchResult = async (
  page: Page,
  searchPageUrl: string,
  query: string,
): Promise<void> => {
  await page.goto(`${searchPageUrl}?query=${encodeURIComponent(query)}`);
  await page.waitForFunction(
    (): boolean => {
      const entries = document.querySelectorAll("#dictionary-entries .entry");
      const noResults = document.querySelector("#no-results");
      return (
        entries.length > 0 ||
        (noResults !== null && !noResults.hasAttribute("hidden"))
      );
    },
    undefined,
    { timeout: 30000 },
  );

  const entryCount = await page.locator("#dictionary-entries .entry").count();
  if (entryCount === 0) {
    throw new Error(`Search returned no dictionary entry for: ${query}`);
  }
};

const setLanguage = async (page: Page, languageCode: string): Promise<void> => {
  await page.waitForSelector("#language-select", { timeout: 10000 });
  await page.selectOption("#language-select", languageCode);
  await page.waitForSelector("#recommended-settings-apply-button", {
    timeout: 10000,
  });
  await page.click("#recommended-settings-apply-button");
};

const main = async (): Promise<void> => {
  const parsed = parseImportArguments(process.argv.slice(2));
  if (!parsed.ok) throw new Error(parsed.error.message);

  const options = parsed.value;
  const dictionaryPath = path.resolve(options.dictionaryPath);
  const userDataDirectory = "/tmp/test-user-data-dir";
  await rm(userDataDirectory, { force: true, recursive: true });
  await mkdir(userDataDirectory, { recursive: true });

  const pathToExtension = path.resolve(
    import.meta.dirname,
    "./fixture/yomitan-chrome-playwright",
  );
  const launchArgs = [
    `--disable-extensions-except=${pathToExtension}`,
    `--load-extension=${pathToExtension}`,
    ...options.chromeFlags,
  ];
  const browserContext = await chromium.launchPersistentContext(
    userDataDirectory,
    {
      headless: false,
      channel: "chromium",
      args: launchArgs,
    },
  );

  const extensionUrlPrefix =
    "chrome-extension://mlbjoknafgaddicpadejdmfnimmacble";
  const searchPageUrl = `${extensionUrlPrefix}/search.html`;
  const welcomePageUrl = `${extensionUrlPrefix}/welcome.html`;
  const welcomePage = await browserContext.newPage();
  const searchPage = await browserContext.newPage();
  const queryText =
    options.queryFilePath === null
      ? (options.query ??
        (await readFile(
          path.resolve(import.meta.dirname, "./testWords.txt"),
          "utf8",
        )))
      : await readFile(path.resolve(options.queryFilePath), "utf8");
  const searchQueries = queriesFromText(queryText);
  if (searchQueries.length === 0) {
    throw new Error("No search queries were supplied");
  }

  browserContext.on("page", (page: Page): void => {
    void closeWelcomePage(page, welcomePageUrl);
  });

  try {
    await welcomePage.goto(welcomePageUrl);
    await Promise.all([
      setLanguage(welcomePage, "en"),
      importDictionary(welcomePage, dictionaryPath),
    ]);

    await searchPage.goto(
      `${searchPageUrl}?query=${encodeURIComponent(searchQueries.join(". "))}`,
    );
    // for (const query of searchQueries) {
    //   await assertSearchResult(searchPage, searchPageUrl, query);
    // }
  } finally {
    if (options.close) await browserContext.close();
  }
};

if (import.meta.main) {
  void main().catch((error: unknown): void => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

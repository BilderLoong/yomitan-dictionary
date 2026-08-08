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

const readStoredPartOfSpeechFilter = async (
  page: Page,
  dictionaryTitle: string,
): Promise<boolean> =>
  page.evaluate(async (title: string): Promise<boolean> => {
    const chromeApi = (
      globalThis as unknown as {
        chrome: {
          storage: {
            local: {
              get: (keys: readonly string[]) => Promise<Record<string, string>>;
            };
          };
        };
      }
    ).chrome;
    const store = await chromeApi.storage.local.get(["options"]);
    const options = JSON.parse(store.options) as {
      profileCurrent: number;
      profiles: readonly {
        options: {
          dictionaries: readonly {
            name: string;
            partsOfSpeechFilter: boolean;
          }[];
        };
      }[];
    };
    const dictionaries =
      options.profiles[options.profileCurrent].options.dictionaries;
    const entry = dictionaries.find(
      (dictionary: { name: string }): boolean => dictionary.name === title,
    );
    if (entry === undefined) {
      throw new Error(`Dictionary not found in stored options: ${title}`);
    }
    return entry.partsOfSpeechFilter;
  }, dictionaryTitle);

const disablePartOfSpeechFilter = async (
  page: Page,
  settingsPageUrl: string,
  dictionaryTitle: string,
): Promise<void> => {
  // The dictionary import can still be committing to the backend when the
  // first settings page loads; its list is populated once per page load, so
  // reload and retry until the dictionary row appears.
  const maxAttempts = 5;
  for (let attempt = 1; ; ++attempt) {
    await page.goto(settingsPageUrl);
    await page
      .locator('.settings-item-button[data-modal-action="show,dictionaries"]')
      .click();
    const modal = page.locator("#dictionaries-modal");
    await modal.waitFor({ state: "visible" });
    const titleContainer = modal
      .locator(".dictionary-item-title-container")
      .filter({ hasText: dictionaryTitle });
    try {
      await titleContainer.waitFor({ state: "visible", timeout: 10000 });
    } catch {
      if (attempt >= maxAttempts) {
        throw new Error(
          `Dictionary "${dictionaryTitle}" never appeared in the settings list after ${maxAttempts} reloads`,
        );
      }
      continue;
    }
    await titleContainer
      .locator(
        "xpath=following-sibling::button[contains(@class, 'dictionary-menu-button')]",
      )
      .click();
    await page
      .locator('.popup-menu-container:visible [data-menu-action="showDetails"]')
      .click();
    const detailsModal = page.locator("#dictionary-details-modal");
    await detailsModal.waitFor({ state: "visible" });
    // The modal open animation (~375ms) makes the first click land on the
    // dimmer, which closes the modal again. Wait for it to settle first.
    await page.waitForTimeout(600);
    await page
      .locator(".dictionary-parts-of-speech-filter-setting")
      .waitFor({ state: "visible" });
    const toggleInput = detailsModal.locator(
      ".dictionary-parts-of-speech-filter-toggle",
    );
    const toggleControl = detailsModal.locator(
      ".dictionary-parts-of-speech-filter-setting .toggle",
    );
    if (!(await toggleInput.isChecked())) {
      throw new Error(
        `Expected the parts-of-speech filter of ${dictionaryTitle} to be enabled`,
      );
    }
    // The checkbox input is CSS-hidden (opacity 0, 0x0); clicking the
    // wrapping label activates it and saves through the data-setting binder.
    await toggleControl.click();
    await page.waitForFunction(
      (): boolean =>
        !(
          document.querySelector(
            ".dictionary-parts-of-speech-filter-toggle",
          ) as HTMLInputElement
        ).checked,
    );
    const stored = await readStoredPartOfSpeechFilter(page, dictionaryTitle);
    if (stored) {
      throw new Error(
        `Part-of-speech filter still enabled in stored options for ${dictionaryTitle}`,
      );
    }
    return;
  }
};

const main = async (): Promise<void> => {
  const parsed = parseImportArguments(process.argv.slice(2));
  if (!parsed.ok) throw new Error(parsed.error.message);

  const options = parsed.value;
  const dictionaryPath = path.resolve(options.dictionaryPath);
  const userDataDirectory =
    options.userDataDirectory ?? "/tmp/test-user-data-dir";
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
  const settingsPageUrl = `${extensionUrlPrefix}/settings.html`;
  const dictionaryTitle = "Merriam Webster Unabridged";
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

    await disablePartOfSpeechFilter(
      searchPage,
      settingsPageUrl,
      dictionaryTitle,
    );

    await searchPage.goto(
      `${searchPageUrl}?query=${encodeURIComponent(searchQueries.join(". "))}`,
    );
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

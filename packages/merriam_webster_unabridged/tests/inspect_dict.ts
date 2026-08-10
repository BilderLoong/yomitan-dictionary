import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { type BrowserContext, chromium, type Page } from "playwright";
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

const waitForSearchPopupPage = async (
  browserContext: BrowserContext,
  searchPage: Page,
  searchPageUrl: string,
): Promise<Page> => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const popupPage = browserContext.pages().find((candidate): boolean => {
      if (candidate === searchPage) return false;
      if (!candidate.url().startsWith(`${searchPageUrl}?`)) return false;
      return true;
    });
    if (popupPage !== undefined) return popupPage;
    await new Promise<void>((resolve): void => {
      setTimeout(resolve, 100);
    });
  }
  throw new Error("Yomitan search popup did not open");
};

const openSearchPopup = async (
  browserContext: BrowserContext,
  searchPage: Page,
  searchPageUrl: string,
  query: string,
): Promise<Page> => {
  const response = await searchPage.evaluate(
    (text: string): Promise<unknown> =>
      new Promise<unknown>((resolve, reject): void => {
        const chromeApi = (
          globalThis as unknown as {
            chrome: {
              runtime: {
                lastError?: { message?: string };
                sendMessage: (
                  message: unknown,
                  callback: (response: unknown) => void,
                ) => void;
              };
            };
          }
        ).chrome;
        chromeApi.runtime.sendMessage(
          {
            action: "getOrCreateSearchPopup",
            params: { focus: true, text },
          },
          (result: unknown): void => {
            const error = chromeApi.runtime.lastError;
            if (error !== undefined) {
              reject(new Error(error.message ?? "Could not open popup"));
              return;
            }
            resolve(result);
          },
        );
      }),
    query,
  );
  if (typeof response !== "object" || response === null) {
    throw new Error("Yomitan popup API returned an invalid response");
  }
  const responseResult = (response as { result?: unknown }).result;
  if (typeof responseResult !== "object" || responseResult === null) {
    throw new Error("Yomitan popup API did not return a tab");
  }

  const popupPage = await waitForSearchPopupPage(
    browserContext,
    searchPage,
    searchPageUrl,
  );
  await popupPage.setViewportSize({ width: 360, height: 720 });
  await popupPage.waitForFunction(
    (): boolean =>
      document.documentElement.dataset.searchMode === "popup" &&
      document.documentElement.dataset.loaded === "true",
    undefined,
    { timeout: 30000 },
  );
  await popupPage.waitForFunction(
    (): boolean => {
      const entries = document.querySelectorAll("#dictionary-entries .entry");
      const noDictionaries = document.querySelector("#no-dictionaries");
      return (
        entries.length > 0 ||
        (noDictionaries !== null && !noDictionaries.hasAttribute("hidden"))
      );
    },
    undefined,
    { timeout: 30000 },
  );
  const entryCount = await popupPage
    .locator("#dictionary-entries .entry")
    .count();
  if (entryCount === 0) {
    throw new Error(`Popup returned no dictionary entry for: ${query}`);
  }
  return popupPage;
};

const assertSearchPopupPresentation = async (
  popupPage: Page,
  query: string,
): Promise<void> => {
  const failures = await popupPage.evaluate((): string[] => {
    const body = document.body;
    const content = document.querySelector("#content-scroll");
    const forms = [
      ...document.querySelectorAll(
        '[data-sc-content="mwu-header-inflections"]',
      ),
    ];
    const compactForm = forms.find(
      (node): boolean =>
        node.querySelector('[data-sc-content="emphasis"]') !== null,
    );
    const localTags = [
      ...document.querySelectorAll(
        '[data-sc-content="tag"], span[data-sc-content="verb-subtype"]',
      ),
    ];
    const headerTags = localTags.filter(
      (node): boolean =>
        node.closest('[data-sc-content="mwu-header"]') !== null,
    );
    const badgeTags = localTags.filter(
      (node): boolean =>
        node.closest('[data-sc-content="mwu-header"]') === null,
    );
    const examples = [
      ...document.querySelectorAll('[data-sc-content="example-sentence"]'),
    ];
    const disclosures = [
      ...document.querySelectorAll('[data-sc-content="disclosure-summary"]'),
    ];
    const nativeDictionaryTag = [
      ...document.querySelectorAll(".tag-label"),
    ].find(
      (node): boolean => node.textContent?.includes("Merriam Webster") ?? false,
    );
    const failures: string[] = [];
    if (
      body.scrollWidth > body.clientWidth ||
      (content !== null && content.scrollWidth > content.clientWidth)
    ) {
      failures.push("horizontal overflow");
    }
    if (forms.length === 0) failures.push("missing inflection group");
    if (forms.some((node): boolean => node.scrollWidth > node.clientWidth)) {
      failures.push("inflection group overflow");
    }
    if (
      forms[0] !== undefined &&
      forms[0].getBoundingClientRect().height <= 40
    ) {
      failures.push("long inflection group did not wrap");
    }
    const compactFormLabel = compactForm?.querySelector(
      '[data-sc-content="emphasis"]',
    );
    if (
      compactFormLabel !== null &&
      compactFormLabel !== undefined &&
      getComputedStyle(compactFormLabel).display !== "inline"
    ) {
      failures.push("short inflection metadata is not compact");
    }
    if (badgeTags.length === 0) failures.push("missing sense-level local tag");
    if (
      badgeTags.some((node): boolean => {
        const style = getComputedStyle(node);
        return (
          style.display !== "inline-flex" ||
          style.cursor !== "default" ||
          style.borderRadius === "0px"
        );
      })
    ) {
      failures.push("invalid sense-level local tag treatment");
    }
    if (
      headerTags.some((node): boolean => {
        const style = getComputedStyle(node);
        return (
          style.display !== "inline" ||
          style.borderRadius !== "0px" ||
          style.padding !== "0px"
        );
      })
    ) {
      failures.push("invalid header qualifier treatment");
    }
    if (nativeDictionaryTag !== undefined && badgeTags[0] !== undefined) {
      const localStyle = getComputedStyle(badgeTags[0]);
      const nativeStyle = getComputedStyle(nativeDictionaryTag);
      if (
        Math.abs(
          Number.parseFloat(localStyle.height) -
            Number.parseFloat(nativeStyle.height),
        ) > 2 ||
        localStyle.backgroundColor === nativeStyle.backgroundColor
      ) {
        failures.push("local tag does not match host badge scale");
      }
    }
    if (
      examples.length === 0 ||
      !examples.some(
        (node): boolean => getComputedStyle(node).listStyleType === "disc",
      )
    ) {
      failures.push("examples are not list items");
    }
    if (
      disclosures.length === 0 ||
      disclosures.some(
        (node): boolean => node.parentElement?.hasAttribute("open") ?? false,
      )
    ) {
      failures.push("disclosures are not collapsed");
    }
    return failures;
  });
  if (failures.length > 0) {
    throw new Error(
      `Popup presentation failed for ${query}: ${failures.join(", ")}`,
    );
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
    const popupQuery = searchQueries[searchQueries.length - 1];
    if (popupQuery === undefined) {
      throw new Error("No popup query was selected");
    }
    const popupPage = await openSearchPopup(
      browserContext,
      searchPage,
      searchPageUrl,
      popupQuery,
    );
    for (const theme of ["light", "dark"] as const) {
      await popupPage.evaluate((value: string): void => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await assertSearchPopupPresentation(popupPage, popupQuery);
    }
    console.log(
      `Popup ready for ${popupQuery} at ${popupPage.url()} (360px viewport)`,
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

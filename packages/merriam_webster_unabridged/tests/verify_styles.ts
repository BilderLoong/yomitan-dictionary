import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "playwright";
import { parseImportArguments } from "./import_options";

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
  await page.waitForSelector(".dictionary-import-progress", {
    state: "hidden",
    timeout: 60000,
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

const setLanguage = async (page: Page, languageCode: string): Promise<void> => {
  await page.waitForSelector("#language-select", { timeout: 10000 });
  await page.selectOption("#language-select", languageCode);
  await page.waitForSelector("#recommended-settings-apply-button", {
    timeout: 10000,
  });
  await page.click("#recommended-settings-apply-button");
};

interface StyleSnapshot {
  readonly targetHighlightBackground: string | null;
  readonly exampleSentenceMarginLeft: string | null;
  readonly exampleSentenceFontSize: string | null;
  readonly pronunciationFontStyle: string | null;
  readonly level4ListStyle: string | null;
  readonly calledAlso: boolean;
  readonly comparisonReference: boolean;
  readonly compareRelation: boolean;
  readonly variantReference: boolean;
  readonly alternateForm: boolean;
  readonly seeRelation: boolean;
  readonly emphasis: boolean;
}

const snapshotPage = async (page: Page): Promise<StyleSnapshot> => {
  return page.evaluate((): StyleSnapshot => {
    const computedValue = (
      selector: string,
      property: string,
    ): string | null => {
      const element = document.querySelector(selector);
      if (element === null) return null;
      return getComputedStyle(element).getPropertyValue(property);
    };
    const existsSelector = (selector: string): boolean =>
      document.querySelector(selector) !== null;
    return {
      targetHighlightBackground: computedValue(
        '[data-sc-content="target-highlight"]',
        "background-color",
      ),
      exampleSentenceMarginLeft: computedValue(
        '[data-sc-content="example-sentence"]',
        "margin-left",
      ),
      exampleSentenceFontSize: computedValue(
        '[data-sc-content="example-sentence"]',
        "font-size",
      ),
      pronunciationFontStyle: computedValue(
        '[data-sc-content="pronunciation"]',
        "font-style",
      ),
      level4ListStyle: computedValue(
        'ol[data-sc-content="mwu-level"][data-sc-level="4"]',
        "list-style-type",
      ),
      calledAlso: existsSelector('[data-sc-content="called-also"]'),
      comparisonReference: existsSelector(
        '[data-sc-content="comparison-reference"]',
      ),
      compareRelation: existsSelector('[data-sc-relation="compare"]'),
      variantReference: existsSelector('[data-sc-content="variant-reference"]'),
      alternateForm: existsSelector('[data-sc-content="alternate-form"]'),
      seeRelation: existsSelector('[data-sc-relation="see"]'),
      emphasis: existsSelector('[data-sc-content="emphasis"]'),
    };
  });
};

const searchAndWait = async (
  page: Page,
  searchPageUrl: string,
  query: string,
): Promise<void> => {
  try {
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
      { timeout: 60000 },
    );
  } catch (error: unknown) {
    const entries = await page
      .locator("#dictionary-entries .entry")
      .count()
      .catch((): number => -1);
    throw new Error(
      `Search ${query} did not settle (entries=${entries}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const entryCount = await page.locator("#dictionary-entries .entry").count();
  if (entryCount === 0) {
    throw new Error(`Search returned no dictionary entry for: ${query}`);
  }
};

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
};

const main = async (): Promise<void> => {
  const parsed = parseImportArguments(process.argv.slice(2));
  if (!parsed.ok) throw new Error(parsed.error.message);

  const options = parsed.value;
  const dictionaryPath = path.resolve(options.dictionaryPath);
  const userDataDirectory = "/tmp/test-user-data-dir-styles";
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
  const buildShotsDirectory = path.resolve(
    import.meta.dirname,
    "../build-shots",
  );
  await mkdir(buildShotsDirectory, { recursive: true });

  browserContext.on("page", (page: Page): void => {
    void closeWelcomePage(page, welcomePageUrl);
  });

  try {
    await welcomePage.goto(welcomePageUrl);
    await Promise.all([
      setLanguage(welcomePage, "en"),
      importDictionary(welcomePage, dictionaryPath),
    ]);

    // what: computed styles + comparison/see relations + emphasis
    await searchAndWait(searchPage, searchPageUrl, "what");
    const whatSnapshot = await snapshotPage(searchPage);
    assert(
      whatSnapshot.targetHighlightBackground === "rgb(255, 165, 0)",
      `target-highlight background, got ${whatSnapshot.targetHighlightBackground}`,
    );
    const expectedExampleMargin =
      whatSnapshot.exampleSentenceFontSize === null
        ? null
        : `${parseFloat(whatSnapshot.exampleSentenceFontSize)}px`;
    assert(
      whatSnapshot.exampleSentenceMarginLeft === expectedExampleMargin,
      `example-sentence margin-left (1em), got ${whatSnapshot.exampleSentenceMarginLeft} expected ${expectedExampleMargin}`,
    );
    assert(
      whatSnapshot.pronunciationFontStyle === "italic",
      `pronunciation font-style, got ${whatSnapshot.pronunciationFontStyle}`,
    );
    assert(
      whatSnapshot.level4ListStyle === "lower-alpha",
      `level-4 list-style-type, got ${whatSnapshot.level4ListStyle}`,
    );
    assert(
      whatSnapshot.comparisonReference,
      "comparison-reference unit missing on what",
    );
    assert(whatSnapshot.compareRelation, "compare relation missing on what");
    assert(whatSnapshot.seeRelation, "see relation missing on what");
    assert(whatSnapshot.emphasis, "emphasis unit missing on what");
    await searchPage.screenshot({
      path: path.join(buildShotsDirectory, "mwu-what-final.png"),
      fullPage: true,
    });

    // turn: called-also
    await searchAndWait(searchPage, searchPageUrl, "turn");
    const turnSnapshot = await snapshotPage(searchPage);
    assert(turnSnapshot.calledAlso, "called-also unit missing on turn");
    await searchPage.screenshot({
      path: path.join(buildShotsDirectory, "mwu-turn-final.png"),
      fullPage: true,
    });

    // o: run-in alternate-form (the variant-reference source mean is a
    // definition-free mean, which the planner deliberately does not emit)
    await searchAndWait(searchPage, searchPageUrl, "o");
    const oSnapshot = await snapshotPage(searchPage);
    assert(
      oSnapshot.variantReference === false || oSnapshot.alternateForm,
      "o page must show the run-in alternate form",
    );
    assert(oSnapshot.alternateForm, "alternate-form unit missing on o");

    console.log("ALL E2E STYLE ASSERTIONS PASSED");
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

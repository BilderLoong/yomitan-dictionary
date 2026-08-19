import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { type BrowserContext, chromium, type Page } from "playwright";
import type { Result } from "../../src/shared/result";
import { type InspectionOptions, queriesFromText } from "./options";

const presentationQueries = [
  "what",
  "in",
  "give",
  "put",
  "sum",
  "down",
  "turn",
  "o",
] as const;

type PresentationQuery = (typeof presentationQueries)[number];
type PresentationSurface = "popup" | "search";

export const getMissingPresentationQueries = (
  options: InspectionOptions,
  searchQueries: readonly string[],
): readonly PresentationQuery[] =>
  options.query === null
    ? presentationQueries.filter(
        (query): boolean => !searchQueries.includes(query),
      )
    : [];

interface PresentationContext {
  readonly query: PresentationQuery;
  readonly surface: PresentationSurface;
}

export type InspectionMode = "visible" | "headless";

export interface InspectionRunOptions extends InspectionOptions {
  readonly mode: InspectionMode;
}

interface ActiveInspectionSettings {
  readonly language: string | null;
  readonly scanResolution: string | null;
  readonly searchResolution: string | null;
  readonly scanningParserEnabled: boolean | null;
  readonly sentenceTerminationCharacters: unknown;
  readonly dictionaryPresent: boolean;
  readonly dictionaryStyles: string | null;
  readonly partsOfSpeechFilter: boolean | null;
}

type JsonRecord = { readonly [key: string]: unknown };

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getRecordProperty = (value: unknown, property: string): unknown =>
  isRecord(value) ? value[property] : undefined;

const asArray = (value: unknown): readonly unknown[] | null =>
  Array.isArray(value) ? value : null;

interface ProfileSettingsRewrite {
  readonly value: unknown;
  readonly replaced: boolean;
}

const replaceDictionaryStylesInProfile = (
  profile: unknown,
  dictionaryTitle: string,
  dictionaryStyles: string,
): ProfileSettingsRewrite => {
  if (!isRecord(profile)) return { value: profile, replaced: false };
  const profileOptions = getRecordProperty(profile, "options");
  if (!isRecord(profileOptions)) return { value: profile, replaced: false };
  const dictionaries = asArray(
    getRecordProperty(profileOptions, "dictionaries"),
  );
  if (dictionaries === null) return { value: profile, replaced: false };

  const rewrittenDictionaries = dictionaries.map((dictionary): unknown => {
    if (!isRecord(dictionary)) return dictionary;
    if (getRecordProperty(dictionary, "name") !== dictionaryTitle) {
      return dictionary;
    }
    return { ...dictionary, styles: dictionaryStyles };
  });
  const replaced = dictionaries.some(
    (dictionary): boolean =>
      isRecord(dictionary) &&
      getRecordProperty(dictionary, "name") === dictionaryTitle,
  );
  return {
    value: {
      ...profile,
      options: {
        ...profileOptions,
        dictionaries: rewrittenDictionaries,
      },
    },
    replaced,
  };
};

export const materializeInspectionSettings = (
  settingsText: string,
  dictionaryTitle: string,
  dictionaryStyles: string,
): Result<string, string> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(settingsText);
  } catch (error) {
    return {
      ok: false,
      error: `Inspection settings are not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      error: "Inspection settings must contain a JSON object",
    };
  }
  const options = getRecordProperty(parsed, "options");
  if (!isRecord(options)) {
    return {
      ok: false,
      error: "Inspection settings do not contain an options object",
    };
  }
  const profiles = asArray(getRecordProperty(options, "profiles"));
  if (profiles === null) {
    return {
      ok: false,
      error: "Inspection settings do not contain a profiles array",
    };
  }

  const rewrites = profiles.map(
    (profile): ProfileSettingsRewrite =>
      replaceDictionaryStylesInProfile(
        profile,
        dictionaryTitle,
        dictionaryStyles,
      ),
  );
  if (!rewrites.some(({ replaced }): boolean => replaced)) {
    return {
      ok: false,
      error: `Inspection settings do not contain dictionary: ${dictionaryTitle}`,
    };
  }

  return {
    ok: true,
    value: `${JSON.stringify(
      {
        ...parsed,
        options: {
          ...options,
          profiles: rewrites.map(({ value }): unknown => value),
        },
      },
      null,
      2,
    )}\n`,
  };
};

const readArchiveTextFile = async (
  archivePath: string,
  fileName: string,
): Promise<string> => {
  const process = Bun.spawn(["unzip", "-p", archivePath, fileName], {
    stderr: "pipe",
    stdout: "pipe",
  });
  if (
    !(process.stdout instanceof ReadableStream) ||
    !(process.stderr instanceof ReadableStream)
  ) {
    throw new Error("Archive reader did not provide piped output");
  }
  const [contents, errorOutput] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);
  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(
      `Cannot read ${fileName} from ${archivePath}: ${errorOutput.trim() || `unzip exited with ${exitCode}`}`,
    );
  }
  if (contents.length === 0) {
    throw new Error(`Archive contains an empty ${fileName}`);
  }
  return contents;
};

export interface InspectionProfile {
  readonly path: string;
  readonly temporary: boolean;
}

export const getOwnedInspectionProfilePath = (
  profile: InspectionProfile | null,
): string | null => (profile?.temporary === true ? profile.path : null);

export const prepareInspectionProfile = async (
  userDataDirectory: string | null,
): Promise<InspectionProfile> => {
  if (userDataDirectory === null) {
    return {
      path: await mkdtemp(path.join(tmpdir(), "mwu-dictionary-inspection-")),
      temporary: true,
    };
  }

  const profilePath = path.resolve(userDataDirectory);
  try {
    const profileStats = await lstat(profilePath);
    if (profileStats.isSymbolicLink()) {
      throw new Error(`Refusing symbolic-link browser profile: ${profilePath}`);
    }
    if (!profileStats.isDirectory()) {
      throw new Error(
        `Browser profile path is not a directory: ${profilePath}`,
      );
    }
    const contents = await readdir(profilePath);
    if (contents.length > 0) {
      throw new Error(
        `Refusing non-empty browser profile; the explicit path is preserved: ${profilePath}`,
      );
    }
  } catch (error) {
    if (getRecordProperty(error, "code") !== "ENOENT") throw error;
    await mkdir(profilePath, { recursive: true });
  }
  return { path: profilePath, temporary: false };
};

const waitForInspectionStop = (browserContext: BrowserContext): Promise<void> =>
  new Promise((resolve) => {
    let settled = false;

    const cleanup = (): void => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      browserContext.off("close", onContextClose);
    };

    const finish = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const onSignal = (): void => finish();
    const onContextClose = (): void => finish();

    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
    browserContext.once("close", onContextClose);
  });

const dictionaryTitle = "Merriam Webster Unabridged";
const recommendedEnglishTerminationCharacters = [
  {
    enabled: true,
    character1: '"',
    character2: '"',
    includeCharacterAtStart: false,
    includeCharacterAtEnd: false,
  },
  {
    enabled: false,
    character1: "'",
    character2: "'",
    includeCharacterAtStart: false,
    includeCharacterAtEnd: false,
  },
  {
    enabled: true,
    character1: ".",
    character2: null,
    includeCharacterAtStart: false,
    includeCharacterAtEnd: true,
  },
  {
    enabled: true,
    character1: "!",
    character2: null,
    includeCharacterAtStart: false,
    includeCharacterAtEnd: true,
  },
  {
    enabled: true,
    character1: "?",
    character2: null,
    includeCharacterAtStart: false,
    includeCharacterAtEnd: true,
  },
  {
    enabled: true,
    character1: "…",
    character2: null,
    includeCharacterAtStart: false,
    includeCharacterAtEnd: true,
  },
] as const;

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

const readActiveInspectionSettings = async (
  page: Page,
  title: string,
): Promise<ActiveInspectionSettings> =>
  page.evaluate(
    async (dictionaryTitle: string): Promise<ActiveInspectionSettings> => {
      const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value);
      const getRecordProperty = (value: unknown, property: string): unknown =>
        isRecord(value) ? value[property] : undefined;
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
      const response = await new Promise<unknown>((resolve, reject): void => {
        chromeApi.runtime.sendMessage(
          { action: "optionsGetFull", params: undefined },
          (result: unknown): void => {
            const error = chromeApi.runtime.lastError;
            if (error !== undefined) {
              reject(
                new Error(error.message ?? "Could not read Yomitan settings"),
              );
              return;
            }
            resolve(result);
          },
        );
      });
      const responseResult = getRecordProperty(response, "result");
      const profileCurrent = getRecordProperty(
        responseResult,
        "profileCurrent",
      );
      const profiles = getRecordProperty(responseResult, "profiles");
      const profile =
        Array.isArray(profiles) &&
        typeof profileCurrent === "number" &&
        Number.isInteger(profileCurrent)
          ? profiles[profileCurrent]
          : undefined;
      const profileOptions = getRecordProperty(profile, "options");
      const dictionaries = getRecordProperty(profileOptions, "dictionaries");
      const dictionary = Array.isArray(dictionaries)
        ? dictionaries.find(
            (candidate: unknown): boolean =>
              getRecordProperty(candidate, "name") === dictionaryTitle,
          )
        : undefined;
      const language = getRecordProperty(
        getRecordProperty(profileOptions, "general"),
        "language",
      );
      const scanResolution = getRecordProperty(
        getRecordProperty(profileOptions, "scanning"),
        "scanResolution",
      );
      const searchResolution = getRecordProperty(
        getRecordProperty(profileOptions, "translation"),
        "searchResolution",
      );
      const scanningParserEnabled = getRecordProperty(
        getRecordProperty(profileOptions, "parsing"),
        "enableScanningParser",
      );
      const sentenceTerminationCharacters = getRecordProperty(
        getRecordProperty(profileOptions, "sentenceParsing"),
        "terminationCharacters",
      );
      const partsOfSpeechFilter = getRecordProperty(
        dictionary,
        "partsOfSpeechFilter",
      );
      const dictionaryStyles = getRecordProperty(dictionary, "styles");
      return {
        language: typeof language === "string" ? language : null,
        scanResolution:
          typeof scanResolution === "string" ? scanResolution : null,
        searchResolution:
          typeof searchResolution === "string" ? searchResolution : null,
        scanningParserEnabled:
          typeof scanningParserEnabled === "boolean"
            ? scanningParserEnabled
            : null,
        sentenceTerminationCharacters: sentenceTerminationCharacters ?? null,
        dictionaryPresent: dictionary !== undefined,
        dictionaryStyles:
          typeof dictionaryStyles === "string" ? dictionaryStyles : null,
        partsOfSpeechFilter:
          typeof partsOfSpeechFilter === "boolean" ? partsOfSpeechFilter : null,
      };
    },
    title,
  );

const settingsMatchInspectionProfile = (
  settings: ActiveInspectionSettings,
  expectedDictionaryStyles: string,
): boolean =>
  settings.language === "en" &&
  settings.scanResolution === "word" &&
  settings.searchResolution === "word" &&
  settings.scanningParserEnabled === false &&
  settings.dictionaryPresent &&
  settings.dictionaryStyles === expectedDictionaryStyles &&
  settings.partsOfSpeechFilter === false &&
  JSON.stringify(settings.sentenceTerminationCharacters) ===
    JSON.stringify(recommendedEnglishTerminationCharacters);

const waitForInspectionSettings = async (
  page: Page,
  title: string,
  expectedDictionaryStyles: string,
): Promise<void> => {
  const deadline = Date.now() + 30000;
  let lastObserved = "unavailable";
  while (Date.now() < deadline) {
    const importError = (
      await page.locator("#settings-import-error-message").textContent()
    )?.trim();
    if (importError !== undefined && importError.length > 0) {
      throw new Error(`Settings import failed: ${importError}`);
    }

    try {
      const settings = await readActiveInspectionSettings(page, title);
      lastObserved = JSON.stringify(settings);
      if (settingsMatchInspectionProfile(settings, expectedDictionaryStyles)) {
        return;
      }
    } catch (error) {
      lastObserved = error instanceof Error ? error.message : String(error);
    }
    await page.waitForTimeout(100);
  }
  throw new Error(
    `Inspection settings were not active after 30 seconds: ${lastObserved}`,
  );
};

const importInspectionSettings = async (
  page: Page,
  settingsPageUrl: string,
  settingsPath: string,
  expectedDictionaryStyles: string,
): Promise<void> => {
  await page.goto(settingsPageUrl);
  await page.waitForFunction(
    (): boolean => document.documentElement.dataset.loaded === "true",
    undefined,
    { timeout: 30000 },
  );
  await page.setInputFiles("#settings-import-file", settingsPath);
  await waitForInspectionSettings(
    page,
    dictionaryTitle,
    expectedDictionaryStyles,
  );
};

const openSearchResult = async (
  page: Page,
  searchPageUrl: string,
  query: string,
): Promise<void> => {
  await page.goto(`${searchPageUrl}?query=${encodeURIComponent(query)}`);
  await page.waitForFunction(
    (): boolean => document.documentElement.dataset.loaded === "true",
    undefined,
    { timeout: 30000 },
  );
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
  // await popupPage.setViewportSize({ width: 360, height: 720 });
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

const assertTargetedEntry = async (
  page: Page,
  query: string,
  surface: PresentationSurface,
): Promise<void> => {
  const entryCount = await page
    .locator('[data-sc-content="mwu-entry"]')
    .count();
  if (entryCount === 0) {
    throw new Error(`${surface} did not render MWU content for: ${query}`);
  }
};

const assertSourceMarkerInlineFlow = async (
  page: Page,
  query: string,
  surface: PresentationSurface,
): Promise<void> => {
  const unwrappedMarkers = await page.evaluate((): readonly string[] =>
    [...document.querySelectorAll("li[data-sc-source-marker-path]")]
      .filter((item): boolean =>
        [...item.childNodes].some(
          (node): boolean =>
            node.nodeType === Node.TEXT_NODE &&
            node.textContent?.trim().length !== 0,
        ),
      )
      .map(
        (item): string =>
          item.getAttribute("data-sc-source-marker-path") ?? "?",
      ),
  );

  if (unwrappedMarkers.length > 0) {
    throw new Error(
      `${surface} source marker ${unwrappedMarkers[0]} splits inline text for: ${query}`,
    );
  }
};

const inspectTargetedQueries = async (
  browserContext: BrowserContext,
  searchPage: Page,
  searchPageUrl: string,
  searchQueries: readonly string[],
): Promise<void> => {
  for (const query of searchQueries) {
    await openSearchResult(searchPage, searchPageUrl, query);
    await assertTargetedEntry(searchPage, query, "search");
    await assertSourceMarkerInlineFlow(searchPage, query, "search");
  }

  const firstQuery = searchQueries[0];
  if (firstQuery === undefined)
    throw new Error("No search queries were supplied");
  const popupPage = await openSearchPopup(
    browserContext,
    searchPage,
    searchPageUrl,
    firstQuery,
  );
  for (const query of searchQueries) {
    if (query !== firstQuery) {
      await openSearchResult(popupPage, searchPageUrl, query);
    }
    await assertTargetedEntry(popupPage, query, "popup");
    await assertSourceMarkerInlineFlow(popupPage, query, "popup");
  }

  console.log(
    `Targeted headless inspection passed for: ${searchQueries.join(", ")}`,
  );
};

const assertEntryPresentation = async (
  page: Page,
  context: PresentationContext,
): Promise<void> => {
  await assertSourceMarkerInlineFlow(page, context.query, context.surface);
  const failures = await page.evaluate(
    ({ query, surface }: PresentationContext): string[] => {
      const body = document.body;
      const content = document.querySelector("#content-scroll");
      const forms = [
        ...document.querySelectorAll(
          '[data-sc-content="mwu-header-inflections"]',
        ),
      ];
      const pronunciation = document.querySelector(
        '[data-sc-content="mwu-header-pronunciation"]',
      );
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
      const exampleGroups = [
        ...document.querySelectorAll('[data-sc-content="example-group"]'),
      ];
      const detachedExampleSources = [
        ...document.querySelectorAll('[data-sc-content="example-source"]'),
      ].filter(
        (node): boolean =>
          node.closest('[data-sc-content="example-sentence"]') === null,
      );
      const firstTextRect = (node: Element | null): DOMRect | null => {
        if (node === null) return null;
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        let current = walker.nextNode();
        while (current !== null) {
          if (current.textContent?.trim()) {
            const range = document.createRange();
            range.selectNodeContents(current);
            const rect = range.getClientRects()[0];
            if (rect !== undefined) return rect;
          }
          current = walker.nextNode();
        }
        return null;
      };
      const firstTextLeft = (node: Element | null): number | null =>
        firstTextRect(node)?.left ?? null;
      const previousTextRect = (
        container: Element,
        node: Element,
        sourceTop: number,
      ): DOMRect | null => {
        const range = document.createRange();
        range.setStart(container, 0);
        range.setEndBefore(node);
        const rects = [...range.getClientRects()].filter(
          (rect): boolean => rect.width > 0 && rect.height > 0,
        );
        return (
          rects
            .filter((rect): boolean => rect.top <= sourceTop + 1)
            .sort((left, right): number => right.top - left.top)[0] ??
          rects.at(-1) ??
          null
        );
      };
      const rectangleContains = (
        container: DOMRect,
        content: DOMRect,
        tolerance: number,
      ): boolean =>
        content.left >= container.left - tolerance &&
        content.right <= container.right + tolerance &&
        content.top >= container.top - tolerance &&
        content.bottom <= container.bottom + tolerance;
      const visibleExampleSources = [
        ...document.querySelectorAll('[data-sc-content="example-source"]'),
      ].filter((source): boolean =>
        source.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }),
      );
      const headerInflectionMarkers = [
        ...document.querySelectorAll(
          '[data-sc-content="mwu-header-inflections"] [data-sc-content="inflection-marker"]',
        ),
      ];
      const disclosures = [
        ...document.querySelectorAll('[data-sc-content="disclosure-summary"]'),
      ];
      const phraseSummaries = [
        ...document.querySelectorAll(
          'details[data-sc-content="phrase-group"] > summary',
        ),
      ];
      const originSummaries = [
        ...document.querySelectorAll(
          'details[data-sc-content="origin"] > summary',
        ),
      ];
      const nativeDictionaryTag = [
        ...document.querySelectorAll(".tag-label"),
      ].find(
        (node): boolean =>
          node.textContent?.includes("Merriam Webster") ?? false,
      );
      const nativePartOfSpeechTag = document.querySelector(
        ".definition-tag-list .tag-label",
      );
      const isVisibleElement = (element: Element): boolean =>
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      const parseCssColor = (
        color: string,
      ): readonly [number, number, number] | null => {
        const srgb = color.match(
          /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/u,
        );
        if (srgb !== null) {
          return [
            Number(srgb[1]) * 255,
            Number(srgb[2]) * 255,
            Number(srgb[3]) * 255,
          ];
        }
        const rgb = color.match(
          /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/u,
        );
        return rgb === null
          ? null
          : [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
      };
      const relativeLuminance = (
        color: readonly [number, number, number],
      ): number => {
        const linearize = (channel: number): number => {
          const normalized = channel / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        return (
          0.2126 * linearize(color[0]) +
          0.7152 * linearize(color[1]) +
          0.0722 * linearize(color[2])
        );
      };
      const effectiveBackgroundColor = (element: Element): string | null => {
        let current: Element | null = element;
        while (current !== null) {
          const backgroundColor = getComputedStyle(current).backgroundColor;
          if (
            backgroundColor !== "rgba(0, 0, 0, 0)" &&
            parseCssColor(backgroundColor) !== null
          ) {
            return backgroundColor;
          }
          current = current.parentElement;
        }
        return null;
      };
      const contrastRatio = (element: Element): number | null => {
        const foreground = parseCssColor(getComputedStyle(element).color);
        const backgroundValue = effectiveBackgroundColor(element);
        const background =
          backgroundValue === null ? null : parseCssColor(backgroundValue);
        if (foreground === null || background === null) return null;
        const foregroundLuminance = relativeLuminance(foreground);
        const backgroundLuminance = relativeLuminance(background);
        return (
          (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
          (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
        );
      };
      const quietMetadata = [
        ...document.querySelectorAll(
          '[data-sc-content="mwu-header-pronunciation"], ' +
            '[data-sc-content="mwu-header-pronunciation-notes"], ' +
            '[data-sc-content="mwu-header-inflections"], ' +
            '[data-sc-content="example-sentence"], ' +
            '[data-sc-content="example-source"], ' +
            '[data-sc-content="example-source-inline"], ' +
            '[data-sc-content="cross-reference"], ' +
            'details[data-sc-content="origin"] > summary > *, ' +
            'details[data-sc-content="related-item"] > summary[data-sc-category="synonym"] > *',
        ),
      ]
        .filter(isVisibleElement)
        .map(
          (
            element,
          ): {
            readonly element: Element;
            readonly ratio: number | null;
            readonly owner: string | null;
          } => ({
            element,
            ratio: contrastRatio(element),
            owner:
              element.closest("details")?.getAttribute("data-sc-content") ??
              null,
          }),
        );
      const sourceMarkerLayouts = [
        ...document.querySelectorAll("li[data-sc-source-marker-path]"),
      ]
        .filter(isVisibleElement)
        .map(
          (
            item,
          ): {
            readonly valid: boolean;
            readonly marker: string;
          } => {
            const marker =
              item.getAttribute("data-sc-source-marker-path") ?? "?";
            const list = item.parentElement;
            const itemStyle = getComputedStyle(item);
            const markerStyle = getComputedStyle(item, "::before");
            return {
              marker,
              valid:
                list !== null &&
                getComputedStyle(list).display === "grid" &&
                itemStyle.display === "grid" &&
                itemStyle.gridTemplateColumns.startsWith("subgrid") &&
                itemStyle.alignItems === "baseline" &&
                markerStyle.content.includes(marker) &&
                markerStyle.gridColumnStart === "1" &&
                [...item.children].every(
                  (child): boolean =>
                    getComputedStyle(child).gridColumnStart === "2",
                ),
            };
          },
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
      if (pronunciation !== null && forms[0] !== undefined) {
        const pronunciationContent = pronunciation.firstElementChild;
        const inflectionContent = forms[0].firstElementChild;
        if (
          pronunciationContent !== null &&
          inflectionContent !== null &&
          Math.abs(
            pronunciationContent.getBoundingClientRect().x -
              inflectionContent.getBoundingClientRect().x,
          ) > 1
        ) {
          failures.push("IPA and inflection rows are not aligned");
        }
      }
      if (
        forms.some((node): boolean => {
          const style = getComputedStyle(node);
          return (
            style.backgroundColor !== "rgba(0, 0, 0, 0)" ||
            style.borderTopWidth !== "0px" ||
            style.borderTopLeftRadius !== "0px"
          );
        })
      ) {
        failures.push("header forms use a competing panel surface");
      }
      if (
        query === "put" &&
        surface === "popup" &&
        !forms.some((node): boolean => node.getBoundingClientRect().height > 40)
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
      if (badgeTags.length === 0)
        failures.push("missing sense-level local tag");
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
      const localTag = badgeTags[0];
      if (
        localTag === undefined ||
        nativePartOfSpeechTag === null ||
        nativeDictionaryTag === undefined
      ) {
        failures.push(
          "missing local, POS, or dictionary tag comparison target",
        );
      } else {
        const localStyle = getComputedStyle(localTag);
        const nativeStyle = getComputedStyle(nativePartOfSpeechTag);
        const localRect = localTag.getBoundingClientRect();
        const nativeRect = nativePartOfSpeechTag.getBoundingClientRect();
        const localContrast = contrastRatio(localTag);
        const nativeContrast = contrastRatio(nativePartOfSpeechTag);
        if (
          localStyle.backgroundColor !== nativeStyle.backgroundColor ||
          localStyle.color !== nativeStyle.color ||
          localStyle.borderRadius !== nativeStyle.borderRadius ||
          localStyle.paddingBlock !== nativeStyle.paddingBlock ||
          localStyle.paddingInline !== nativeStyle.paddingInline ||
          Math.abs(localRect.height - nativeRect.height) > 0.5 ||
          localContrast === null ||
          nativeContrast === null ||
          localContrast + 0.05 < nativeContrast
        ) {
          failures.push("local tag does not match the native POS tag");
        }
        if (
          localStyle.backgroundColor ===
          getComputedStyle(nativeDictionaryTag).backgroundColor
        ) {
          failures.push("local tag is not distinct from the dictionary badge");
        }
      }
      const lowestContrastMetadata = quietMetadata.toSorted(
        (left, right): number =>
          (left.ratio ?? Number.NEGATIVE_INFINITY) -
          (right.ratio ?? Number.NEGATIVE_INFINITY),
      )[0];
      if (
        lowestContrastMetadata === undefined ||
        lowestContrastMetadata.ratio === null ||
        lowestContrastMetadata.ratio < 4.5
      ) {
        failures.push(
          `quiet metadata ${lowestContrastMetadata?.element.getAttribute("data-sc-content") ?? "?"}/${lowestContrastMetadata?.owner ?? "root"} contrast is ${lowestContrastMetadata?.ratio?.toFixed(2) ?? "unknown"}:1`,
        );
      }
      const markerLayoutFailures = sourceMarkerLayouts.filter(
        ({ valid }): boolean => !valid,
      );
      if (sourceMarkerLayouts.length === 0 || markerLayoutFailures.length > 0) {
        failures.push(
          `${markerLayoutFailures.length}/${sourceMarkerLayouts.length} source markers do not use the aligned grid layout; first ${markerLayoutFailures[0]?.marker ?? "?"}`,
        );
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
        exampleGroups.length === 0 ||
        exampleGroups.some((node): boolean => {
          const style = getComputedStyle(node);
          return (
            style.backgroundColor === "rgba(0, 0, 0, 0)" ||
            style.borderTopLeftRadius === "0px" ||
            style.borderTopWidth !== "0px"
          );
        }) ||
        examples.some((node): boolean => {
          const style = getComputedStyle(node);
          return (
            style.backgroundColor !== "rgba(0, 0, 0, 0)" ||
            style.borderTopLeftRadius !== "0px" ||
            style.borderTopWidth !== "0px"
          );
        })
      ) {
        failures.push("examples do not use one quiet shared surface");
      }
      if (detachedExampleSources.length > 0) {
        failures.push("example attributions leave their example frame");
      }
      if (
        visibleExampleSources.some((source): boolean => {
          const sourceRect = source.getBoundingClientRect();
          const frame = source.closest('[data-sc-content="example-group"]');
          if (frame === null) return true;

          const sourceRange = document.createRange();
          sourceRange.selectNodeContents(source);
          const textRects = [...sourceRange.getClientRects()].filter(
            (rect): boolean => rect.width > 0 && rect.height > 0,
          );
          const tolerance = sourceRect.height * 0.1;
          const frameRect = frame.getBoundingClientRect();
          return (
            source.scrollWidth - source.clientWidth > 1 ||
            source.scrollHeight - source.clientHeight > 1 ||
            !rectangleContains(frameRect, sourceRect, tolerance) ||
            textRects.some(
              (rect): boolean =>
                !rectangleContains(sourceRect, rect, tolerance) ||
                !rectangleContains(frameRect, rect, tolerance),
            )
          );
        })
      ) {
        failures.push(
          "example attribution clips or overflows its rendered box/frame",
        );
      }
      if (
        query === "turn" &&
        !visibleExampleSources.some(
          (source): boolean =>
            source.textContent?.includes(
              "Sunday Express (Johannesburg) South Africa",
            ) ?? false,
        )
      ) {
        failures.push("missing long turn example attribution");
      }
      if (
        exampleGroups.some((node): boolean => {
          const style = getComputedStyle(node);
          return (
            style.getPropertyValue("--mwu-example-marker-inset").trim() ===
              "" ||
            style.getPropertyValue("--mwu-example-text-gap").trim() === ""
          );
        })
      ) {
        failures.push("example groups lack shared marker variables");
      }
      const exampleAlignmentDeltas = [
        ...document.querySelectorAll(
          'details[data-sc-content="extra-examples"]',
        ),
      ]
        .map((details): number | null => {
          const summary = details.querySelector(":scope > summary");
          const previous = details.previousElementSibling;
          const example = previous?.matches(
            '[data-sc-content="example-sentence"]',
          )
            ? previous
            : null;
          const summaryLeft = firstTextLeft(summary);
          const exampleLeft = firstTextLeft(example);
          return summaryLeft === null || exampleLeft === null
            ? null
            : Math.abs(summaryLeft - exampleLeft);
        })
        .filter((delta): delta is number => delta !== null);
      if (
        exampleAlignmentDeltas.length > 0 &&
        Math.max(...exampleAlignmentDeltas) > 1
      ) {
        failures.push("example bullets and disclosures are not aligned");
      }
      const wrappedSourceAlignmentDeltas = [
        ...document.querySelectorAll('[data-sc-content="example-source"]'),
      ]
        .map((source): number | null => {
          const sentence = source.closest(
            '[data-sc-content="example-sentence"]',
          );
          const sourceRect = source.getBoundingClientRect();
          const previousRect =
            sentence === null
              ? null
              : previousTextRect(sentence, source, sourceRect.top);
          if (sentence === null || previousRect === null) {
            return null;
          }
          const sentenceStyle = getComputedStyle(sentence);
          const sentenceStart =
            sentence.getBoundingClientRect().left +
            Number.parseFloat(sentenceStyle.paddingInlineStart);
          const startsOnLaterLine =
            sourceRect.top >
            previousRect.top + Math.max(sourceRect.height, previousRect.height);
          return startsOnLaterLine
            ? Math.abs(sourceRect.left - sentenceStart)
            : null;
        })
        .filter((delta): delta is number => delta !== null);
      if (
        wrappedSourceAlignmentDeltas.length > 0 &&
        Math.max(...wrappedSourceAlignmentDeltas) > 1
      ) {
        failures.push("wrapped example attributions are not aligned");
      }
      if (
        headerInflectionMarkers.some((node): boolean => {
          const text = node.textContent ?? "";
          return text.includes("/") && !/\s\/\s/u.test(text);
        })
      ) {
        failures.push("slash-separated inflection markers are not spaced");
      }
      const phraseSummary = phraseSummaries.at(0);
      const originSummary = originSummaries.at(0);
      if (phraseSummary !== undefined && originSummary !== undefined) {
        const phraseStyle = getComputedStyle(phraseSummary);
        const originStyle = getComputedStyle(originSummary);
        if (
          phraseStyle.color === originStyle.color ||
          Number.parseInt(phraseStyle.fontWeight, 10) <=
            Number.parseInt(originStyle.fontWeight, 10)
        ) {
          failures.push("phrase disclosure does not outrank origin");
        }
      }
      const sectionDetails = [
        ...document.querySelectorAll(
          'details[data-sc-content="origin"], details[data-sc-content="phrase-group"], details[data-sc-content="related-item"]',
        ),
      ];
      if (
        sectionDetails.some((details): boolean => {
          const summary = details.querySelector(":scope > summary");
          if (summary === null) return true;
          const detailsStyle = getComputedStyle(details);
          const detailsRect = details.getBoundingClientRect();
          const summaryRect = summary.getBoundingClientRect();
          return (
            detailsStyle.marginInlineStart !== "0px" ||
            detailsStyle.paddingInlineStart !== "0px" ||
            detailsStyle.borderInlineStartWidth !== "0px" ||
            Math.abs(detailsRect.x - summaryRect.x) > 1
          );
        })
      ) {
        failures.push(
          "section summaries are not aligned without a left border",
        );
      }
      const originSections = [
        ...document.querySelectorAll<HTMLDetailsElement>(
          'details[data-sc-content="origin"]',
        ),
      ];
      if (
        originSections.some((originDetails): boolean => {
          const originText = originDetails.querySelector(
            ':scope > [data-sc-content="origin-text"]',
          );
          const originSummary = originDetails.querySelector(":scope > summary");
          if (originText === null || originSummary === null) return true;
          const wasOpen = originDetails.open;
          originDetails.open = true;
          const originTextStyle = getComputedStyle(originText);
          const summaryRect = originSummary.getBoundingClientRect();
          const textRect = originText.getBoundingClientRect();
          const isMisaligned =
            originTextStyle.borderInlineStartWidth !== "0px" ||
            originTextStyle.marginInlineStart !== "0px" ||
            Math.abs(summaryRect.x - textRect.x) > 1;
          originDetails.open = wasOpen;
          return isMisaligned;
        })
      ) {
        failures.push("origin bodies are not aligned with their summaries");
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
    },
    context,
  );
  if (failures.length > 0) {
    throw new Error(
      `${context.surface} presentation failed for ${context.query}: ${failures.join(", ")}`,
    );
  }
};

const assertPronunciationNotePresentation = async (
  page: Page,
  surface: PresentationSurface,
): Promise<void> => {
  const failures = await page.evaluate((): string[] => {
    const notes = [
      ...document.querySelectorAll(
        '[data-sc-content="mwu-header-pronunciation-notes"]',
      ),
    ];
    const pronunciation = document.querySelector(
      '[data-sc-content="mwu-header-pronunciation"]',
    );
    const failures: string[] = [];
    if (notes.length === 0) failures.push("missing pronunciation note");
    if (
      notes.some((node): boolean => {
        const style = getComputedStyle(node);
        return (
          style.backgroundColor !== "rgba(0, 0, 0, 0)" ||
          style.borderInlineStartWidth !== "0px" ||
          style.marginInlineStart !== "0px"
        );
      })
    ) {
      failures.push("pronunciation note uses a competing panel");
    }
    const pronunciationContent = pronunciation?.firstElementChild;
    if (pronunciationContent !== undefined && pronunciationContent !== null) {
      const pronunciationX = pronunciationContent.getBoundingClientRect().x;
      if (
        notes.some(
          (node): boolean =>
            Math.abs(node.getBoundingClientRect().x - pronunciationX) > 1,
        )
      ) {
        failures.push("pronunciation note is not aligned with IPA");
      }
    }
    return failures;
  });
  if (failures.length > 0) {
    throw new Error(
      `${surface} pronunciation-note presentation failed: ${failures.join(", ")}`,
    );
  }
};

const setTheme = async (page: Page, theme: "dark" | "light"): Promise<void> => {
  await page.evaluate((value: string): void => {
    document.documentElement.dataset.theme = value;
  }, theme);
  await page.waitForTimeout(180);
};

const assertDisclosureKeyboardInteraction = async (
  page: Page,
): Promise<void> => {
  const summary = page
    .locator('details[data-sc-content="extra-examples"] > summary')
    .first();
  await summary.focus();
  const initialState = await summary.evaluate(
    (
      element,
    ): {
      readonly focused: boolean;
      readonly open: boolean;
      readonly outlineStyle: string;
      readonly outlineWidth: string;
    } => {
      const style = getComputedStyle(element);
      return {
        focused: document.activeElement === element,
        open: element.parentElement?.hasAttribute("open") ?? false,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    },
  );
  if (
    !initialState.focused ||
    initialState.open ||
    initialState.outlineStyle === "none" ||
    Number.parseFloat(initialState.outlineWidth) < 2
  ) {
    throw new Error("Disclosure does not show its closed keyboard focus state");
  }
  await page.keyboard.press("Enter");
  if (
    !(await summary.evaluate(
      (element): boolean =>
        element.parentElement?.hasAttribute("open") ?? false,
    ))
  ) {
    throw new Error("Disclosure did not open with Enter");
  }
  await page.keyboard.press("Enter");
  if (
    await summary.evaluate(
      (element): boolean =>
        element.parentElement?.hasAttribute("open") ?? false,
    )
  ) {
    throw new Error("Disclosure did not close with Enter");
  }
};

const resolveSearchQueries = async (
  options: InspectionOptions,
): Promise<readonly string[]> => {
  const queryText = options.queryFilePath
    ? await readFile(path.resolve(options.queryFilePath), "utf8")
    : options.query;

  if (queryText === null || queryText.trim() === "") {
    throw new Error("No search queries were supplied");
  }

  const searchQueries = queriesFromText(queryText);

  if (searchQueries.length === 0) {
    throw new Error("No search queries were supplied");
  }
  return searchQueries;
};

export const getVisibleInspectionStatus = (
  query: string,
  close: boolean,
): string =>
  close
    ? `Visible inspection completed for ${query}; browser will close after this bounded run`
    : `Visible inspection ready for ${query}; browser remains open until stopped`;

const saveScreenshot = async (
  page: Page,
  screenshotPath: string | null,
): Promise<void> => {
  if (screenshotPath === null) return;
  const resolvedPath = path.resolve(screenshotPath);
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await page.screenshot({ path: resolvedPath, fullPage: true });
};

const createInspectionSettingsFile = async (
  dictionaryPath: string,
  temporaryDirectory: string,
): Promise<{ readonly path: string; readonly styles: string }> => {
  const [premadeSettings, dictionaryStyles] = await Promise.all([
    readFile(
      path.resolve(import.meta.dirname, "./yomitan-inspection-settings.json"),
      "utf8",
    ),
    readArchiveTextFile(dictionaryPath, "styles.css"),
  ]);
  const materializedSettings = materializeInspectionSettings(
    premadeSettings,
    dictionaryTitle,
    dictionaryStyles,
  );
  if (!materializedSettings.ok) {
    throw new Error(materializedSettings.error);
  }
  const settingsPath = path.join(
    temporaryDirectory,
    "yomitan-inspection-settings.json",
  );
  await writeFile(settingsPath, materializedSettings.value);
  return { path: settingsPath, styles: dictionaryStyles };
};

export const runDictionaryInspection = async (
  runOptions: InspectionRunOptions,
): Promise<void> => {
  const { mode, ...options } = runOptions;
  const searchQueries = await resolveSearchQueries(options);
  if (mode === "headless") {
    const missingPresentationQueries = getMissingPresentationQueries(
      options,
      searchQueries,
    );
    if (missingPresentationQueries.length > 0) {
      throw new Error(
        `Presentation queries are missing from the real-source build: ${missingPresentationQueries.join(", ")}`,
      );
    }
  }

  const dictionaryPath = path.resolve(options.dictionaryPath);
  let profile: InspectionProfile | null = null;
  let temporarySettingsDirectory: string | null = null;
  let browserContext: BrowserContext | null = null;
  let browserContextClosed = false;
  try {
    profile = await prepareInspectionProfile(options.userDataDirectory);
    temporarySettingsDirectory = await mkdtemp(
      path.join(tmpdir(), "mwu-dictionary-inspection-settings-"),
    );
    const inspectionSettings = await createInspectionSettingsFile(
      dictionaryPath,
      temporarySettingsDirectory,
    );

    const pathToExtension = path.resolve(
      options.extensionPath ??
        path.resolve(
          import.meta.dirname,
          "../../tests/fixture/yomitan-chrome-playwright",
        ),
    );
    const launchArgs = [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      ...options.chromeFlags,
    ];
    browserContext = await chromium.launchPersistentContext(profile.path, {
      headless: mode === "headless",
      channel: "chromium",
      args: launchArgs,
    });
    browserContext.on("close", (): void => {
      browserContextClosed = true;
    });

    const extensionUrlPrefix =
      "chrome-extension://mlbjoknafgaddicpadejdmfnimmacble";
    const searchPageUrl = `${extensionUrlPrefix}/search.html`;
    const settingsPageUrl = `${extensionUrlPrefix}/settings.html`;
    const welcomePageUrl = `${extensionUrlPrefix}/welcome.html`;

    const welcomePage = await browserContext.newPage();
    const searchPage = await browserContext.newPage();
    const settingsPage = await browserContext.newPage();
    browserContext.on("page", (page: Page): void => {
      void closeWelcomePage(page, welcomePageUrl);
    });

    await welcomePage.goto(welcomePageUrl);
    await importDictionary(welcomePage, dictionaryPath);
    await importInspectionSettings(
      settingsPage,
      settingsPageUrl,
      inspectionSettings.path,
      inspectionSettings.styles,
    );
    await welcomePage.close();
    await settingsPage.close();

    const themes = ["light", "dark"] as const;
    // await searchPage.setViewportSize({ width: 1100, height: 900 });
    if (mode === "visible") {
      const query = searchQueries.join(" ");
      if (query === undefined) throw new Error("No visible query was supplied");
      await openSearchResult(searchPage, searchPageUrl, query);
      await setTheme(searchPage, "light");
      await saveScreenshot(searchPage, options.screenshotPath);
      console.log(getVisibleInspectionStatus(query, options.close));
      if (!options.close) await waitForInspectionStop(browserContext);
      return;
    }

    if (options.query !== null) {
      await inspectTargetedQueries(
        browserContext,
        searchPage,
        searchPageUrl,
        searchQueries,
      );
      return;
    }

    for (const query of presentationQueries) {
      await openSearchResult(searchPage, searchPageUrl, query);
      for (const theme of themes) {
        await setTheme(searchPage, theme);
        await assertEntryPresentation(searchPage, {
          query,
          surface: "search",
        });
        if (query === "in") {
          await assertPronunciationNotePresentation(searchPage, "search");
        }
      }
    }

    const firstPopupQuery = presentationQueries[0];
    const popupPage = await openSearchPopup(
      browserContext,
      searchPage,
      searchPageUrl,
      firstPopupQuery,
    );
    for (const query of presentationQueries) {
      if (query !== firstPopupQuery) {
        await openSearchResult(popupPage, searchPageUrl, query);
      }
      for (const theme of themes) {
        await setTheme(popupPage, theme);
        await assertEntryPresentation(popupPage, {
          query,
          surface: "popup",
        });
        if (query === "in") {
          await assertPronunciationNotePresentation(popupPage, "popup");
        }
      }
    }

    await openSearchResult(popupPage, searchPageUrl, "turn");
    await setTheme(popupPage, "light");
    await assertDisclosureKeyboardInteraction(popupPage);
    await saveScreenshot(popupPage, options.screenshotPath);
    console.log(
      `Presentation checks passed for 32 states and keyboard disclosure use; final popup ${popupPage.url()} (360px viewport)`,
    );
    if (!options.close) await waitForInspectionStop(browserContext);
  } finally {
    if (browserContext !== null && !browserContextClosed) {
      await browserContext.close();
    }
    const ownedProfilePath = getOwnedInspectionProfilePath(profile);
    if (ownedProfilePath !== null) {
      await rm(ownedProfilePath, { force: true, recursive: true });
    }
    if (temporarySettingsDirectory !== null) {
      await rm(temporarySettingsDirectory, { force: true, recursive: true });
    }
  }
};

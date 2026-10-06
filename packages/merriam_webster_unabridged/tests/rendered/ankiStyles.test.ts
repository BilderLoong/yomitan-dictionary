import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type BrowserContext, chromium, type Page } from "playwright";

import { materializeInspectionSettings } from "../../scripts/dictionary-inspection/run";
import { runBuild } from "../../src/pipeline/runBuild";

const assertAnkiStyles = async (
  page: Page,
  styles: string,
  query: string,
): Promise<void> => {
  const failures = await page.evaluate(
    async (css: string): Promise<string[]> => {
      const entries = [
        ...document.querySelectorAll('[data-sc-content="mwu-entry"]'),
      ];
      const frame = document.createElement("iframe");
      frame.style.cssText =
        "position:fixed;left:-20000px;width:1100px;height:900px";
      const loaded = new Promise<void>((resolve): void => {
        frame.onload = (): void => resolve();
      });
      frame.srcdoc = "<!doctype html><html><head></head><body></body></html>";
      document.body.append(frame);
      try {
        await loaded;
        const card = frame.contentDocument;
        const view = frame.contentWindow;
        if (card === null || view === null) return ["missing card document"];
        const stylesheet = card.createElement("style");
        stylesheet.textContent = css;
        card.head.append(stylesheet);
        card.body.append(
          ...entries.map((entry): Node => card.importNode(entry, true)),
        );
        card.querySelectorAll("details").forEach((details): void => {
          details.open = true;
        });
        const canvas = card.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const paint = canvas.getContext("2d");
        if (paint === null) return ["missing color renderer"];
        const luminance = (color: Uint8ClampedArray): number =>
          [0.2126, 0.7152, 0.0722].reduce((total, weight, index): number => {
            const channel = (color[index] ?? 0) / 255;
            return (
              total +
              weight *
                (channel <= 0.04045
                  ? channel / 12.92
                  : ((channel + 0.055) / 1.055) ** 2.4)
            );
          }, 0);
        const contrast = (element: Element, background: string): number => {
          paint.fillStyle = background;
          paint.fillRect(0, 0, 1, 1);
          const ancestors = [element];
          for (
            let parent = element.parentElement;
            parent !== null;
            parent = parent.parentElement
          ) {
            ancestors.unshift(parent);
          }
          for (const ancestor of ancestors) {
            paint.fillStyle = view.getComputedStyle(ancestor).backgroundColor;
            paint.fillRect(0, 0, 1, 1);
          }
          const backdrop = luminance(paint.getImageData(0, 0, 1, 1).data);
          paint.fillStyle = view.getComputedStyle(element).color;
          paint.fillRect(0, 0, 1, 1);
          const foreground = luminance(paint.getImageData(0, 0, 1, 1).data);
          return (
            (Math.max(foreground, backdrop) + 0.05) /
            (Math.min(foreground, backdrop) + 0.05)
          );
        };
        const failures: string[] = [];
        for (const theme of ["light", "dark"] as const) {
          const background = theme === "dark" ? "#2f2f31" : "#ffffff";
          card.body.className = theme === "dark" ? "card nightMode" : "card";
          card.body.style.backgroundColor = background;
          card.body.style.color = theme === "dark" ? "#beb8b8" : "#242424";
          for (const fontSize of [14, 32]) {
            card.body.style.fontSize = `${fontSize}px`;
            const hostColor = view.getComputedStyle(card.body).color;
            for (const definition of card.querySelectorAll(
              '[data-sc-content="definition-text"]',
            )) {
              if (view.getComputedStyle(definition).color !== hostColor) {
                failures.push(
                  `${theme}/${fontSize}px: definition ignores the card text color`,
                );
                break;
              }
            }
            const metadata = card.querySelectorAll(
              '[data-sc-content="example-sentence"], [data-sc-content="inflection-label"], ' +
                'li[data-sc-source-marker-path], [data-sc-content="origin"] > summary',
            );
            for (const element of metadata) {
              if (
                element.checkVisibility() &&
                contrast(element, background) < 4.5
              ) {
                failures.push(
                  `${theme}/${fontSize}px: low contrast for ${element.getAttribute("data-sc-content")}`,
                );
                break;
              }
            }
            for (const tag of card.querySelectorAll(
              '[data-sc-content="tag"], span[data-sc-content="verb-subtype"]',
            )) {
              if (
                !tag.checkVisibility() ||
                tag.closest('[data-sc-content="mwu-header"]') !== null
              )
                continue;
              const style = view.getComputedStyle(tag);
              if (
                Number.parseFloat(style.fontSize) >= fontSize ||
                Number.parseFloat(style.paddingTop) <= 0 ||
                Number.parseFloat(style.borderRadius) <= 0 ||
                Number.parseFloat(style.minHeight) <= 0
              ) {
                failures.push(`${theme}/${fontSize}px: incomplete tag sizing`);
                break;
              }
              if (contrast(tag, background) < 4.5) {
                failures.push(`${theme}/${fontSize}px: low tag contrast`);
                break;
              }
            }
          }
        }
        return failures;
      } finally {
        frame.remove();
      }
    },
    styles,
  );
  if (failures.length > 0) {
    throw new Error(`Anki styling failed for ${query}: ${failures.join(", ")}`);
  }
};

test("real MWU content keeps readable colors and complete tag sizes without Yomitan theme variables", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "mwu-anki-styles-"));
  let browser: BrowserContext | null = null;
  try {
    const stylesPath = new URL("../../styles.css", import.meta.url).pathname;
    const attempt = await runBuild({
      requestedWords: ["tumult", "what", "turn"],
      databasePath: new URL("../../assets/MWU.db", import.meta.url).pathname,
      buildPaths: {
        outputDirectory: temporaryDirectory,
        reportPath: join(temporaryDirectory, "build-report.json"),
        stylesPath,
      },
    });
    expect(
      attempt.ok,
      attempt.ok ? "" : JSON.stringify(attempt.report.errors),
    ).toBe(true);
    if (!attempt.ok) return;

    const styles = await readFile(stylesPath, "utf8");
    const settings = materializeInspectionSettings(
      await readFile(
        new URL(
          "../../scripts/dictionary-inspection/yomitan-inspection-settings.json",
          import.meta.url,
        ),
        "utf8",
      ),
      "Merriam Webster Unabridged",
      styles,
    );
    expect(settings.ok, settings.ok ? "" : settings.error).toBe(true);
    if (!settings.ok) return;
    const settingsPath = join(temporaryDirectory, "settings.json");
    await writeFile(settingsPath, settings.value);
    const extensionPath = new URL(
      "../fixture/yomitan-chrome-playwright",
      import.meta.url,
    ).pathname;
    browser = await chromium.launchPersistentContext(
      join(temporaryDirectory, "profile"),
      {
        headless: true,
        channel: "chromium",
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
      },
    );
    const page = await browser.newPage();
    const extensionUrl = "chrome-extension://mlbjoknafgaddicpadejdmfnimmacble";
    await page.goto(`${extensionUrl}/welcome.html`);
    await page.setInputFiles(
      "#dictionary-import-file-input",
      attempt.archivePath,
    );
    await page.waitForSelector('#dictionary-list[data-count="1"]', {
      state: "attached",
    });
    expect(
      (await page.locator("#dictionary-error").textContent())?.trim(),
    ).toBe("");
    await page.goto(`${extensionUrl}/settings.html`);
    await page.waitForFunction(
      () => document.documentElement.dataset.loaded === "true",
    );
    await page.setInputFiles("#settings-import-file", settingsPath);
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLSelectElement>(
          '[data-setting="general.language"]',
        )?.value === "en",
    );

    for (const query of ["tumult", "what", "turn"]) {
      await page.goto(`${extensionUrl}/search.html?query=${query}`);
      await page.waitForSelector('[data-sc-content="definition-text"]');
      expect(
        await page.locator('[data-sc-content="example-sentence"]').count(),
      ).toBeGreaterThan(0);
      if (query === "what") {
        expect(
          await page.locator('[data-sc-content="tag"]').count(),
        ).toBeGreaterThan(0);
      }
      await assertAnkiStyles(page, styles, query);
    }
  } finally {
    await browser?.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}, 60_000);

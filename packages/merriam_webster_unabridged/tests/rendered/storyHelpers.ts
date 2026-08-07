import { expect } from "storybook/test";

/**
 * Shared play-function assertions for the rendered-entry stories. They assert
 * the same render contract as the bun tests, against the live browser DOM of
 * the story, so the displayed entry is the asserted entry.
 */

export const assertRenderedEntry = (root: HTMLElement): void => {
  expect(root.querySelector('[data-sc-content="mwu-entry"]')).not.toBeNull();
  const text = root.textContent ?? "";
  expect(text).not.toContain("gdlookup://");
  expect(text).not.toContain("bword://");
};

export const assertMeanRendered = (root: HTMLElement): void => {
  expect(root.querySelector('[data-sc-content="sense-number"]')).not.toBeNull();
  const text = root.textContent ?? "";
  expect(text).not.toContain("gdlookup://");
  expect(text).not.toContain("bword://");
};

export const assertCollapsedExamples = (
  root: HTMLElement,
  requireInline = true,
): void => {
  const extras = [
    ...root.querySelectorAll('details[data-sc-content="extra-examples"]'),
  ];
  for (const details of extras) {
    expect(details.hasAttribute("open")).toBe(false);
    const summary = details.querySelector("summary");
    const count = details.querySelectorAll(
      '[data-sc-content="example-sentence"]',
    ).length;
    const label = `${count} more ${count === 1 ? "example" : "examples"}`;
    expect(summary?.textContent ?? "").toBe(label);
  }
  const inline = [
    ...root.querySelectorAll('[data-sc-content="example-sentence"]'),
  ].filter(
    (element: Element): boolean =>
      element.closest('details[data-sc-content="extra-examples"]') === null,
  );
  if (requireInline) {
    expect(inline.length).toBeGreaterThan(0);
  }
};


export const findPhraseSection = (
  root: HTMLElement,
  canonical: string,
): HTMLDetailsElement | null =>
  (
    [
      ...root.querySelectorAll('details[data-sc-content="phrase"]'),
    ] as HTMLDetailsElement[]
  ).find((element: HTMLDetailsElement): boolean =>
    (element.querySelector("summary")?.textContent ?? "").startsWith(canonical),
  ) ?? null;

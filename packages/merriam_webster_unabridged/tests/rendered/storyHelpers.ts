/**
 * Storybook helper for the interaction stories. The render-contract asserts
 * that lived here (assertRenderedEntry, assertMeanRendered,
 * assertCollapsedExamples) were ported to bun tests in tests/rendered/ and
 * removed; storybook now plays only interactions, visuals aside.
 */

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

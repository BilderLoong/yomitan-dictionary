import { expect } from "storybook/test";

import { renderToHtml } from "../helpers/renderToHtml";
import { whatConverted } from "./fixtures";
import { findPhraseSection } from "./storyHelpers";

export default { title: "Entries/what" };

export const What = {
  render: (): string => renderToHtml(whatConverted.content),
};

export const WhatReferenceStyle = {
  render: (): string => renderToHtml(whatConverted.content),
  play: async ({
    canvasElement,
  }: {
    readonly canvasElement: HTMLElement;
  }): Promise<void> => {
    const references = canvasElement.querySelectorAll(
      '[data-sc-content="cross-reference"]',
    );
    expect(references.length).toBeGreaterThan(0);

    for (const colorScheme of ["light", "dark"] as const) {
      canvasElement.style.colorScheme = colorScheme;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      references.forEach((element) => {
        const computed = getComputedStyle(element);
        expect(element.closest("a")).toBeNull();
        expect(computed.cursor).toBe("default");
        expect(computed.textDecorationLine).toContain("underline");
        expect(computed.textDecorationStyle).toBe("dotted");
        expect(computed.fontWeight).toBe("600");
      });
    }
  },
};

/**
 * The only interaction story: proves the native details/summary toggle works
 * in a real browser. The closed-state and summary-text contract behind it is
 * asserted by the bun tests.
 */
export const WhatPhraseExpands = {
  render: (): string => renderToHtml(whatConverted.content),
  play: async ({
    canvasElement,
    userEvent,
  }: {
    readonly canvasElement: HTMLElement;
    readonly userEvent: { readonly click: (element: Element) => Promise<void> };
  }): Promise<void> => {
    const section = findPhraseSection(canvasElement, "what's what");
    expect(section).not.toBeNull();
    if (section === null) return;
    expect(section.hasAttribute("open")).toBe(false);
    const summary = section.querySelector("summary");
    expect(summary).not.toBeNull();
    if (summary === null) return;
    await userEvent.click(summary);
    expect(section.hasAttribute("open")).toBe(true);
  },
};

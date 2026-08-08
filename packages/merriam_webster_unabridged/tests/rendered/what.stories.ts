import { expect } from "storybook/test";

import { renderToHtml } from "../helpers/renderToHtml";
import { whatConverted } from "./fixtures";
import { findPhraseSection } from "./storyHelpers";

export default { title: "Entries/what" };

export const What = {
  render: (): string => renderToHtml(whatConverted.content),
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

import { expect } from "storybook/test";

import { renderToHtml } from "../helpers/renderToHtml";
import { whatConverted } from "./fixtures";
import {
  assertCollapsedExamples,
  assertRenderedEntry,
  findPhraseSection,
} from "./storyHelpers";

export default { title: "Entries/what" };

export const What = {
  render: (): string => renderToHtml(whatConverted.content),
  play: async ({
    canvasElement,
  }: {
    readonly canvasElement: HTMLElement;
  }): Promise<void> => {
    assertRenderedEntry(canvasElement);
    assertCollapsedExamples(canvasElement);
  },
};

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

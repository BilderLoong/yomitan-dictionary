import type { StoryObj } from "@storybook/html-vite";
import type { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";

import type { ConvertedCanonical } from "../../src/conversion/types";
import { renderToHtml } from "../helpers/renderToHtml";
import { meanFragments } from "./meanFragments";
import { assertCollapsedExamples, assertMeanRendered } from "./storyHelpers";

/**
 * One story per numbered mean of a converted entry. Each story renders only
 * that mean's subtree and asserts the render contract scoped to it, so every
 * sense is displayed and tested individually.
 */

interface PlayArgs {
  readonly canvasElement: HTMLElement;
}

const storyName = (label: string): string => `Mean ${label}`;

const exportName = (label: string): string => {
  const words = label
    .split(/[^0-9a-zA-Z]+/u)
    .filter((word: string): boolean => word.length > 0)
    .map((word: string): string => word[0].toUpperCase() + word.slice(1));
  return `Mean${words.join("")}`;
};

const meanStory = (
  node: StructuredContent,
  label: string,
): StoryObj<PlayArgs> => ({
  storyName: storyName(label),
  render: (): string => renderToHtml(node),
  play: async ({ canvasElement }: PlayArgs): Promise<void> => {
    assertMeanRendered(canvasElement);
    const hasExamples =
      canvasElement.querySelector('[data-sc-content="example-sentence"]') !==
      null;
    assertCollapsedExamples(canvasElement, hasExamples);
  },
});

export const perMeanStories = (
  converted: ConvertedCanonical,
): Record<string, StoryObj<PlayArgs>> => {
  const stories: Record<string, StoryObj<PlayArgs>> = {};
  for (const fragment of meanFragments(converted.content)) {
    stories[exportName(fragment.label)] = meanStory(
      fragment.node,
      fragment.label,
    );
  }
  return stories;
};

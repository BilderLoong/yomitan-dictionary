import type { StoryObj } from "@storybook/html-vite";
import type { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";

import type { ConvertedCanonical } from "../../src/conversion/types";
import { renderToHtml } from "../helpers/renderToHtml";
import { meanFragments } from "./meanFragments";

/**
 * One story per numbered mean of a converted entry. Each story renders only
 * that mean's subtree so every sense can be inspected visually. The render
 * contract for each subtree is asserted by the bun tests
 * (tests/rendered/meanRender.test.ts); the play functions that duplicated
 * those asserts were removed.
 */

const storyName = (label: string): string => `Mean ${label}`;

const exportName = (label: string): string => {
  const words = label
    .split(/[^0-9a-zA-Z]+/u)
    .filter((word: string): boolean => word.length > 0)
    .map((word: string): string => word[0].toUpperCase() + word.slice(1));
  return `Mean${words.join("")}`;
};

const meanStory = (node: StructuredContent, label: string): StoryObj => ({
  storyName: storyName(label),
  render: (): string => renderToHtml(node),
});

export const perMeanStories = (
  converted: ConvertedCanonical,
): Record<string, StoryObj> => {
  const stories: Record<string, StoryObj> = {};
  for (const fragment of meanFragments(converted.content)) {
    stories[exportName(fragment.label)] = meanStory(
      fragment.node,
      fragment.label,
    );
  }
  return stories;
};

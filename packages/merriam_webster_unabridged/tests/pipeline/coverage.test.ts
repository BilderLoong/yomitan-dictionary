import { expect, test } from "bun:test";
import type { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";

import {
  computeTextCoverage,
  renderedText,
  textTokens,
} from "../../src/pipeline/coverage";

test("tokenizes lowercase words and apostrophes", () => {
  expect(textTokens("Take the word — what's in it? O'Reilly, 2nd")).toEqual([
    "take",
    "the",
    "word",
    "what's",
    "in",
    "it",
    "o'reilly",
    "2nd",
  ]);
});

test("extracts text from nested structured content", () => {
  const content: StructuredContent = {
    tag: "div",
    content: [
      "visible ",
      { tag: "span", content: "text" },
      {
        tag: "details",
        content: [{ tag: "summary", content: "more" }, "hidden"],
      },
      { tag: "br" },
    ],
  };

  expect(renderedText(content).replace(/\s+/gu, " ").trim()).toBe(
    "visible text more hidden",
  );
});

test("computes coverage from unique source tokens", () => {
  const content: StructuredContent = {
    tag: "div",
    content: ["to cause movement around an axis, as a wheel"],
  };
  const metrics = computeTextCoverage(
    "to cause movement around an axis, as a wheel does",
    content,
  );

  expect(metrics.coverage).toBeCloseTo(0.9);
  expect(metrics.missingTokens).toEqual(["does"]);
  expect(metrics.sourceTokenCount).toBe(10);
  expect(metrics.renderedTokenCount).toBe(9);
});

test("reports full coverage for empty source", () => {
  const metrics = computeTextCoverage("", { tag: "div", content: [] });

  expect(metrics.coverage).toBe(1);
  expect(metrics.missingTokens).toEqual([]);
});

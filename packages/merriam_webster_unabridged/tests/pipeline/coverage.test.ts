import { expect, test } from "bun:test";

import { convertCanonical } from "../../src/conversion/convertCanonical";
import { analyzeConversionCoverage } from "../../src/conversion/coverage";
import { mainCanonicalEntryPlan } from "../helpers/level1Factories";

test("reports a covered conversion when source words survive rendering", () => {
  const result = convertCanonical(
    mainCanonicalEntryPlan({
      term: "sample",
      ownerHtml:
        '<mean><div class="entry-header"><h1 class="hword">sample</h1>' +
        '<span class="fl">noun</span></div>' +
        '<div class="section" data-id="definition"><span class="dt">a sample definition</span></div>' +
        "</mean>",
    }),
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(analyzeConversionCoverage(result.value)).toMatchObject({
    term: "sample",
    findingCount: 0,
    status: "covered",
    missingSourceTokens: [],
  });
});

test("flags a conversion that preserved text through an unclassified subtree", () => {
  const result = convertCanonical(
    mainCanonicalEntryPlan({
      term: "sample",
      ownerHtml:
        '<mean><div class="entry-header"><h1 class="hword">sample</h1>' +
        '<span class="fl">noun</span></div>' +
        '<div class="section" data-id="definition"><span class="dt">a sample definition</span>' +
        '<section class="mystery">unclassified note</section></div></mean>',
    }),
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(analyzeConversionCoverage(result.value)).toMatchObject({
    findingCount: 1,
    status: "unclassified-content",
    missingSourceTokens: [],
  });
});

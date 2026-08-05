import { expect, test } from "bun:test";

import { convertCanonical } from "../../src/conversion/convertCanonical";
import { mainCanonicalEntryPlan } from "../helpers/level1Factories";

test("converts only the canonical owner html in source order", () => {
  const result = convertCanonical(
    mainCanonicalEntryPlan({
      term: "give",
      ownerHtml:
        '<mean><span class="dt">transfer possession</span>' +
        '<span class="dt">provide</span></mean>',
    }),
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const serialized = JSON.stringify(result.value.content);
  expect(serialized).toContain("transfer possession");
  expect(serialized).toContain("provide");
  expect(serialized.indexOf("transfer possession")).toBeLessThan(
    serialized.indexOf("provide"),
  );
});

test("keeps visible link text but drops GoldenDict targets", () => {
  const result = convertCanonical(
    mainCanonicalEntryPlan({
      term: "O",
      ownerHtml:
        '<mean><span class="cxl-ref">variant of ' +
        '<a href="gdlookup://localhost/o">o</a></span></mean>',
    }),
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const serialized = JSON.stringify(result.value.content);
  expect(serialized).toContain("variant of");
  expect(serialized).toContain("o");
  expect(serialized).not.toContain("gdlookup://");
});

test("renders one fallback and one finding for an unsupported subtree", () => {
  const result = convertCanonical(
    mainCanonicalEntryPlan({
      term: "give",
      ownerHtml:
        '<mean><section class="mystery">unmapped visible text' +
        '<span class="dt">nested text</span></section></mean>',
    }),
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.findings).toHaveLength(1);
  expect(
    JSON.stringify(result.value.content).match(/unmapped visible text/g),
  ).toHaveLength(1);
});

test("rejects an empty canonical owner", () => {
  expect(
    convertCanonical(
      mainCanonicalEntryPlan({
        term: "empty",
        ownerHtml: '<mean><span class="sound"></span></mean>',
      }),
    ),
  ).toEqual({
    ok: false,
    error: {
      kind: "empty-canonical-definition",
      rowId: 1,
      term: "empty",
    },
  });
});

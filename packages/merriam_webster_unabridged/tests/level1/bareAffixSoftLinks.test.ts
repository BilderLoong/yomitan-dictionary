import { expect, test } from "bun:test";

import {
  deriveBareAffixSoftLinks,
  deriveBareLookup,
} from "../../src/level1/planLinks";
import type { SoftLinkEntryPlan } from "../../src/level1/types";
import { linkEvidence, softLinkEntryPlan } from "../helpers/level1Factories";

test.each([
  ["in-", "in"],
  ["-in", "in"],
  ["-i-", "i"],
  ["il-", "il"],
])("derives bare %s as %s", (marked: string, bare: string) => {
  expect(deriveBareLookup(marked)).toEqual({
    ok: true,
    value: bare,
  });
});

test.each(["well-being", "take-off", "a-b"])(
  "does not derive from ordinary hyphenated word %s",
  (term: string) => {
    expect(deriveBareLookup(term)).toEqual({
      ok: false,
      error: { kind: "not-confirmed-affix" },
    });
  },
);

test("creates an alternative route only from confirmed affix evidence", () => {
  const evidence = linkEvidence("marked-affix");
  const result = deriveBareAffixSoftLinks(
    [],
    [
      {
        marked: "il-",
        bare: "il",
        target: "in-",
        evidence,
      },
    ],
  );

  expect(result).toEqual({
    softLinkEntries: [
      {
        kind: "soft-link-entry",
        relationship: "bare-affix-soft-link",
        lookup: "il",
        target: "in-",
        rules: ["alternative"],
        evidence: [evidence],
      },
    ],
    rejections: [],
  });
  expect(deriveBareAffixSoftLinks([], []).softLinkEntries).toEqual([]);
});

test("reuses an exact main-to-alternative-spelling route and retains both evidence records", () => {
  const existing = softLinkEntryPlan(
    "il",
    "in-",
    ["alternative"],
    "main-to-alternative-spelling-soft-link",
    [linkEvidence("main-to-alternative-spelling-soft-link")],
  );
  const result = deriveBareAffixSoftLinks(
    [existing],
    [
      {
        marked: "il-",
        bare: "il",
        target: "in-",
        evidence: linkEvidence("marked-affix"),
      },
    ],
  );

  expect(result.softLinkEntries).toHaveLength(1);
  expect(result.softLinkEntries[0]?.rules).toEqual(["alternative"]);
  expect(result.softLinkEntries[0]?.evidence).toHaveLength(2);
});

test("merges an equivalent vr-mean-alternate route and retains both evidence records", () => {
  const existing: SoftLinkEntryPlan = {
    kind: "soft-link-entry",
    relationship: "vr-mean-alternate-soft-link",
    lookup: "il",
    target: "in-",
    rules: ["alternative"],
    evidence: [linkEvidence("vr-mean-alternate-soft-link")],
  };
  const result = deriveBareAffixSoftLinks(
    [existing],
    [
      {
        marked: "il-",
        bare: "il",
        target: "in-",
        evidence: linkEvidence("marked-affix"),
      },
    ],
  );

  expect(result.softLinkEntries).toHaveLength(1);
  expect(result.softLinkEntries[0]?.rules).toEqual(["alternative"]);
  expect(result.softLinkEntries[0]?.evidence).toHaveLength(2);
});

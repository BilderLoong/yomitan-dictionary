import { describe, expect, test } from "bun:test";

import {
  assembleCanonicalRecord,
  assembleSoftLinkRecord,
} from "../../src/yomitan/assembleRecords";
import {
  mainCanonicalEntryPlan,
  softLinkEntryPlan,
} from "../helpers/level1Factories";

describe("assembleRecords", () => {
  test("assembles canonical and soft-link-entry tuples without copied definitions", () => {
    const canonical = assembleCanonicalRecord(
      {
        plan: mainCanonicalEntryPlan({ term: "in-" }),
        content: { tag: "div", content: "prefix form" },
        findings: [],
      },
      1,
      100,
    );

    expect(canonical[0]).toBe("in-");
    expect(canonical[1]).toBe("");
    expect(canonical[2]).toBeNull();
    expect(canonical[4]).toBe(100);
    expect(canonical[5][0]).toEqual({
      type: "structured-content",
      content: { tag: "div", content: "prefix form" },
    });
    expect(canonical[6]).toBe(1);
    expect(canonical[7]).toBe("");

    const embeddedCanonical = assembleCanonicalRecord(
      {
        plan: mainCanonicalEntryPlan({ term: "in-", rowKey: "in" }),
        content: { tag: "div", content: "embedded prefix form" },
        findings: [],
      },
      2,
      0,
    );

    expect(embeddedCanonical[4]).toBe(0);

    const link = assembleSoftLinkRecord(
      softLinkEntryPlan(
        "il",
        "in-",
        ["alternative"],
        "vr-mean-alternate-soft-link",
      ),
      2,
    );

    expect(link).toEqual([
      "il",
      "",
      null,
      "",
      -100,
      [["in-", ["alternative"]]],
      2,
      "",
    ]);
  });
});

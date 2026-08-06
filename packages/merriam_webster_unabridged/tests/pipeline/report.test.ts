import { describe, expect, test } from "bun:test";

import {
  createBuildReport,
  serializeBuildReport,
} from "../../src/pipeline/report";
import {
  canonicalMean,
  decision,
  softLinkEntryPlan,
} from "../helpers/level1Factories";
import { definition } from "../helpers/mwuHtml";

describe("build report", () => {
  test("serializes stable report data with a final newline", () => {
    const report = createBuildReport({
      requestedWords: ["in"],
      rootRows: [
        {
          id: 1,
          encodedKey: "in",
          decodedKey: "in",
        },
      ],
      dependencyRows: [
        {
          row: {
            id: 2,
            encodedKey: "in-",
            decodedKey: "in-",
          },
          reason: "main-to-alternative-spelling-soft-link",
        },
      ],
      decisions: [
        decision("in-", "alternative-spelling-canonical-entry", null),
      ],
      canonicalEntryPlans: [
        canonicalMean("in-", definition("in- definition")),
      ],
      softLinkEntries: [
        softLinkEntryPlan(
          "in",
          "in-",
          [],
          "main-to-alternative-spelling-soft-link",
        ),
      ],
      conversions: [],
      errors: [],
      archivePath: "Merriam Webster Unabridged.zip",
    });

    const first = serializeBuildReport(report);
    const second = serializeBuildReport(report);

    expect(first).toBe(second);
    expect(first.endsWith("\n")).toBe(true);
    expect(report.totals).toEqual({
      roots: 1,
      dependencies: 1,
      canonicalEntries: 1,
      softLinkEntries: 1,
      records: 1,
      findings: 0,
      errors: 0,
    });
  });
});

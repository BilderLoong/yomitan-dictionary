import { expect, test } from "bun:test";

import { planVrMeanAlternateSoftLinks } from "../../src/level1/planLinks";
import { canonicalMean } from "../helpers/level1Factories";
import { alternate, definition } from "../helpers/mwuHtml";

test("retains qualifier evidence and rejects a distinct local definition", () => {
  const accepted = planVrMeanAlternateSoftLinks(
    canonicalMean("in-", alternate("il-", "before l", "")),
  );
  expect(accepted.softLinkEntries[0]).toMatchObject({
    relationship: "vr-mean-alternate-soft-link",
    lookup: "il-",
    target: "in-",
    rules: ["alternative"],
  });
  expect(accepted.softLinkEntries[0]?.evidence[0]?.qualifier).toBe("before l");

  const rejected = planVrMeanAlternateSoftLinks(
    canonicalMean("in-", alternate("im-", null, definition("new meaning"))),
  );
  expect(rejected.softLinkEntries).toEqual([]);
  expect(rejected.rejections[0]?.kind).toBe("alternate-distinct-meaning");
});

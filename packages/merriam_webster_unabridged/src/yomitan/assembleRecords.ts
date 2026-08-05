import type { TermInformation } from "yomichan-dict-builder/dist/types/yomitan/termbank";

import type { ConvertedCanonical } from "../conversion/convertCanonical";
import type { SoftLinkEntryPlan } from "../level1/planLinks";

export const assembleCanonicalRecord = (
  converted: ConvertedCanonical,
  sequenceNumber: number,
  popularity: number,
): TermInformation => [
  converted.plan.term,
  "",
  converted.definitionTags,
  "",
  popularity,
  [
    {
      type: "structured-content",
      content: converted.content,
    },
  ],
  sequenceNumber,
  "",
];

export const assembleSoftLinkRecord = (
  link: SoftLinkEntryPlan,
  sequenceNumber: number,
): TermInformation => [
  link.lookup,
  "",
  null,
  "",
  -100,
  [[link.target, [...link.rules]]],
  sequenceNumber,
  "",
];

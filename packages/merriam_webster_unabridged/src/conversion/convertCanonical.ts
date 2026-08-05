import type { CanonicalEntryPlan } from "../level1/types";
import type { Result } from "../shared/result";
import { renderCanonicalContent } from "./renderStructuredContent";
import type { ConversionError, ConvertedCanonical } from "./types";

export type {
  ConversionError,
  ConversionFinding,
  ConvertedCanonical,
} from "./types";

export const convertCanonical = (
  plan: CanonicalEntryPlan,
): Result<ConvertedCanonical, ConversionError> => {
  const rendered = renderCanonicalContent(plan);
  if (!rendered.ok) return rendered;

  return {
    ok: true,
    value: {
      plan,
      content: rendered.value.content,
      definitionTags:
        rendered.value.definitionTags ??
        (plan.kind === "drp-phrase-canonical-entry" ? "phrase" : null),
      findings: rendered.value.findings,
    },
  };
};

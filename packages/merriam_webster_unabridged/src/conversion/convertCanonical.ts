import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

import type { CanonicalEntryPlan } from "../level1/types";
import type { Result } from "../shared/result";
import { renderCanonicalContent } from "./renderStructuredContent";
import type { ConversionError, ConvertedCanonical } from "./types";

export type {
  ConversionError,
  ConversionFinding,
  ConvertedCanonical,
} from "./types";

type ContentSegment =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "highlight"; readonly value: string };

const segmentsOf = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
): readonly ContentSegment[] => {
  if (node.type === "text") return [{ kind: "text", value: node.data }];
  if (node.type !== "tag") return [];

  const current = root(node);
  if (current.is(".mw_t_wi, .mw_t_it"))
    return [{ kind: "highlight", value: current.text() }];

  return current
    .contents()
    .toArray()
    .flatMap((child: AnyNode): readonly ContentSegment[] =>
      segmentsOf(root, child),
    );
};

const hasInterposedObjectCandidate = (
  root: cheerio.CheerioAPI,
  example: Element,
  finalToken: string,
): boolean =>
  segmentsOf(root, example).some(
    (
      segment: ContentSegment,
      index: number,
      all: readonly ContentSegment[],
    ) => {
      const previous = all[index - 1];
      const next = all[index + 1];
      return (
        segment.kind === "text" &&
        segment.value.trim().length > 0 &&
        previous?.kind === "highlight" &&
        next?.kind === "highlight" &&
        next.value.trim().toLowerCase() === finalToken
      );
    },
  );

const interposedObjectExampleCount = (
  ownerHtml: string,
  finalToken: string,
): number => {
  const root = cheerio.load(ownerHtml, null, false);
  return root(".ex-sent")
    .toArray()
    .filter((example: Element): boolean =>
      hasInterposedObjectCandidate(root, example, finalToken),
    ).length;
};

export const convertCanonical = (
  plan: CanonicalEntryPlan,
): Result<ConvertedCanonical, ConversionError> => {
  const rendered = renderCanonicalContent(plan);
  if (!rendered.ok) return rendered;

  const termTokens = plan.term.split(" ");
  const finalToken = termTokens[termTokens.length - 1];
  const interposedCount =
    termTokens.length >= 2 && finalToken !== undefined
      ? interposedObjectExampleCount(
          plan.source.ownerHtml,
          finalToken.toLowerCase(),
        )
      : 0;
  const isPhrase = plan.kind === "drp-phrase-canonical-entry";

  return {
    ok: true,
    value: {
      plan,
      content: rendered.value.content,
      definitionTags:
        rendered.value.definitionTags ?? (isPhrase ? "phrase" : null),
      rules: interposedCount > 0 ? "v_phr" : null,
      findings: [
        ...rendered.value.findings,
        ...(interposedCount > 0
          ? [
              {
                kind: "interposed-object-v-phr" as const,
                rowId: plan.source.rowId,
                term: plan.term,
                exampleCount: interposedCount,
              },
            ]
          : []),
      ],
    },
  };
};

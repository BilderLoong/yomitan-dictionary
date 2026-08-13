import type { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";

import type { CanonicalEntryPlan } from "../level1/types";
import type { UnmappedFunctionalLabelFinding } from "./functionalLabels";

export type ConversionFinding =
  | {
      readonly kind: "unsupported-visible-subtree";
      readonly rowId: number;
      readonly term: string;
      readonly tagName: string;
      readonly classes: readonly string[];
      readonly sourcePosition: number;
      readonly preview: string;
    }
  | {
      readonly kind: "interposed-object-v-phr";
      readonly rowId: number;
      readonly term: string;
      readonly exampleCount: number;
    }
  | UnmappedFunctionalLabelFinding;

export interface RenderedCanonicalContent {
  readonly content: StructuredContent;
  readonly definitionTags: string | null;
  readonly findings: readonly ConversionFinding[];
  readonly visibleText: string;
}

export interface ConvertedCanonical {
  readonly plan: CanonicalEntryPlan;
  readonly content: StructuredContent;
  readonly definitionTags: string | null;
  readonly rules: string | null;
  readonly findings: readonly ConversionFinding[];
}

export type ConversionError = {
  readonly kind: "empty-canonical-definition";
  readonly rowId: number;
  readonly term: string;
};

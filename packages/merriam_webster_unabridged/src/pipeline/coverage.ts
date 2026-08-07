import type { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";

export interface CoverageMetrics {
  readonly sourceTokenCount: number;
  readonly renderedTokenCount: number;
  readonly missingTokens: readonly string[];
  readonly coverage: number;
}

const TOKEN_PATTERN = /[a-z0-9'’-]+/gu;

export const textTokens = (text: string): readonly string[] =>
  text.toLowerCase().match(TOKEN_PATTERN) ?? [];

const uniqueTokens = (tokens: readonly string[]): readonly string[] =>
  tokens.filter(
    (token: string, index: number, all: readonly string[]): boolean =>
      all.indexOf(token) === index,
  );

export const renderedText = (content: StructuredContent): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(renderedText).join(" ");
  if (content.content === undefined) return "";

  return renderedText(content.content);
};

export const computeTextCoverage = (
  sourceText: string,
  content: StructuredContent,
): CoverageMetrics => {
  const sourceTokens = uniqueTokens(textTokens(sourceText));
  const renderedTokens = new Set(textTokens(renderedText(content)));

  return {
    sourceTokenCount: sourceTokens.length,
    renderedTokenCount: textTokens(renderedText(content)).length,
    missingTokens: sourceTokens.filter(
      (token: string): boolean => !renderedTokens.has(token),
    ),
    coverage:
      sourceTokens.length === 0
        ? 1
        : (sourceTokens.length -
            sourceTokens.filter(
              (token: string): boolean => !renderedTokens.has(token),
            ).length) /
          sourceTokens.length,
  };
};

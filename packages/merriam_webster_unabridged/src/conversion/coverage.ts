import * as cheerio from "cheerio";
import type { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";

import type { ConvertedCanonical } from "./types";

export type ConversionCoverageStatus =
  | "covered"
  | "possible-text-loss"
  | "unclassified-content";

export interface ConversionCoverage {
  readonly term: string;
  readonly sourceTextLength: number;
  readonly renderedTextLength: number;
  readonly missingSourceTokens: readonly string[];
  readonly findingCount: number;
  readonly status: ConversionCoverageStatus;
}

const normalizeText = (text: string): string =>
  text.replace(/\s+/gu, " ").trim();

const blockTags = new Set(["div", "details", "li", "ol", "p", "ul"]);

const structuredContentText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.reduce((text, child) => {
      const childText = structuredContentText(child);
      if (childText.length === 0) return text;
      const isBlock =
        typeof child === "object" &&
        child !== null &&
        "tag" in child &&
        blockTags.has((child as { readonly tag?: string }).tag ?? "");
      return `${text}${isBlock && text.length > 0 ? " " : ""}${childText}`;
    }, "");
  }
  if (typeof value !== "object" || value === null) return "";
  if (!("content" in value)) return "";
  return structuredContentText(
    (value as { readonly content?: StructuredContent }).content,
  );
};

const sourceText = (html: string): string => {
  const $ = cheerio.load(html, {}, false);
  $(
    ".entry-status, .play-pron, .audio-icon, .sound, .search-toolbar, .toggle-icon",
  ).remove();
  $(".entry-header").remove();
  $("p")
    .filter((_, element) => /^First Known Use:/u.test($(element).text()))
    .remove();
  return normalizeText(($.root().html() ?? "").replace(/<[^>]+>/gu, " "));
};

const tokenize = (text: string): string[] =>
  text.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’·-]*/gu) ?? [];

const missingTokens = (source: string, rendered: string): string[] => {
  const renderedCounts = tokenize(rendered).reduce(
    (counts, token) => counts.set(token, (counts.get(token) ?? 0) + 1),
    new Map<string, number>(),
  );
  return tokenize(source).flatMap((token) => {
    const remaining = renderedCounts.get(token) ?? 0;
    if (remaining > 0) {
      renderedCounts.set(token, remaining - 1);
      return [];
    }
    return [token];
  });
};

export const analyzeConversionCoverage = (
  conversion: ConvertedCanonical,
): ConversionCoverage => {
  const source = sourceText(conversion.plan.source.ownerHtml);
  const rendered = normalizeText(structuredContentText(conversion.content));
  const missing = missingTokens(source, rendered);
  const status: ConversionCoverageStatus =
    conversion.findings.length > 0
      ? "unclassified-content"
      : missing.length > 0
        ? "possible-text-loss"
        : "covered";
  return {
    term: conversion.plan.term,
    sourceTextLength: source.length,
    renderedTextLength: rendered.length,
    missingSourceTokens: [...new Set(missing)],
    findingCount: conversion.findings.length,
    status,
  };
};

import type { Result } from "../shared/result";

export interface SelectionInput {
  readonly flagWords: readonly string[];
  readonly wordsFile: {
    readonly text: string;
  } | null;
}

export type SelectionError = { readonly kind: "no-words" };

const collectFlagOccurrences = (
  flagWords: readonly string[],
): readonly string[] =>
  flagWords
    .map((word: string): string => word.trim())
    .filter((word: string): boolean => word.length > 0);

const collectFileOccurrences = (
  wordsFile: SelectionInput["wordsFile"],
): readonly string[] => {
  if (wordsFile === null) return [];

  return wordsFile.text
    .split(/\r?\n/u)
    .map((word: string): string => word.trim())
    .filter((word: string): boolean => word.length > 0);
};

const appendOccurrence = (
  requestedWords: readonly string[],
  occurrence: string,
): readonly string[] =>
  requestedWords.includes(occurrence)
    ? requestedWords
    : [...requestedWords, occurrence];

export const collectRequestedWords = (
  input: SelectionInput,
): Result<readonly string[], SelectionError> => {
  const occurrences = [
    ...collectFlagOccurrences(input.flagWords),
    ...collectFileOccurrences(input.wordsFile),
  ];
  const requestedWords = occurrences.reduce<readonly string[]>(
    appendOccurrence,
    [],
  );

  return requestedWords.length === 0
    ? { ok: false, error: { kind: "no-words" } }
    : { ok: true, value: requestedWords };
};

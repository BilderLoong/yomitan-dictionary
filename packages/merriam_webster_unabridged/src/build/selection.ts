import type { Result } from "../shared/result";

export type InputEvidence =
  | { readonly kind: "flag"; readonly argumentIndex: number }
  | { readonly kind: "file"; readonly path: string; readonly line: number };

export interface RequestedWord {
  readonly word: string;
  readonly evidence: readonly InputEvidence[];
}

export interface SelectionInput {
  readonly flagWords: readonly string[];
  readonly wordsFile: {
    readonly path: string;
    readonly text: string;
  } | null;
}

export type SelectionError = { readonly kind: "no-words" };

interface RequestedWordOccurrence {
  readonly word: string;
  readonly evidence: InputEvidence;
}

const collectFlagOccurrences = (
  flagWords: readonly string[],
): readonly RequestedWordOccurrence[] =>
  flagWords
    .map(
      (word: string, argumentIndex: number): RequestedWordOccurrence => ({
        word: word.trim(),
        evidence: { kind: "flag", argumentIndex },
      }),
    )
    .filter(
      (occurrence: RequestedWordOccurrence): boolean =>
        occurrence.word.length > 0,
    );

const collectFileOccurrences = (
  wordsFile: SelectionInput["wordsFile"],
): readonly RequestedWordOccurrence[] => {
  if (wordsFile === null) return [];

  return wordsFile.text
    .split(/\r?\n/u)
    .map(
      (word: string, lineIndex: number): RequestedWordOccurrence => ({
        word: word.trim(),
        evidence: {
          kind: "file",
          path: wordsFile.path,
          line: lineIndex + 1,
        },
      }),
    )
    .filter(
      (occurrence: RequestedWordOccurrence): boolean =>
        occurrence.word.length > 0,
    );
};

const appendOccurrence = (
  requestedWords: readonly RequestedWord[],
  occurrence: RequestedWordOccurrence,
): readonly RequestedWord[] => {
  const existingIndex = requestedWords.findIndex(
    (requestedWord: RequestedWord): boolean =>
      requestedWord.word === occurrence.word,
  );

  if (existingIndex === -1) {
    return [
      ...requestedWords,
      { word: occurrence.word, evidence: [occurrence.evidence] },
    ];
  }

  return requestedWords.map(
    (requestedWord: RequestedWord, index: number): RequestedWord =>
      index === existingIndex
        ? {
            ...requestedWord,
            evidence: [...requestedWord.evidence, occurrence.evidence],
          }
        : requestedWord,
  );
};

export const collectRequestedWords = (
  input: SelectionInput,
): Result<readonly RequestedWord[], SelectionError> => {
  const occurrences = [
    ...collectFlagOccurrences(input.flagWords),
    ...collectFileOccurrences(input.wordsFile),
  ];
  const requestedWords = occurrences.reduce<readonly RequestedWord[]>(
    appendOccurrence,
    [],
  );

  return requestedWords.length === 0
    ? { ok: false, error: { kind: "no-words" } }
    : { ok: true, value: requestedWords };
};

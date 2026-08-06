# MWU Selected-Word Dictionary V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Replace the old MWU builder with a CLI that builds an importable Yomitan dictionary for explicitly requested words while correctly planning the seven approved Level 1 canonical/link behaviors and their dedicated dependencies.

**Architecture:** Keep CLI, SQLite, filesystem, schema validation, and ZIP export at the edges. The core receives immutable source data and returns deterministic selection, Level 1 plans, conservative structured definitions, Yomitan records, and report data. The hand-authored fixture may supply individual source examples but is not an output oracle.

**Tech Stack:** Bun 1.3, TypeScript ESM, bun:sqlite, Commander 13, Cheerio 1, yomichan-dict-builder 2.10, Bun test, and the schema validators bundled with the local Yomitan browser fixture.

## Global Constraints

- Accept roots only through --words <word...> and an optional --words-file <path>.
- Do not read roots from stdin, keep --limit, or provide an implicit full-database build.
- Combine flag and file roots, trim boundary whitespace, ignore blank file lines, deduplicate exact Unicode spellings, and retain first-seen order.
- Implement `main-canonical-entry`, `alternative-spelling-canonical-entry`, `drp-phrase-canonical-entry`, `main-to-alternative-spelling-soft-link`, `vr-mean-alternate-soft-link`, `phrase-alternate-soft-link`, `bare-affix-soft-link`, and dedicated dependency rows.
- A soft link never owns or copies a canonical definition.
- Every successful archive must contain a canonical target for every emitted soft link.
- Leave the Yomitan reading field empty.
- Preserve unsupported visible definition content once as neutral fallback and record one finding.
- Do not match the hand-authored fixture structure, styling, or 136-record count.
- Do not add runtime dependencies.
- Core functions must be deterministic, explicitly typed, side-effect free, and non-mutating.
- Remove obsolete code only after the new selected-word path passes its focused and end-to-end gates.
- Preserve unrelated dirty-worktree changes. Stage only files named by the active task if commits are authorized.

---

## File Structure

Create these focused modules:

- packages/merriam_webster_unabridged/src/shared/result.ts
  - Result type used for expected domain and CLI failures.
- packages/merriam_webster_unabridged/src/build/selection.ts
  - Pure flag/file target merging and exact deduplication.
- packages/merriam_webster_unabridged/src/build/cli.ts
  - Commander adapter for --words and --words-file.
- packages/merriam_webster_unabridged/src/source/rows.ts
  - Source row types, decoding, immutable sorted key index, and exact lookup.
- packages/merriam_webster_unabridged/src/source/sqlite.ts
  - Read-only SQLite edge for row summaries and on-demand HTML.
- packages/merriam_webster_unabridged/src/level1/types.ts
  - Canonical entry plans, soft-link-entry plans, evidence, decisions, and findings.
- packages/merriam_webster_unabridged/src/level1/planCanonical.ts
  - Searchable headword extraction, Case 1/2/3, and defined phrase planning.
- packages/merriam_webster_unabridged/src/level1/planLinks.ts
  - `main-to-alternative-spelling-soft-link`, `vr-mean-alternate-soft-link`, `phrase-alternate-soft-link`, and `bare-affix-soft-link` planning.
- packages/merriam_webster_unabridged/src/level1/closeDependencies.ts
  - Deterministic dependency traversal and dangling-target checks.
- packages/merriam_webster_unabridged/src/conversion/convertCanonical.ts
  - Owner-local conservative readable structured content and findings.
- packages/merriam_webster_unabridged/src/yomitan/assembleRecords.ts
  - Canonical and dictionary-deinflection term tuples.
- packages/merriam_webster_unabridged/src/build/report.ts
  - Deterministic report model and JSON serialization.
- packages/merriam_webster_unabridged/src/pipeline/runBuild.ts
  - Selected-build orchestration across the edge adapters.
- packages/merriam_webster_unabridged/src/index.ts
  - Minimal executable entry point.

Create tests under matching feature folders:

- packages/merriam_webster_unabridged/tests/build/
- packages/merriam_webster_unabridged/tests/source/
- packages/merriam_webster_unabridged/tests/level1/
- packages/merriam_webster_unabridged/tests/conversion/
- packages/merriam_webster_unabridged/tests/yomitan/
- packages/merriam_webster_unabridged/tests/archive/
- packages/merriam_webster_unabridged/tests/helpers/

## Shared Interfaces

Define the following exact contracts before the feature tasks:

~~~ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export interface SourceRowSummary {
  readonly id: number;
  readonly encodedKey: string;
}

export interface IndexedSourceRow extends SourceRowSummary {
  readonly decodedKey: string;
}

export interface SourceKeyFinding {
  readonly kind: 'source-key-decode';
  readonly rowId: number;
  readonly encodedKey: string;
  readonly message: string;
}

export interface SourceIndex {
  readonly rows: readonly IndexedSourceRow[];
  readonly findings: readonly SourceKeyFinding[];
}

export interface SourceRow extends IndexedSourceRow {
  readonly html: string;
}

~~~

Task 2 creates packages/merriam_webster_unabridged/tests/helpers/mwuHtml.ts
with these exact factories so every Level 1 test uses the same minimal source
vocabulary:

~~~ts
export const definition = (text: string): string =>
  '<span class="dt">: ' + text + '</span>';

export const mean = (headword: string, body: string): string =>
  '<mean><h1><span class="hword">' + headword +
  '</span></h1>' + body + '</mean>';

export const phrase = (headword: string, body: string): string =>
  '<div class="dro"><span class="drp">' + headword +
  '</span>' + body + '</div>';

export const example = (text: string): string =>
  '<span class="ex-sent-group">' + text + '</span>';

export const runOn = (headword: string): string =>
  '<div class="uro"><span class="ure">' + headword + '</span></div>';

export const alternate = (
  headword: string,
  qualifier: string | null,
  extraHtml: string,
): string =>
  '<span class="vr"><span class="va">' + headword + '</span>' +
  (qualifier === null ? '' : '<span class="vl">' + qualifier + '</span>') +
  extraHtml + '</span>';
~~~

---

### Task 1: CLI Selection and Immutable Source Index

**Files:**

- Create: packages/merriam_webster_unabridged/src/shared/result.ts
- Create: packages/merriam_webster_unabridged/src/build/selection.ts
- Create: packages/merriam_webster_unabridged/src/build/cli.ts
- Create: packages/merriam_webster_unabridged/src/source/rows.ts
- Create: packages/merriam_webster_unabridged/src/source/sqlite.ts
- Test: packages/merriam_webster_unabridged/tests/build/selection.test.ts
- Test: packages/merriam_webster_unabridged/tests/build/cli.test.ts
- Test: packages/merriam_webster_unabridged/tests/source/rows.test.ts

**Interfaces:**

- Produces parseCliArgs(argv), collectRequestedWords(input), buildSourceIndex(rows), findSourceRows(index, decodedKey), listSourceRowSummaries(database), and loadSourceRow(database, id).
- Later tasks consume string[], SourceIndex, and SourceRow.

- [ ] **Step 1: Write failing selection tests**

~~~ts
import { describe, expect, test } from 'bun:test';
import { collectRequestedWords } from '../../src/build/selection';

describe('collectRequestedWords', () => {
  test('combines flags and file lines with stable exact deduplication', () => {
    const result = collectRequestedWords({
      flagWords: ['give', 'in', 'give'],
      wordsFile: {
        text: ' in \\n take the word \\n\\nIN\\n',
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      'give',
      'in',
      'take the word',
      'IN',
    ]);
  });

  test('rejects an empty effective selection', () => {
    expect(
      collectRequestedWords({ flagWords: [], wordsFile: null }),
    ).toEqual({
      ok: false,
      error: { kind: 'no-words' },
    });
  });
});
~~~

- [ ] **Step 2: Run selection tests and confirm the missing-module failure**

Run:

~~~bash
bun test packages/merriam_webster_unabridged/tests/build/selection.test.ts
~~~

Expected: FAIL because src/build/selection.ts does not exist.

- [ ] **Step 3: Implement Result and pure selection**

Use this public signature:

~~~ts
export interface SelectionInput {
  readonly flagWords: readonly string[];
  readonly wordsFile: {
    readonly text: string;
  } | null;
}

export type SelectionError = { readonly kind: 'no-words' };

export function collectRequestedWords(
  input: SelectionInput,
): Result<readonly string[], SelectionError>;
~~~

Trim each occurrence, group by exact spelling, retain the first occurrence
position, and return new arrays rather than mutating caller-owned data.

- [ ] **Step 4: Write failing Commander tests**

~~~ts
test('parses variadic words and a words file', () => {
  expect(
    parseCliArgs([
      '--words',
      'give',
      'in',
      'take the word',
      '--words-file',
      '/tmp/words.txt',
    ]),
  ).toEqual({
    ok: true,
    value: {
      flagWords: ['give', 'in', 'take the word'],
      wordsFilePath: '/tmp/words.txt',
    },
  });
});

test.each(['--limit', '--additional-words-list-file'])(
  'rejects removed option %s',
  (option) => {
    const result = parseCliArgs([option, '1']);
    expect(result.ok).toBe(false);
  },
);
~~~

- [ ] **Step 5: Implement parseCliArgs**

Create a fresh Commander Command for each call, use exitOverride(), and return
Commander failures as:

~~~ts
export interface ParsedCliArgs {
  readonly flagWords: readonly string[];
  readonly wordsFilePath: string | null;
}

export type CliParseError = {
  readonly kind: 'usage';
  readonly message: string;
};

export function parseCliArgs(
  argv: readonly string[],
): Result<ParsedCliArgs, CliParseError>;
~~~

Define exactly these options:

~~~ts
program
  .option('--words <words...>', 'Target words to build')
  .option('--words-file <path>', 'Newline-delimited target words file');
~~~

- [ ] **Step 6: Write failing source-index tests**

~~~ts
test('sorts decoded keys and preserves duplicate rows by id', () => {
  const result = buildSourceIndex([
    { id: 4, encodedKey: 'o%27' },
    { id: 2, encodedKey: 'in' },
    { id: 3, encodedKey: 'in' },
  ]);

  expect(result.findings).toEqual([]);
  expect(findSourceRows(result, "o'").map(({ id }) => id)).toEqual([4]);
  expect(findSourceRows(result, 'in').map(({ id }) => id)).toEqual([2, 3]);
});

test('reports an undecodable source key', () => {
  const result = buildSourceIndex([{ id: 9, encodedKey: '%E0%A4%A' }]);
  expect(result.rows).toEqual([]);
  expect(result.findings[0]?.kind).toBe('source-key-decode');
});
~~~

- [ ] **Step 7: Implement the immutable sorted index and SQLite edge**

Represent SourceIndex as a readonly array sorted by decodedKey and row id.
Use toSorted(), not in-place sort. Implement binary-search lower and upper
bounds in findSourceRows. Open MWU.db read-only in source/sqlite.ts, list only
id and w for the index, and load m only for requested row IDs.

- [ ] **Step 8: Run the focused gate**

~~~bash
bun test \
  packages/merriam_webster_unabridged/tests/build/selection.test.ts \
  packages/merriam_webster_unabridged/tests/build/cli.test.ts \
  packages/merriam_webster_unabridged/tests/source/rows.test.ts
~~~

Expected: PASS.

---

### Task 2: Canonical Lexical Entries and Defined Phrases

**Files:**

- Create: packages/merriam_webster_unabridged/src/level1/types.ts
- Create: packages/merriam_webster_unabridged/src/level1/planCanonical.ts
- Create: packages/merriam_webster_unabridged/tests/helpers/mwuHtml.ts
- Test: packages/merriam_webster_unabridged/tests/level1/canonical.test.ts
- Test: packages/merriam_webster_unabridged/tests/level1/phrases.test.ts

**Interfaces:**

- Produces `MainCanonicalEntryPlan`, `AlternativeSpellingCanonicalEntryPlan`, `DrpPhraseCanonicalEntryPlan`, `OwnershipDecision`, `extractSearchableHeadword()`, and `planCanonicalOwners(row, index)`.
- Store immutable ownerHtml on canonical plans so later conversion receives the exact owner subtree and does not repeat ownership discovery.

Define:

~~~ts
export interface CanonicalSource {
  readonly rowId: number;
  readonly rowKey: string;
  readonly meanIndex: number;
  readonly phraseIndex: number | null;
  readonly ownerHtml: string;
}

export type Level1Finding =
  | SourceKeyFinding
  | {
      readonly kind: 'headword-markup';
      readonly rowId: number;
      readonly meanIndex: number;
      readonly preview: string;
    }
  | {
      readonly kind: 'unresolved-mean';
      readonly rowId: number;
      readonly meanIndex: number;
      readonly preview: string;
    }
  | {
      readonly kind: 'definition-free-mean';
      readonly rowId: number;
      readonly meanIndex: number;
      readonly preview: string;
    };

export interface MainCanonicalEntryPlan {
  readonly kind: 'main-canonical-entry';
  readonly term: string;
  readonly displayHeadword: string;
  readonly source: CanonicalSource;
}

export interface AlternativeSpellingCanonicalEntryPlan {
  readonly kind: 'alternative-spelling-canonical-entry';
  readonly term: string;
  readonly displayHeadword: string;
  readonly source: CanonicalSource;
}

export interface DrpPhraseCanonicalEntryPlan {
  readonly kind: 'drp-phrase-canonical-entry';
  readonly term: string;
  readonly parentTerm: string;
  readonly source: CanonicalSource;
}

export type CanonicalEntryPlan =
  | MainCanonicalEntryPlan
  | AlternativeSpellingCanonicalEntryPlan
  | DrpPhraseCanonicalEntryPlan;

export type OwnershipRule =
  | 'main-canonical-entry'
  | 'alternative-spelling-canonical-entry';

export interface OwnershipDecision {
  readonly rowId: number;
  readonly rowKey: string;
  readonly meanIndex: number;
  readonly searchableHeadword: string;
  readonly rule: OwnershipRule;
  readonly dedicatedRowId: number | null;
}

export interface CanonicalPlanningResult {
  readonly canonicalEntries: readonly CanonicalEntryPlan[];
  readonly decisions: readonly OwnershipDecision[];
  readonly requiredDependencyIds: readonly number[];
  readonly findings: readonly Level1Finding[];
}
~~~

- [ ] **Step 1: Write failing Case 1/2/3 tests**

Use small HTML strings rather than the 136-record JSON:

~~~ts
test('keeps same-spelling means separate and defers a dedicated target', () => {
  const row = sourceRow(
    1,
    'o',
    mean('o', definition('letter name')) +
      mean('O', definition('variant form')) +
      mean("o'", definition('apostrophe form')),
  );
  const index = sourceIndex([
    { id: 1, encodedKey: 'o' },
    { id: 2, encodedKey: 'o%27' },
  ]);

  const result = planCanonicalOwners(row, index);

  expect(
    result.canonicalEntries.map(({ kind, term }) => [kind, term]),
  ).toEqual([
    ['main-canonical-entry', 'o'],
    ['alternative-spelling-canonical-entry', 'O'],
  ]);
  expect(result.decisions.map(({ rule }) => rule)).toEqual([
    'main-canonical-entry',
    'alternative-spelling-canonical-entry',
    'alternative-spelling-canonical-entry',
  ]);
  expect(result.requiredDependencyIds).toEqual([2]);
});

test('does not merge independent same-spelling means', () => {
  const row = sourceRow(
    7,
    'set',
    mean('set', definition('put in position')) +
      mean('set', definition('fixed or established')),
  );
  const result = planCanonicalOwners(row, sourceIndex([
    { id: 7, encodedKey: 'set' },
  ]));
  expect(result.canonicalEntries.map(({ term }) => term)).toEqual(['set', 'set']);
  expect(result.decisions.map(({ meanIndex }) => meanIndex)).toEqual([0, 1]);
});
~~~

- [ ] **Step 2: Run the test and confirm failure**

~~~bash
bun test packages/merriam_webster_unabridged/tests/level1/canonical.test.ts
~~~

Expected: FAIL because the planner and types do not exist.

- [ ] **Step 3: Implement conservative headword identity and canonical planning**

Use Cheerio to enumerate independent mean elements in source order. Preserve
the rich visible hword string. Derive the searchable form by removing confirmed
homograph sup markup, U+00B7, and boundary whitespace only. Record one resolved
decision for every definition-bearing mean. Means without a local definition
tree emit explicit `definition-free-mean` or `unresolved-mean` findings and no
resolved ownership decision. Case 3 emits no canonical plan and returns the
dedicated row ID.

- [ ] **Step 4: Write failing defined-phrase tests**

~~~ts
test('plans each definition-bearing phrase and rejects example-only text', () => {
  const html = mean(
    'take',
    [
      definition('receive'),
      phrase('take a bath', definition('bathe')),
      phrase('take the word', definition('speak')),
      example('take a walk'),
      runOn('taker'),
    ].join(''),
  );

  const result = planCanonicalOwners(sourceRow(10, 'take', html), sourceIndex([
    { id: 10, encodedKey: 'take' },
  ]));

  expect(
    result.canonicalEntries
      .filter(({ kind }) => kind === 'drp-phrase-canonical-entry')
      .map(({ term }) => term),
  ).toEqual(['take a bath', 'take the word']);
  expect(
    result.canonicalEntries
      .filter(({ kind }) => kind === 'drp-phrase-canonical-entry')
      .map(({ parentTerm }) => parentTerm),
  ).toEqual(['take', 'take']);
});
~~~

- [ ] **Step 5: Implement phrase planning**

Enumerate definition-bearing phrase containers in source order. Require a local
drp identity and local definition-bearing content. Store the phrase container
outer HTML, including direct text/comment nodes in the owned sibling range,
parent term, mean index, and phrase index. Never promote examples, undefined
uro run-ons, or adjacent phrase content.

- [ ] **Step 6: Run canonical and phrase gates**

~~~bash
bun test \
  packages/merriam_webster_unabridged/tests/level1/canonical.test.ts \
  packages/merriam_webster_unabridged/tests/level1/phrases.test.ts
~~~

Expected: PASS.

---

### Task 3: Approved Soft-Link Entries

**Files:**

- Create: packages/merriam_webster_unabridged/src/level1/planLinks.ts
- Test: packages/merriam_webster_unabridged/tests/level1/mainToAlternativeSpellingSoftLinks.test.ts
- Test: packages/merriam_webster_unabridged/tests/level1/vrMeanAlternateSoftLinks.test.ts
- Test: packages/merriam_webster_unabridged/tests/level1/phraseAlternateSoftLinks.test.ts

**Interfaces:**

Define:

~~~ts
export type SoftLinkEntryRelationship =
  | 'main-to-alternative-spelling-soft-link'
  | 'vr-mean-alternate-soft-link'
  | 'phrase-alternate-soft-link'
  | 'bare-affix-soft-link';

export interface LinkEvidence {
  readonly rowId: number;
  readonly rowKey: string;
  readonly meanIndex: number;
  readonly phraseIndex: number | null;
  readonly selector: string;
  readonly qualifier: string | null;
  readonly localText: string;
}

export interface SoftLinkEntryPlan {
  readonly kind: 'soft-link-entry';
  readonly relationship: SoftLinkEntryRelationship;
  readonly lookup: string;
  readonly target: string;
  readonly rules: readonly string[];
  readonly evidence: readonly LinkEvidence[];
}
~~~

Use these public planning signatures:

~~~ts
export interface LinkPlanningResult {
  readonly softLinkEntries: readonly SoftLinkEntryPlan[];
  readonly rejections: readonly LinkRejection[];
}

export interface LinkRejection {
  readonly kind: 'alternate-distinct-meaning';
  readonly lookup: string;
  readonly target: string;
  readonly evidence: readonly LinkEvidence[];
}

export function planMainToAlternativeSpellingSoftLinks(
  input: {
    readonly rowKey: string;
    readonly decisions: readonly OwnershipDecision[];
  },
): readonly SoftLinkEntryPlan[];

export function planVrMeanAlternateSoftLinks(
  plan: MainCanonicalEntryPlan | AlternativeSpellingCanonicalEntryPlan,
): LinkPlanningResult;

export function planPhraseAlternateSoftLinks(
  plan: DrpPhraseCanonicalEntryPlan,
): LinkPlanningResult;
~~~

Create tests/helpers/level1Factories.ts with fully typed constructors. Their
bodies fill interfaces only and contain no planning logic:

~~~ts
export const sourceRow = (
  id: number,
  decodedKey: string,
  html: string,
): SourceRow => ({
  id,
  encodedKey: encodeURIComponent(decodedKey),
  decodedKey,
  html,
});

export const sourceIndex = (
  rows: readonly SourceRowSummary[],
): SourceIndex => buildSourceIndex(rows);

export const decision = (
  searchableHeadword: string,
  rule: OwnershipRule,
  dedicatedRowId: number | null,
  meanIndex = 0,
): OwnershipDecision => ({
  rowId: 1,
  rowKey: 'o',
  meanIndex,
  searchableHeadword,
  rule,
  dedicatedRowId,
});

export const mainCanonicalEntryPlan = (
  input: {
    readonly term: string;
    readonly ownerHtml?: string;
    readonly rowId?: number;
    readonly rowKey?: string;
  },
): MainCanonicalEntryPlan => ({
  kind: 'main-canonical-entry',
  term: input.term,
  displayHeadword: input.term,
  source: {
    rowId: input.rowId ?? 1,
    rowKey: input.rowKey ?? input.term,
    meanIndex: 0,
    phraseIndex: null,
    ownerHtml: input.ownerHtml ?? mean(
      input.term,
      definition(input.term + ' definition'),
    ),
  },
});

export const canonicalMean = (
  term: string,
  body: string,
): AlternativeSpellingCanonicalEntryPlan => ({
  kind: 'alternative-spelling-canonical-entry',
  term,
  displayHeadword: term,
  source: {
    rowId: 1,
    rowKey: term,
    meanIndex: 0,
    phraseIndex: null,
    ownerHtml: mean(term, body),
  },
});

export const drpPhraseCanonicalEntryPlan = (
  term: string,
  alternateTerm: string,
  qualifier: string,
): DrpPhraseCanonicalEntryPlan => ({
  kind: 'drp-phrase-canonical-entry',
  term,
  parentTerm: 'take',
  source: {
    rowId: 10,
    rowKey: 'take',
    meanIndex: 0,
    phraseIndex: 0,
    ownerHtml: phrase(
      term,
      alternate(alternateTerm, qualifier, '') + definition('phrase meaning'),
    ),
  },
});

export const softLinkEntryPlan = (
  lookup: string,
  target: string,
  rules: readonly string[],
  relationship: SoftLinkEntryRelationship,
  evidence: readonly LinkEvidence[] = [],
): SoftLinkEntryPlan => ({
  kind: 'soft-link-entry',
  relationship,
  lookup,
  target,
  rules: [...rules],
  evidence: [...evidence],
});

export const linkEvidence = (selector: string): LinkEvidence => ({
  rowId: 1,
  rowKey: 'in',
  meanIndex: 0,
  phraseIndex: null,
  selector,
  qualifier: null,
  localText: selector,
});
~~~

- [ ] **Step 1: Write failing main-to-alternative-spelling soft-link tests**

~~~ts
test('creates main-to-alternative-spelling routes without definitions', () => {
  const links = planMainToAlternativeSpellingSoftLinks({
    rowKey: 'o',
    decisions: [
      decision('O', 'alternative-spelling-canonical-entry', null),
      decision('oh', 'alternative-spelling-canonical-entry', 22),
    ],
  });

  expect(links.map(({ lookup, target, rules }) => ({
    lookup,
    target,
    rules,
  }))).toEqual([
    { lookup: 'o', target: 'O', rules: [] },
    { lookup: 'o', target: 'oh', rules: [] },
  ]);
});
~~~

- [ ] **Step 2: Implement main-to-alternative-spelling soft links**

Emit a route for each distinct different searchable mean headword in the
alternative-spelling canonical-entry family. Do not create a route when lookup
equals target. Do not include owner HTML or definitions on
`SoftLinkEntryPlan`.

- [ ] **Step 3: Write failing VR mean alternate soft-link tests**

~~~ts
test('retains qualifier evidence and rejects a distinct local definition', () => {
  const accepted = planVrMeanAlternateSoftLinks(
    canonicalMean('in-', alternate('il-', 'before l', '')),
  );
  expect(accepted.softLinkEntries[0]).toMatchObject({
    relationship: 'vr-mean-alternate-soft-link',
    lookup: 'il-',
    target: 'in-',
    rules: ['alternative'],
  });
  expect(accepted.softLinkEntries[0]?.evidence[0]?.qualifier).toBe('before l');

  const rejected = planVrMeanAlternateSoftLinks(
    canonicalMean('in-', alternate('im-', null, definition('new meaning'))),
  );
  expect(rejected.softLinkEntries).toEqual([]);
  expect(rejected.rejections[0]?.kind).toBe('alternate-distinct-meaning');
});
~~~

- [ ] **Step 4: Implement `vr-mean-alternate-soft-link` planning**

Bind each local va to its containing canonical mean. Retain local qualifier,
pronunciation, part of speech, usage restriction, inflection, definition-like
text, and unknown text in evidence. Emit the lightweight link only when no
distinct definition owner is established.

- [ ] **Step 5: Write failing phrase alternate soft-link tests**

~~~ts
test('binds an alternative to its phrase rather than an adjacent phrase', () => {
  const result = planPhraseAlternateSoftLinks(
    drpPhraseCanonicalEntryPlan('take the word', 'take up the word', 'or less commonly'),
  );

  expect(result.softLinkEntries).toEqual([
    expect.objectContaining({
      relationship: 'phrase-alternate-soft-link',
      lookup: 'take up the word',
      target: 'take the word',
      rules: ['alternative'],
    }),
  ]);
});
~~~

- [ ] **Step 6: Implement `phrase-alternate-soft-link` planning and exact route deduplication**

Deduplicate only lookup, target, and effective rules. Concatenate evidence in
source order into a new array. Do not merge canonical plans by spelling.

- [ ] **Step 7: Run all three link gates**

~~~bash
bun test \
  packages/merriam_webster_unabridged/tests/level1/mainToAlternativeSpellingSoftLinks.test.ts \
  packages/merriam_webster_unabridged/tests/level1/vrMeanAlternateSoftLinks.test.ts \
  packages/merriam_webster_unabridged/tests/level1/phraseAlternateSoftLinks.test.ts
~~~

Expected: PASS.

---

### Task 4: Bare-Affix Soft Links and Dedicated Dependency Closure

**Files:**

- Modify: packages/merriam_webster_unabridged/src/level1/planLinks.ts
- Create: packages/merriam_webster_unabridged/src/level1/closeDependencies.ts
- Test: packages/merriam_webster_unabridged/tests/level1/bareAffixSoftLinks.test.ts
- Test: packages/merriam_webster_unabridged/tests/level1/dependencies.test.ts

**Interfaces:**

- Produces deriveBareAffixSoftLinks(softLinkEntries, affixEvidence) and closeDependencies(input).
- closeDependencies returns ordered root row IDs, ordered dependency row IDs,
  reasons, and fatal missing targets.

~~~ts
export interface ConfirmedAffixEvidence {
  readonly marked: string;
  readonly bare: string;
  readonly target: string;
  readonly evidence: LinkEvidence;
}

export type BareLookupError = {
  readonly kind: 'not-confirmed-affix';
};

export function deriveBareLookup(
  marked: string,
): Result<string, BareLookupError>;

export function deriveBareAffixSoftLinks(
  existingLinks: readonly SoftLinkEntryPlan[],
  affixes: readonly ConfirmedAffixEvidence[],
): LinkPlanningResult;

export interface DependencyEdge {
  readonly fromRowId: number;
  readonly toRowId: number;
  readonly target: string;
}

export function closeDependencies(input: {
  readonly rootRowIds: readonly number[];
  readonly availableRowIds: readonly number[];
  readonly edges: readonly DependencyEdge[];
}): Result<{
  readonly rootRowIds: readonly number[];
  readonly dependencyRowIds: readonly number[];
  readonly reasons: readonly DependencyEdge[];
}, {
  readonly kind: 'missing-dependency';
  readonly target: string;
}>;
~~~

- [ ] **Step 1: Write failing affix table tests**

~~~ts
test.each([
  ['in-', 'in'],
  ['-in', 'in'],
  ['-i-', 'i'],
  ['il-', 'il'],
])('derives bare %s as %s', (marked, bare) => {
  expect(deriveBareLookup(marked)).toEqual({
    ok: true,
    value: bare,
  });
});

test.each(['well-being', 'take-off', 'a-b'])(
  'does not derive from ordinary hyphenated word %s',
  (term) => {
    expect(deriveBareLookup(term)).toEqual({
      ok: false,
      error: { kind: 'not-confirmed-affix' },
    });
  },
);

test('reuses an exact main-to-alternative-spelling route and retains both evidence records', () => {
  const existing = softLinkEntryPlan(
    'il',
    'in-',
    [],
    'main-to-alternative-spelling-soft-link',
    [linkEvidence('main-to-alternative-spelling-soft-link')],
  );
  const result = deriveBareAffixSoftLinks(
    [existing],
    [{
      marked: 'il-',
      bare: 'il',
      target: 'in-',
      evidence: linkEvidence('marked-affix'),
    }],
  );
  expect(result.softLinkEntries).toHaveLength(1);
  expect(result.softLinkEntries[0]?.rules).toEqual([]);
  expect(result.softLinkEntries[0]?.evidence).toHaveLength(2);
});
~~~

- [ ] **Step 2: Implement source-assisted bare aliases**

Require explicit affix-role evidence from the source plan. Remove only boundary
hyphens. New aliases use rules ['alternative']. If an exact existing route has
the same lookup and target, reuse it and retain both evidence occurrences.

- [ ] **Step 3: Write failing dependency graph tests**

~~~ts
test('closes transitively, deduplicates cycles, and retains reasons', () => {
  const result = closeDependencies({
    rootRowIds: [1],
    availableRowIds: [1, 2, 3],
    edges: [
      { fromRowId: 1, toRowId: 2, target: "o'" },
      { fromRowId: 2, toRowId: 3, target: 'oh' },
      { fromRowId: 3, toRowId: 2, target: "o'" },
    ],
  });

  expect(result).toMatchObject({
    ok: true,
    value: {
      rootRowIds: [1],
      dependencyRowIds: [2, 3],
    },
  });
});

test('fails when a canonical owner is unavailable', () => {
  const result = closeDependencies({
    rootRowIds: [1],
    availableRowIds: [1],
    edges: [{ fromRowId: 1, toRowId: 9, target: 'oh' }],
  });
  expect(result.ok).toBe(false);
});
~~~

- [ ] **Step 4: Implement immutable dependency closure**

Use ordered arrays and includes() checks so the function returns new values
without mutating Sets, input arrays, or plan evidence. Roots keep requested
order. Dependencies use first-discovery order and are unique by row ID. A cycle
terminates because a visited ID is never queued twice.

- [ ] **Step 5: Run affix and dependency gates**

~~~bash
bun test \
  packages/merriam_webster_unabridged/tests/level1/bareAffixSoftLinks.test.ts \
  packages/merriam_webster_unabridged/tests/level1/dependencies.test.ts
~~~

Expected: PASS.

---

### Task 5: Conservative Canonical Conversion

**Files:**

- Create: packages/merriam_webster_unabridged/src/conversion/convertCanonical.ts
- Test: packages/merriam_webster_unabridged/tests/conversion/convertCanonical.test.ts

**Interfaces:**

Define:

~~~ts
import type { StructuredContent } from 'yomichan-dict-builder/dist/types/yomitan/termbank';

export interface ConversionFinding {
  readonly kind: 'unsupported-visible-subtree';
  readonly rowId: number;
  readonly term: string;
  readonly tagName: string;
  readonly classes: readonly string[];
  readonly sourcePosition: number;
  readonly preview: string;
}

export interface ConvertedCanonical {
  readonly plan: CanonicalEntryPlan;
  readonly content: StructuredContent;
  readonly findings: readonly ConversionFinding[];
}

export type ConversionError = {
  readonly kind: 'empty-canonical-definition';
  readonly rowId: number;
  readonly term: string;
};

export function convertCanonical(
  plan: CanonicalEntryPlan,
): Result<ConvertedCanonical, ConversionError>;
~~~

- [ ] **Step 1: Write failing owner-isolation and readable-content tests**

~~~ts
test('converts only the canonical owner html in source order', () => {
  const plan = lexicalPlan({
    term: 'give',
    ownerHtml:
      '<mean><span class=\"dt\">transfer possession</span>' +
      '<span class=\"dt\">provide</span></mean>',
  });

  const result = convertCanonical(plan);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(JSON.stringify(result.value.content)).toContain(
    'transfer possession',
  );
  expect(JSON.stringify(result.value.content)).toContain('provide');
});

test('keeps visible link text but drops gdlookup targets', () => {
  const result = convertCanonical(
    lexicalPlan({
      term: 'O',
      ownerHtml:
        '<mean><span class=\"cxl-ref\">variant of ' +
        '<a href=\"gdlookup://localhost/o\">o</a></span></mean>',
    }),
  );
  expect(JSON.stringify(result)).toContain('variant of');
  expect(JSON.stringify(result)).not.toContain('gdlookup://');
});
~~~

- [ ] **Step 2: Write failing fallback and empty-definition tests**

~~~ts
test('renders one fallback and one finding for an unsupported subtree', () => {
  const result = convertCanonical(
    lexicalPlan({
      term: 'give',
      ownerHtml:
        '<mean><section class=\"mystery\">unmapped visible text' +
        '<span class=\"dt\">nested text</span></section></mean>',
    }),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.findings).toHaveLength(1);
  expect(JSON.stringify(result.value.content).match(/unmapped visible text/g))
    .toHaveLength(1);
});

test('rejects an empty canonical owner', () => {
  expect(convertCanonical(lexicalPlan({
    term: 'empty',
    ownerHtml: '<mean><span class=\"sound\"></span></mean>',
  }))).toEqual({
    ok: false,
    error: {
      kind: 'empty-canonical-definition',
      rowId: 1,
      term: 'empty',
    },
  });
});
~~~

- [ ] **Step 3: Implement the smallest supported renderer**

Treat mean, dro, sb, sen, sense, dt, uns, un, cxl-ref, dx-jump, p, div, span,
strong, em, and br as supported or transparent first-version structures.
Omit audio controls and empty presentation nodes. Convert meaningful blocks to
div nodes with source-order content. An unsupported visible element is atomic:
use its normalized visible text once and do not recurse into it.

- [ ] **Step 4: Run conversion tests**

~~~bash
bun test packages/merriam_webster_unabridged/tests/conversion/convertCanonical.test.ts
~~~

Expected: PASS.

---

### Task 6: Yomitan Record Assembly and Deterministic Build Report

**Files:**

- Create: packages/merriam_webster_unabridged/src/yomitan/assembleRecords.ts
- Create: packages/merriam_webster_unabridged/src/build/report.ts
- Test: packages/merriam_webster_unabridged/tests/yomitan/assembleRecords.test.ts
- Test: packages/merriam_webster_unabridged/tests/build/report.test.ts

**Interfaces:**

Produce:

~~~ts
export function assembleCanonicalRecord(
  converted: ConvertedCanonical,
  sequenceNumber: number,
): TermInformation;

export function assembleSoftLinkRecord(
  link: SoftLinkEntryPlan,
  sequenceNumber: number,
): TermInformation;

export function serializeBuildReport(report: BuildReport): string;

export function createBuildReport(input: BuildReportInput): BuildReport;
~~~

Define the report input types explicitly:

~~~ts
export interface DependencyReportEntry {
  readonly row: IndexedSourceRow;
  readonly reason: string;
}

export interface BuildReportInput {
  readonly requestedWords: readonly string[];
  readonly rootRows: readonly IndexedSourceRow[];
  readonly dependencyRows: readonly DependencyReportEntry[];
  readonly decisions: readonly OwnershipDecision[];
  readonly canonicalEntryPlans: readonly CanonicalEntryPlan[];
  readonly softLinkEntries: readonly SoftLinkEntryPlan[];
  readonly conversions: readonly ConvertedCanonical[];
  readonly errors: readonly BuildFatalError[];
  readonly archivePath: string | null;
}

export type BuildFatalError =
  | { readonly kind: 'missing-root'; readonly word: string }
  | { readonly kind: 'missing-dependency'; readonly target: string }
  | {
      readonly kind: 'empty-canonical-definition';
      readonly rowId: number;
      readonly term: string;
    }
  | { readonly kind: 'schema'; readonly message: string }
  | { readonly kind: 'io'; readonly message: string };

export interface BuildReport extends BuildReportInput {
  readonly totals: {
    readonly roots: number;
    readonly dependencies: number;
    readonly canonicalEntries: number;
    readonly softLinkEntries: number;
    readonly findings: number;
    readonly errors: number;
  };
}
~~~

- [ ] **Step 1: Write failing tuple tests**

~~~ts
test('assembles canonical and soft-link tuples without copied definitions', () => {
  const canonical = assembleCanonicalRecord({
    plan: lexicalPlan({ term: 'in-' }),
    content: { tag: 'div', content: 'prefix form' },
    findings: [],
  }, 1);
  expect(canonical[0]).toBe('in-');
  expect(canonical[1]).toBe('');
  expect(canonical[5][0]).toMatchObject({ type: 'structured-content' });

  const link = assembleSoftLinkRecord(
    softLink('il', 'in-', ['alternative']),
    2,
  );
  expect(link).toEqual([
    'il',
    '',
    null,
    '',
    -100,
    [['in-', ['alternative']]],
    2,
    '',
  ]);
});
~~~

- [ ] **Step 2: Implement record assembly**

Canonical tuples use popularity 0. Soft links use popularity -100 so direct
records rank first. Both use empty reading, empty deinflectors, and empty term
tags. Canonical definitions use:

~~~ts
{
  type: 'structured-content',
  content: converted.content,
}
~~~

Soft-link definitions use exactly [target, [...rules]].

- [ ] **Step 3: Write failing deterministic report tests**

~~~ts
test('serializes stable report data with a final newline', () => {
  const report = createBuildReport({
    requestedWords: ['in'],
    rootRows: [{
      id: 1,
      encodedKey: 'in',
      decodedKey: 'in',
    }],
    dependencyRows: [{
      row: {
        id: 2,
        encodedKey: 'in-',
        decodedKey: 'in-',
      },
      reason: 'main-to-alternative-spelling-soft-link',
    }],
    decisions: [decision('in-', 'alternative-spelling-canonical-entry', null)],
    canonicalEntryPlans: [mainCanonicalEntryPlan({ term: 'in-' })],
    softLinkEntries: [softLinkEntryPlan(
      'in',
      'in-',
      [],
      'main-to-alternative-spelling-soft-link',
    )],
    conversions: [],
    errors: [],
    archivePath: 'Merriam Webster Unabridged.zip',
  });

  const first = serializeBuildReport(report);
  const second = serializeBuildReport(report);
  expect(first).toBe(second);
  expect(first.endsWith('\\n')).toBe(true);
});
~~~

- [ ] **Step 4: Implement BuildReport without timestamps**

Do not include current time, random IDs, absolute output-directory paths, or
unordered object/map iteration. Store the successful archive path relative to
the requested output directory. Preserve root, dependency, decision, plan,
finding, and record order from the pipeline. JSON.stringify(report, null, 2)
plus one newline is the only serializer.

- [ ] **Step 5: Run assembly and report gates**

~~~bash
bun test \
  packages/merriam_webster_unabridged/tests/yomitan/assembleRecords.test.ts \
  packages/merriam_webster_unabridged/tests/build/report.test.ts
~~~

Expected: PASS.

---

### Task 7: Selected Build Orchestration, ZIP Export, and CLI Replacement

**Files:**

- Create: packages/merriam_webster_unabridged/src/pipeline/runBuild.ts
- Replace: packages/merriam_webster_unabridged/src/index.ts
- Modify: packages/merriam_webster_unabridged/package.json
- Test: packages/merriam_webster_unabridged/tests/helpers/createTestDatabase.ts
- Test: packages/merriam_webster_unabridged/tests/build/integration.test.ts

**Interfaces:**

Define ports so integration tests use isolated SQLite and filesystem fixtures:

~~~ts
export interface BuildPaths {
  readonly outputDirectory: string;
  readonly reportPath: string;
}

export interface BuildRequest {
  readonly requestedWords: readonly string[];
  readonly databasePath: string;
  readonly buildPaths: BuildPaths;
}

export type BuildAttempt =
  | {
      readonly ok: true;
      readonly archivePath: string;
      readonly report: BuildReport;
      readonly records: readonly TermInformation[];
    }
  | {
      readonly ok: false;
      readonly report: BuildReport;
    };

export async function runBuild(
  request: BuildRequest,
): Promise<BuildAttempt>;
~~~

- [ ] **Step 1: Write failing integration selection tests**

Create a temporary SQLite database with word(id INTEGER PRIMARY KEY, w TEXT,
m TEXT). In tests/helpers/createTestDatabase.ts define:

~~~ts
import Database from 'bun:sqlite';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface TestDatabaseRow {
  readonly id: number;
  readonly encodedKey: string;
  readonly html: string;
}

export async function createTestBuildRequest(input: {
  readonly words: readonly string[];
  readonly rows: readonly TestDatabaseRow[];
}): Promise<BuildRequest> {
  const directory = await mkdtemp(join(tmpdir(), 'mwu-v1-'));
  const databasePath = join(directory, 'MWU.db');
  const database = new Database(databasePath);
  database.exec(
    'CREATE TABLE word (id INTEGER PRIMARY KEY NOT NULL, w TEXT, m TEXT);' +
    'CREATE TABLE alt (id INTEGER NOT NULL, w TEXT);',
  );
  const insert = database.prepare(
    'INSERT INTO word (id, w, m) VALUES (?, ?, ?)',
  );
  input.rows.forEach(({ id, encodedKey, html }) => {
    insert.run(id, encodedKey, html);
  });
  database.close();

  return {
    requestedWords: input.words,
    databasePath,
    buildPaths: {
      outputDirectory: join(directory, 'build'),
      reportPath: join(directory, 'build', 'build-report.json'),
    },
  };
}

export const representativeRows: readonly TestDatabaseRow[] = [
  {
    id: 1,
    encodedKey: 'o',
    html:
      mean('o', definition('letter')) +
      mean("o'", definition('apostrophe form')) +
      mean('oh', definition('exclamation')),
  },
  { id: 2, encodedKey: 'o%27', html: mean("o'", definition('apostrophe')) },
  { id: 3, encodedKey: 'oh', html: mean('oh', definition('exclamation')) },
];
~~~

createTestBuildRequest must use mkdtemp(), create word and alt tables with
bun:sqlite, insert rows using a prepared statement, and return build/report
paths under that temporary directory. Test:

~~~ts
test('builds only requested roots plus dedicated dependencies', async () => {
  const request = await createTestBuildRequest({
    words: ['o'],
    rows: representativeRows,
  });
  const attempt = await runBuild(request);

  expect(attempt.ok).toBe(true);
  if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));
  expect(attempt.report.requestedWords).toEqual(['o']);
  expect(attempt.report.dependencyRows.map(({ row }) => row.decodedKey))
    .toEqual(["o'", 'oh']);
  expect(attempt.records.some(([term]) => term === 'unrequested')).toBe(false);
});
~~~

- [ ] **Step 2: Implement runBuild in deterministic stages**

The function must:

1. open SQLite read-only;
2. build the lightweight row index;
3. resolve roots or record missing-root fatal errors;
4. load and plan roots;
5. load and plan dependencies until closure;
6. convert canonical plans;
7. reject empty definitions and dangling targets;
8. assemble direct records first and links second;
9. validate term tuples before export;
10. write build-report.json;
11. export the ZIP only when no fatal errors exist.

- [ ] **Step 3: Export with yomichan-dict-builder**

Use:

~~~ts
const index = new DictionaryIndex()
  .setTitle('Merriam Webster Unabridged')
  .setRevision('1.0.0-v1')
  .setAuthor('Birudo')
  .setDescription('Selected-word Merriam Webster Unabridged dictionary')
  .setAttribution('https://www.merriam-webster.com/')
  .setSequenced(true)
  .build();

const dictionary = new Dictionary({
  fileName: 'Merriam Webster Unabridged.zip',
});
await dictionary.setIndex(index);
for (const record of records) await dictionary.addTerm(record);
await dictionary.export(request.paths.outputDirectory);
~~~

- [ ] **Step 4: Replace the executable CLI**

src/index.ts must:

1. parse process.argv.slice(2);
2. read the optional words file only when present;
3. call collectRequestedWords;
4. call runBuild using assets/MWU.db and build/;
5. print a short success summary or fatal diagnostics;
6. set process.exitCode = 1 on failure.

It must not import the old parser, queryWordRows, chainIterators, or TermEntryData.

- [ ] **Step 5: Update package scripts**

Set:

~~~json
{
  "scripts": {
    "build:selected": "bun run src/index.ts",
    "dev:build": "bun run src/index.ts --words what word useless"
  }
}
~~~

Retain unrelated design/survey scripts.

- [ ] **Step 6: Run the integration gate**

~~~bash
bun test packages/merriam_webster_unabridged/tests/build/integration.test.ts
~~~

Expected: PASS with temporary output only.

- [ ] **Step 7: Smoke the real CLI**

~~~bash
bun run packages/merriam_webster_unabridged/src/index.ts \
  --words what take in o
~~~

Expected: exit 0, build/build-report.json exists, and build/Merriam Webster
Unabridged.zip exists.

---

### Task 8: Schema, Determinism, Browser Import, and Obsolete-Code Cleanup

**Files:**

- Create: packages/merriam_webster_unabridged/tests/archive/schema.test.ts
- Modify: packages/merriam_webster_unabridged/tests/import_dict.ts to add --query and --close, enforce import-error checks, and verify dictionary-count increase
- Remove after replacement verification: packages/merriam_webster_unabridged/src/db.ts
- Remove after replacement verification: packages/merriam_webster_unabridged/src/parser.ts
- Remove after replacement verification: packages/merriam_webster_unabridged/src/termTagCollector.ts
- Remove or replace obsolete tests: packages/merriam_webster_unabridged/tests/parse.test.ts
- Remove or replace obsolete tests: packages/merriam_webster_unabridged/tests/parseDefinition.test.ts
- Remove or replace obsolete tests: packages/merriam_webster_unabridged/tests/buildDetailedDefinition.test.ts
- Modify after behavior is confirmed: packages/merriam_webster_unabridged/README.md

**Interfaces:**

- Consumes the production ZIP and report.
- Produces the final first-version verification record and leaves one production build path.

- [ ] **Step 1: Add schema tests using the bundled Yomitan validators**

Import dictionaryIndex and dictionaryTermBankV3 from:

packages/merriam_webster_unabridged/tests/fixture/yomitan-chrome-playwright/lib/validate-schemas.js

Unzip the generated archive in a temporary directory, parse index.json and
every term_bank_N.json, then assert:

~~~ts
expect(dictionaryIndex(indexJson)).toBe(true);
expect(dictionaryTermBankV3(termBankJson)).toBe(true);
~~~

On failure, include validator.errors in the assertion message.

- [ ] **Step 2: Add dangling-link and deterministic-build assertions**

Collect every canonical record term and every dictionary-deinflection target.
Assert every target exists in the canonical set. Build the same isolated input
twice into separate temporary directories and compare parsed term banks and
parsed reports with toEqual(), ignoring ZIP byte metadata.

- [ ] **Step 3: Run the complete automated gate**

~~~bash
bun test \
  packages/merriam_webster_unabridged/tests/build \
  packages/merriam_webster_unabridged/tests/source \
  packages/merriam_webster_unabridged/tests/level1 \
  packages/merriam_webster_unabridged/tests/conversion \
  packages/merriam_webster_unabridged/tests/yomitan \
  packages/merriam_webster_unabridged/tests/archive
~~~

Expected: PASS.

- [ ] **Step 4: Verify browser-import success signals**

The importer must wait for .dictionary-import-progress to hide, fail when
#dictionary-error contains text, and assert that #dictionary-list[data-count]
increases. Run:

~~~bash
bun run packages/merriam_webster_unabridged/tests/import_dict.ts \
  "packages/merriam_webster_unabridged/build/Merriam Webster Unabridged.zip" \
  --query "what, take the word, in, o, il" \
  --close
~~~

Expected: import success, no dictionary error, dictionary count increases, and
the process exits 0.

- [ ] **Step 5: Remove only directly superseded old code**

Before deletion, prove no production import references parser.ts,
termTagCollector.ts, TermEntryData, SenseNode, queryWordRows, or
chainIterators:

~~~bash
rg -n "parser.ts|TermEntryData|SenseNode|queryWordRows|chainIterators|termTagCollector|process.stdin" \
  packages/merriam_webster_unabridged/src \
  packages/merriam_webster_unabridged/tests
~~~

Delete obsolete modules and old tests only after their replacement gates pass.
Do not delete design-fixture or survey artifacts.

- [ ] **Step 6: Update package documentation**

README must document:

~~~text
bun run src/index.ts --words give in "take the word"
bun run src/index.ts --words-file words.txt
bun run src/index.ts --words give --words-file words.txt
~~~

State explicitly that v1 implements selected-word Level 1 ownership and links
with conservative readable definitions, not final six-level presentation or
full-database coverage.

- [ ] **Step 7: Run final checks**

~~~bash
openspec validate build-mwu-dictionary-first-slice --strict
git diff --check
git status --short
~~~

Expected: OpenSpec valid, no whitespace errors, and only intended files changed.

## Completion Criteria

- --words accepts multiple shell arguments and --words-file accepts one target
  per line.
- The command never reads roots from stdin or performs an implicit full build.
- All seven Level 1 families have isolated positive, negative, evidence, and
  deduplication tests.
- Requested roots and dedicated dependencies are separately reported.
- Every soft link resolves to a canonical record and contains no copied
  definition.
- Canonical records contain readable owner-local structured definitions with
  empty Yomitan readings.
- Repeated builds have equal semantic term-bank and report data.
- Index and term-bank schemas validate.
- Browser import completes without error and increases dictionary count.
- The old production path is removed without a compatibility adapter.
- The hand-authored fixture remains reference evidence only.

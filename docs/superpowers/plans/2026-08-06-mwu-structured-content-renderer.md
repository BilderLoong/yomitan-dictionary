# MWU Structured-Content Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render selected MWU entries as structured, MWU-shaped Yomitan content instead of anonymous flattened blocks.

**Execution status (2026-08-06):** Implemented in the `structure-content`
worktree. The renderer, POS tuple propagation, real-source integration test,
archive checks, importer assertions, screenshot option, and documentation are
complete. The Chrome MCP connector was unavailable; local bundled Chromium
passed the import/search gate instead.

**Architecture:** Keep Level 1 source ownership and build orchestration intact. Add a pure Cheerio-backed semantic renderer that returns schema-valid structured content plus conversion findings, then let term-bank assembly carry the renderer's POS tag. Keep browser import and visual assertions at the edge.

**Tech Stack:** Bun 1.3, TypeScript ESM, Cheerio, `bun:sqlite`, Yomitan structured-content types, Bun test, local Yomitan Chromium fixture/import harness.

## Global Constraints

- Keep canonical ownership, soft-link direction, dependency closure, and selected-word CLI behavior unchanged.
- Keep Yomitan reading fields empty and retain MWU pronunciations in structured content.
- Use only schema-valid Yomitan structured-content tags and return unknown visible subtrees as findings plus readable fallback text.
- Core rendering functions are deterministic, immutable, explicitly typed, and side-effect free.
- Preserve the existing dirty `termTagMap.tsv` and `pnpm-lock.yaml` changes in the worktree.

---

### Task 1: Freeze the renderer contract with failing tests

**Files:**
- Modify: `packages/merriam_webster_unabridged/tests/conversion/convertCanonical.test.ts`
- Create: `packages/merriam_webster_unabridged/tests/helpers/structuredContentAssertions.ts`

**Interfaces:**
- Consumes: `convertCanonical(plan)` and the existing `mainCanonicalEntryPlan` test factory.
- Produces: focused assertions that later renderer code must satisfy without relying on implementation details.

- [x] **Step 1: Add the failing semantic-header test**

```ts
test("renders an MWU header with headword, pronunciation, and POS metadata", () => {
  const result = convertCanonical(
    mainCanonicalEntryPlan({
      term: "process",
      ownerHtml:
        '<mean><div class="page-content"><div class="entry-header">' +
        '<h1 class="hword">pro·cess<sup>1</sup></h1>' +
        '<span class="fl">noun</span><span class="prs">' +
        '<span class="pr">¦prä-ˌses</span><span class="pr">¦prō-</span>' +
        '</span></div><div class="section" data-id="definition">' +
        '<div class="sense"><span class="dt">: a series of actions</span>' +
        "</div></div></div></mean>",
    }),
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.definitionTags).toBe("n");
  expect(JSON.stringify(result.value.content)).toContain("pro·cess");
  expect(JSON.stringify(result.value.content)).toContain("/ˈprä-ˌses/");
  expect(JSON.stringify(result.value.content)).toContain("/ˈprō-/");
});
```

- [x] **Step 2: Add failing hierarchy/example/section assertions**

```ts
test("renders nested sense markers, highlighted examples, and collapsed extras", () => {
  const result = convertCanonical(
    mainCanonicalEntryPlan({
      term: "what",
      ownerHtml:
        '<mean><div class="page-content"><div class="entry-header">' +
        '<h1 class="hword">what<sup>1</sup></h1><span class="fl">pronoun</span>' +
        '</div><div class="section" data-id="definition"><div class="sb has-num">' +
        '<span class="sb-0"><div class="sense"><span class="sn"><span class="num">1</span></span>' +
        '<span class="dt">: an interrogative word <span class="ex-sent-group">' +
        '<span class="ex-sent">→ <span class="mw_t_wi">what</span> is this</span></span>' +
        '<span class="ex-sent-group"><span class="ex-sent">→ what did you say</span>' +
        '</span></span></div></span></div></div>' +
        '<div class="def-accordion-sections"><div class="section" data-id="origin">' +
        '<h2 class="toggle"><span class="text">Origin of WHAT</span></h2>' +
        '<div class="section-content"><p>Old English</p></div></div></div>' +
        "</div></mean>",
    }),
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const serialized = JSON.stringify(result.value.content);
  expect(serialized).toContain('"tag":"ol"');
  expect(serialized).toContain('"listStyleType":"decimal"');
  expect(serialized).toContain('"backgroundColor":"orange"');
  expect(serialized).toContain('"content":"extra-examples"');
  expect(serialized).toContain('"content":"origin"');
  expect(serialized).toContain('"open":false');
});
```

- [x] **Step 3: Run the focused tests and confirm the new expectations fail for the missing contract**

Run: `bun test packages/merriam_webster_unabridged/tests/conversion/convertCanonical.test.ts`

Expected: FAIL because `ConvertedCanonical` does not yet expose `definitionTags` and the current converter emits nested anonymous `div` nodes without semantic header/list/section metadata.

- [x] **Step 4: Add helper predicates only after the failure is observed**

Create `structuredContentAssertions.ts` with typed recursive helpers that inspect `tag`, `data.content`, and child content without changing production behavior. Keep the helpers pure and avoid `any`/casts.

### Task 2: Implement pure source-node and inline rendering

**Files:**
- Create: `packages/merriam_webster_unabridged/src/conversion/renderStructuredContent.ts`
- Modify: `packages/merriam_webster_unabridged/src/conversion/convertCanonical.ts`
- Modify: `packages/merriam_webster_unabridged/tests/conversion/convertCanonical.test.ts`

**Interfaces:**
- Consumes: `CanonicalEntryPlan` owner HTML and Cheerio DOM nodes.
- Produces: `renderCanonicalContent(plan): Result<RenderedCanonicalContent, ConversionError>` with `content`, `definitionTags`, `findings`, and deterministic visible text.

- [x] **Step 1: Define the renderer result and semantic node constructors**

```ts
export interface RenderedCanonicalContent {
  readonly content: StructuredContent;
  readonly definitionTags: string | null;
  readonly findings: readonly ConversionFinding[];
  readonly visibleText: string;
}

export const renderCanonicalContent = (
  plan: CanonicalEntryPlan,
): Result<RenderedCanonicalContent, ConversionError> => {
  // Parse, extract, and render; no file, network, time, or global state access.
};
```

- [x] **Step 2: Implement immutable text normalization and class-aware inline mapping**

Use the following output policy in `renderInlineNode`:

```ts
const targetStyle: StructuredContentStyle = {
  backgroundColor: "orange",
  fontWeight: "bold",
};

const italicStyle: StructuredContentStyle = { fontStyle: "italic" };

const renderTarget = (content: StructuredContent): StructuredContent => ({
  tag: "span",
  data: { content: "target-highlight" },
  style: targetStyle,
  content,
});
```

Map `mw_t_wi`, `mw_t_it`, `sl`, `sdsense`, and supported punctuation wrappers to schema-valid `span` nodes. Keep visible text from `a`/`cxl-ref`/`dx-jump`, but never emit `gdlookup://` or `bword://` URLs.

- [x] **Step 3: Implement header extraction and assert the focused header test passes**

Extract `.hword`, `.fl`, `.lbs`, `.prs .pr`, and `.vg-ins` into `mwu-header`. Normalize `¦` to `ˈ`, wrap each pronunciation in `/.../`, preserve display syllable dots, and map common POS labels with a pure lookup table.

Run: `bun test packages/merriam_webster_unabridged/tests/conversion/convertCanonical.test.ts -t "MWU header"`

Expected: PASS for the new test and the existing source-order/link/fallback/empty-owner tests.

### Task 3: Implement source hierarchy, definitions, examples, origin, and phrases

**Files:**
- Modify: `packages/merriam_webster_unabridged/src/conversion/renderStructuredContent.ts`
- Modify: `packages/merriam_webster_unabridged/src/conversion/convertCanonical.ts`
- Modify: `packages/merriam_webster_unabridged/tests/conversion/convertCanonical.test.ts`

**Interfaces:**
- Consumes: class-marked MWU `.sb`, `.sense`, `.dt`, `.ex-sent-group`, `.uns`, `.dro`, and origin nodes.
- Produces: nested native lists, definition-flow nodes, collapsed details nodes, and one finding per unsupported visible subtree.

- [x] **Step 1: Flatten sense DOM into immutable marker paths**

Represent each source sense as:

```ts
interface SenseRecord {
  readonly markerPath: readonly {
    readonly level: 3 | 4 | 5;
    readonly marker: string;
  }[];
  readonly content: StructuredContent;
}
```

Build the ordered list tree by grouping marker-path prefixes. Use `decimal` for level 3/5 and `lower-alpha` for level 4. A sense with `1 a (1)` must produce nested list items rather than a single flat label string.

- [x] **Step 2: Render definitions and local attachments in source order**

Render `.dt` direct content as a `definition`/`usage-note` flow, then attach `.ex-sent-group`, `.uns`, `.sdsense`, cross references, and attribution to the nearest sense. Render one example directly and the remaining examples under:

```ts
{
  tag: "details",
  data: { content: "extra-examples" },
  open: false,
  content: [
    { tag: "summary", content: `${remaining} more examples` },
    ...remainingExamples,
  ],
}
```

- [x] **Step 3: Render origin and defined phrase sections as collapsed details**

Use `data.content` values `origin`, `origin-section-title`, `origin-text`, and `phrase`. Keep phrase body order and reuse definition/example rendering for phrase-local definitions.

- [x] **Step 4: Run the full focused conversion test file and fix only production behavior**

Run: `bun test packages/merriam_webster_unabridged/tests/conversion/convertCanonical.test.ts`

Expected: PASS with no raw unsupported HTML tags in the serialized structured content; the unsupported subtree test still reports one finding and one fallback.

### Task 4: Carry POS metadata through term-bank assembly and real MWU integration

**Files:**
- Modify: `packages/merriam_webster_unabridged/src/yomitan/assembleRecords.ts`
- Modify: `packages/merriam_webster_unabridged/src/build/runBuild.ts`
- Modify: `packages/merriam_webster_unabridged/src/conversion/convertCanonical.ts`
- Create: `packages/merriam_webster_unabridged/tests/build/structuredContentIntegration.test.ts`

**Interfaces:**
- Consumes: `ConvertedCanonical.definitionTags` and real `MWU.db` source rows.
- Produces: canonical term-bank records with WTY-style definition tags and deterministic structured content.

- [x] **Step 1: Add a failing real-source integration assertion**

Assert that building `what`, `take`, `process`, `set`, and `hand` yields canonical records whose structured roots contain `mwu-header`, at least one `ol` for entries with senses, and no `unsupported-visible-subtree` finding for the known covered classes.

- [x] **Step 2: Pass definition tags into `assembleCanonicalRecord`**

Change the canonical tuple construction from a hard-coded `null` definition tag to:

```ts
converted.definitionTags
```

Keep `reading` as `""`, popularity/sequence ordering unchanged, and soft links untouched.

- [x] **Step 3: Run focused and real-source gates**

Run:

```sh
bun test packages/merriam_webster_unabridged/tests/conversion/convertCanonical.test.ts packages/merriam_webster_unabridged/tests/yomitan/assembleRecords.test.ts packages/merriam_webster_unabridged/tests/build/structuredContentIntegration.test.ts
bun run packages/merriam_webster_unabridged/src/index.ts --words what take process set hand
```

Expected: focused tests pass; the build exits zero and its report has no fatal errors. Any remaining findings must be named and either supported by the renderer or retained as explicit fallback evidence.

### Task 5: Restore deterministic archive/schema and browser harness gates

**Files:**
- Modify: `packages/merriam_webster_unabridged/tests/import_dict.ts`
- Modify: `packages/merriam_webster_unabridged/tests/import_options.ts`
- Modify: `packages/merriam_webster_unabridged/tests/import_options.test.ts`
- Modify: `packages/merriam_webster_unabridged/package.json`

**Interfaces:**
- Consumes: an archive path, optional query, optional extension path, and optional close flag.
- Produces: deterministic import completion/error/count checks and representative rendered search assertions.

- [x] **Step 1: Add an explicit extension-path option with a default**

The default remains the package-local fixture path. The option allows the ignored historical fixture in the main checkout to be used without copying it into the worktree. Add parser tests for absolute and relative paths.

- [x] **Step 2: Make the dictionary harness assert rendered results**

After import completion, assert dictionary count increases, query results exist, and representative result content includes the selected term plus one of the structured labels (`Origin`, a definition list, or an example). Keep `--close` for CI and omit it for manual inspection.

- [x] **Step 3: Run archive/schema/import gates**

Run:

```sh
bun test packages/merriam_webster_unabridged/tests/archive/schema.test.ts packages/merriam_webster_unabridged/tests/import_options.test.ts
bun run packages/merriam_webster_unabridged/src/index.ts --words what take process set hand
bun run packages/merriam_webster_unabridged/tests/import_dict.ts "/Users/birudo/Projects/yomitan-dictionary/.worktrees/structure-content/packages/merriam_webster_unabridged/build/Merriam Webster Unabridged.zip" --extension-path "/Users/birudo/Projects/yomitan-dictionary/packages/merriam_webster_unabridged/tests/fixture/yomitan-chrome-playwright" --query "what take process" --close
```

Expected: schemas pass and the local bundled Chromium harness imports the archive with no UI error and a larger dictionary count. If Chrome MCP remains unavailable, record that exact limitation separately.

### Task 6: Update the project findings and complete verification

**Files:**
- Modify: `PROJECT_NOTES.md`
- Modify: `packages/merriam_webster_unabridged/README.md`
- Modify: `packages/merriam_webster_unabridged/design-fixtures/render-audit.md`
- Modify: `packages/merriam_webster_unabridged/design-fixtures/README.md`

**Interfaces:**
- Consumes: verified renderer behavior, report counts, archive/import output, and browser limitations.
- Produces: current documentation that distinguishes production output from the design fixture and names all verification gates.

- [x] **Step 1: Document the renderer ownership and structured-content contract**

Record header/list/attachment rules, source classes covered, fallback finding behavior, and why Yomitan reading remains empty.

- [x] **Step 2: Record rendered representative searches and unresolved evidence**

Update the visual audit with the actual query set, counts, collapsed sections, target highlighting, and any source classes still reported as findings. Do not call the whole repository green if unrelated baseline diagnostics remain.

- [x] **Step 3: Run final gates before claiming completion**

Run:

```sh
bun test packages/merriam_webster_unabridged/tests/conversion packages/merriam_webster_unabridged/tests/yomitan packages/merriam_webster_unabridged/tests/build packages/merriam_webster_unabridged/tests/level1 packages/merriam_webster_unabridged/tests/source packages/merriam_webster_unabridged/tests/import_options.test.ts
bun test packages/merriam_webster_unabridged/design-fixtures
git diff --check
```

Inspect `git status --short`, the generated report, the archive contents, and the final structured JSON. Report focused passes and pre-existing fixture/environment limitations separately.

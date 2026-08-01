# MWU HTML Reconnaissance Survey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an evidence-first survey process for the MWU HTML so that we can name every important information type, assign it to the six-level hierarchy, and identify information that is intentionally excluded or not yet recognized.

**Architecture:** The survey begins with read-only raw HTML reconnaissance and only adds semantic inspection rules after actual DOM structures have been observed. A living Markdown survey document records word names, findings, exclusions, and unknowns; a later small inspector can emit structured evidence without deciding the final Yomitan representation.

**Tech Stack:** Bun, `bun:sqlite`, Cheerio, the existing MWU SQLite database, `rg`, Markdown, and the local Yomitan/WTY source references.

## Global Constraints

- Do not implement or evaluate converter output as part of this survey.
- Treat raw MWU HTML and Yomitan documentation as the sources of truth.
- Use read-only database and filesystem inspection until the survey design is reviewed.
- The survey tool output must contain exactly three findings sections: interesting information, not needed, and not yet noticed/not recognized.
- The living survey document must be organized by information unit and semantic level, with binding variations recorded explicitly.
- Report the exact words inspected without copying large dictionary entries.
- Preserve the distinction between information absent from a selected word and information absent from the dictionary as a whole.
- Use integer hierarchy names: Level 1 through Level 6; do not use the old conceptual `1.5` label.
- Mark first-known-use and pronunciation-audio as Ignore=true for the current
  dictionary output. Defer audio extraction to a later phase.

---

### Task 1: Establish the survey vocabulary and living documents

**Files:**
- Modify: `/Users/birudo/Projects/yomitan-dictionary/PROJECT_NOTES.md`
- Create: `/Users/birudo/Projects/yomitan-dictionary/docs/mwu-html-survey/README.md`
- Archive: `/Users/birudo/Projects/yomitan-dictionary/docs/mwu-html-survey/archived/what.md`
- Create: `/Users/birudo/Projects/yomitan-dictionary/docs/superpowers/plans/2026-08-01-mwu-html-reconnaissance.md`

**Interfaces:**
- Produces the six-level hierarchy, the information-type vocabulary, and the
  three-section survey contract used by all later reconnaissance.

- [x] **Step 1: Record the hierarchy, information units, and tool output sections**

Use these names:

```text
Level 1: Lexical Entry (part-of-speech block)
Level 2: Verb Group (verb subtype/group, represented by an integer)
Level 3: Numbered Sense
Level 4: Lettered Subsense
Level 5: Individual Definition
Level 6: Definition Attachment
```

The living survey document must be organized by level and information unit.
The survey tool output, separately, must be organized as:

```text
## 1. Interesting information
## 2. Not needed
## 3. Not yet noticed / not recognized
```

- [x] **Step 2: Define the evidence record**

Each finding should be representable with these fields, even if the first
survey is written by hand:

```text
word
informationName
unitLevel
boundTo
sourceSelectorOrTag
ownerPath
parserStatus
findingSection
notes
```

`parserStatus` must distinguish `recognized`, `partially-recognized`, and
`unrecognized`. `findingSection` must distinguish deliberate exclusion from
an unknown or unobserved structure.

### Task 2: Perform raw reconnaissance on the baseline word

**Files:**
- Read: `/Users/birudo/Projects/yomitan-dictionary/packages/merriam_webster_unabridged/assets/MWU.db`
- Read: `/Users/birudo/Projects/yomitan-dictionary/packages/merriam_webster_unabridged/src/db.ts`
- Read: `/Users/birudo/Projects/yomitan-dictionary/packages/merriam_webster_unabridged/src/parser.ts`
- Modify: `/Users/birudo/Projects/yomitan-dictionary/docs/mwu-html-survey/README.md`

**Interfaces:**
- Consumes exact `word.w = 'what'` rows and their raw `word.m` HTML.
- Produces DOM ownership evidence and the first completed survey entry.

- [x] **Step 1: Query the exact word and its alternate rows without editing the database**

Run from the package directory:

```bash
bun -e 'import Database from "bun:sqlite"; const db = new Database("assets/MWU.db", {readonly: true}); console.log(db.query("SELECT id, w, length(m) AS htmlLength FROM word WHERE w = ?").all("what")); console.log(db.query("SELECT id, w FROM alt WHERE id IN (SELECT id FROM word WHERE w = ?)").all("what"));'
```

Record the exact word and row identifiers in the survey document, without
copying the full HTML.

- [x] **Step 2: Inspect DOM parent/child ownership**

Use Cheerio to report element names, class tokens, direct children, and short
text previews for the `what` row. Do not infer ownership from visual
indentation alone. For each relevant node, record the nearest structural
ancestor and the information type it appears to own.

- [x] **Step 3: Compare raw evidence with the current parser vocabulary**

Search `parser.ts` for the observed class tokens and mark each as
`recognized`, `partially-recognized`, or `unrecognized`. A parser class match
does not prove that the parser preserves the node's full semantics.

- [x] **Step 4: Write the first information-unit/level survey entry**

The entry must organize findings by information unit and level, record binding
variations, and list missing/unrecognized structures as follow-up questions.
The three-section split remains an output requirement for the future survey
tool, not the document outline.

### Task 3: Design the smallest repeatable survey inspector

**Files:**
- Create later, after Task 2 review: `/Users/birudo/Projects/yomitan-dictionary/packages/merriam_webster_unabridged/tools/inspectMwuHtml.ts`
- Test later: `/Users/birudo/Projects/yomitan-dictionary/packages/merriam_webster_unabridged/tests/inspectMwuHtml.test.ts`
- Modify later: `/Users/birudo/Projects/yomitan-dictionary/docs/mwu-html-survey/README.md`

**Interfaces:**
- Input: one or more exact MWU words and an optional database path.
- Output: structured evidence plus the three survey sections; it must not
  emit Yomitan entries or mutate the source database.

- [ ] **Step 1: Specify the read-only command shape after the `what` review**

The intended shape is:

```bash
bun run survey -- word what
bun run survey -- inventory
```

The first command inspects requested words. The second reports class/tag
coverage and example word names across the database. The exact command should
not be implemented until the first raw structure is understood.

- [ ] **Step 2: Keep the inspector evidence-first**

The inspector may report DOM paths, class frequencies, ownership candidates,
and parser coverage. It must not silently classify unknown HTML as a known
information type or decide its final Yomitan rendering.

- [ ] **Step 3: Add focused tests only after the output contract is reviewed**

Tests should cover the `what` structure, a missing word, multiple matching
rows, and an observed class that the parser does not recognize. Do not add
converter tests in this survey plan.

### Task 4: Expand coverage by information type

**Files:**
- Modify: `/Users/birudo/Projects/yomitan-dictionary/docs/mwu-html-survey/README.md`
- Archive: `/Users/birudo/Projects/yomitan-dictionary/docs/mwu-html-survey/archived/<word>.md`
- Modify: `/Users/birudo/Projects/yomitan-dictionary/PROJECT_NOTES.md`

**Interfaces:**
- Consumes the inspector's word/class inventory.
- Produces a reviewed source information catalog and a list of remaining
  unknown structures before parser changes are proposed.

- [x] **Step 1: Choose the next word by missing feature, not convenience**

Compared 12 exact words in parallel and selected `turn` because it had the
broadest single-word structural coverage. The selection scan covered
`give`, `set`, `run`, `take`, `make`, `put`, `break`, `turn`, `go`, `work`,
`process`, and `look`. The detailed evidence is in
`docs/mwu-html-survey/README.md`, with the historical snapshot in
`docs/mwu-html-survey/archived/turn.md`.

- [x] **Step 2: Reconcile repeated structures across words**

When the same class appears under different ancestors, keep separate evidence
until the ownership rule is confirmed. Do not create a global mapping based on
one word. The archived `what` and `turn` reports record detailed evidence,
while README records the shared rules and the remaining chat decisions. The
take and run reports add evidence for defined .drp phrase boundaries,
phrase-local .vr/.va alternatives, phrase-local .fl, and interposed-object
examples based on paired .mw_t_wi spans. The source decision is now that every
defined phrase form is independently searchable and the parent retains its
phrase section; only the later term-bank deduplication mechanism remains an
implementation detail.

- [x] **Step 3: Update project notes after each reviewed survey batch**

Move confirmed findings into `PROJECT_NOTES.md`; leave unresolved findings in
the survey document until their semantics are verified.
The current reviewed batch moved the take and run findings into the project
notes. Future batches continue this same step.

## Completion criteria for this plan

- `PROJECT_NOTES.md` contains no converter implementation status or test
  results.
- `docs/mwu-html-survey/README.md` contains shared information-unit and
  semantic-level rules, with binding variations recorded explicitly.
- Detailed reviewed word evidence is kept in
  `docs/mwu-html-survey/archived/`.
- Survey tool output contains the exact words inspected and all three required
  findings sections for each completed batch.
- The `what` entry has DOM ownership evidence rather than only visual guesses.
- The `turn` entry has verb-group, phrase, related-information, and
  sense-bound inflection evidence.
- Information deliberately excluded is separated from information not yet
  noticed or not recognized.
- No parser, builder, database, or generated dictionary files are changed by
  the reconnaissance phase.

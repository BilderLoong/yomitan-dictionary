# 03 — Audit source line-break and block-boundary shapes

**What to build:** Confidence that line breaks in the rendered output mean
what the source meant — meaningful source blocks preserved, responsive
presentation noise discarded, and no accidental breaks inserted into inline
labels.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Source:** TODO.md, "Research before the richer Level 1-6 parser".

- [x] Meaningful source blocks distinguished from responsive `.breakpoint`
      presentation
- [x] Ordinary inline labels verified to never acquire accidental line breaks
- [ ] Findings recorded in the living survey

## Findings (2026-08-07)

All counts are row-level queries on `word(id, w, m)`; every claim below was
grounded in a live query, with `w` decoded via `decodeURIComponent` before
comparison.

### Inventory of the line-break machinery

| Marker | Rows | Shape |
| --- | --- | --- |
| `<br` (literal) | 62 rows, 70 `<br>` elements | Usage-discussion / usage-notes / etymology prose only |
| `.breakpoints` class | 287,509 rows (61.1%) | `h1.hword > span.breakpoints > span.breakpoint*` |
| `.breakpoint` class | 287,509 rows | Identical row set to `.breakpoints` (0 rows have one without the other) |
| `<br` AND `breakpoints` | 8 rows | `anticipate` (10576), `bacteria` (17920), `complected` (149606), `crescendo` (155559), `how-do-you-do` (208524), `incredulous` (213334), `superlative` (359043), `transpire` (447008) — both markers present but in disjoint DOM regions (headword vs usage prose) |
| `<br` but no `breakpoints` | 54 rows | e.g. `abortive` (506), `above` (519), `brang` (29889), `care` (37325), `collegiate_gender` (84359), `collegiate_ohlone` (108856), `collegiate_sex` (127307), `lay` (226607), `most` (279513), `you` (469452) |

### Shape 1 — literal `<br>`: meaningful intra-prose line breaks (Level 6)

Every one of the 70 `<br>` elements across all 62 rows lives inside
usage-discussion or collegiate note prose. Owner paths (nearest 4 ancestors):

- `span.dt. > span.uns > div.usages > div.usage` (12 occurrences; e.g. id
  37325 `care`, 448114 `tried`)
- `span.sb-0 > div.sense.* > div.usages > div.usage` (37 occurrences across
  `.has-num-only` / `.has-sn` / `.no-subnum` variants; e.g. id 506 `abortive`,
  226607 `lay`, 319117 `queer`)
- `span.sb-1` / `span.sb-2` sense variants (15 occurrences; e.g. id 149877
  `comprise`, 467951 `wreck`)
- `div.section-content.usage-notes > div.sub-well > p` (8; id 84359
  `collegiate_gender`, 127307 `collegiate_sex` — `<br><br>` paragraph
  separators inside long prose)
- `div.section-content.etymology > div.sub-well > div` (4; id 108856
  `collegiate_ohlone` — separators inside an etymology note)
- `span.unText > span.unText > div.usages > div.usage` (1; id 469482
  `yourself` — br inside a deeply nested usage note)

Representative raw evidence, id 506 `abortive`:
`<span>Usage Discussion of <i>abortive</i></span><br> Sense 2 has been
objected to occasionally since the 1880s...` — the `<br>` separates the
`Usage Discussion of X` heading span from the body prose. Meaningful
line-break boundaries within an existing prose block; they never start or
end a semantic unit of their own.

### Shape 2 — `.breakpoints` / `.breakpoint`: responsive presentation chunks (headword only)

- 0 rows contain `breakpoints` without `class="hword"`; in a 400-row sample
  (`ORDER BY id LIMIT 400`, ids 2..89), **every** `.breakpoints` element was
  `h1.hword > span.breakpoints`, and **every** `.breakpoint` was inside such a
  wrapper (0 `.breakpoint` found outside a `.breakpoints` wrapper).
- Wrapper composition (633 wrappers / 400 rows): children are only
  `span.breakpoint` (1577), `span.breakpoint.no-hyphen` (782), `sup` (59 —
  homograph numbers, e.g. id 71 `a cappella`:
  `<span class="breakpoints"><sup>1</sup> <span class="breakpoint">a</span></span>`),
  and whitespace text nodes. `.breakpoint` chunks contain text only (2358/2358
  in the sample, 0 nested tags, 0 `sup` inside a chunk).
- Chunk boundaries are **not** syllabic: id 2 `1 ¹/₃′ pitch` chunks
  `pi`|`tch`, id 40 `3–D printer` chunks `pr`|`in`|`ter` (avg plain chunk
  length 2.1 chars, 28 single-char chunks). This confirms the
  `headword-display` catalog note that `.breakpoint` boundaries are responsive
  line-break chunks, not linguistic syllables.
- `.no-hyphen` semantics, determined from 400-row chunk-ending distribution:
  every `.no-hyphen` chunk ends in `·` U+00B7 MIDDLE DOT (756/782) or `–`
  U+2013 EN DASH (26/782) — i.e. the chunk already ends in visible punctuation
  (syllabification dot or compound-word en dash, e.g. `19–` in id 6
  `19-nortestosterone`), so a wrap there must not insert an additional hyphen.
  Plain chunks end in ordinary letters/digits.
- Multi-word headwords use multiple wrappers; inter-wrapper whitespace is the
  word separator (`3–D printer` = two wrappers). Concatenating only chunk text
  drops those spaces, so headword text must come from the `.hword` contents,
  not from chunk concatenation.

### Shape 3 — `.sls`: meaningful source block boundary without `<br>`

- 63,640 rows contain `class="sls"`. In a 60-row sample the shape is always
  `div.sls > span.sl` (61× single `.sl`, 1× two `.sl` spans), always a direct
  child of `div.vg`. The wrapper is a **block div**, which is what puts the
  label on its own line before the definition — a meaningful source block
  boundary with no literal `<br>`.
- `what's with` case (id 464223 `what`, the source of the catalog's
  `source-block-boundary` example): the `.dro` region alternates
  `span.drp` (phrase headword) with `div.vg` (that phrase's definition tree).
  The `what's with` `div.vg` is
  `div.sls > span.sl` = `slang`, immediately followed by
  `div.sb.no-sn` = `: what is the reason for : what is wrong with`. Sibling
  phrase labels in the same row: `what an if` → `archaic` (`.sls`),
  `what's o'clock` → `British` (`.sls`), while `what for` → `chiefly
  dialectal` and `what though` → `obsolete` sit **inline inside** the `.sb`
  definition (`<span class="sl">`). This matches the catalog distinction:
  `.sls > .sl` is a block-level label line; a bare inline `.sl` is not.

### Check 2 — accidental line breaks in inline labels: NONE found

- `<br` co-occurrence with each label class, row-level: `.sl` 0, `.fl` 0,
  `.il` 0, `.vl` 0, `.sgram` 0, `.lb` 0.
- `breakpoint` co-occurrence with each label class: `.sl` 0, `.fl` 0,
  `.il` 0, `.vl` 0, `.sgram` 0, `.lb` 0.
- DOM-level re-check on all 62 `<br>` rows: 0 `<br>` elements have a
  `.sl`/`.fl`/`.il`/`.vl`/`.sgram`/`.lb` ancestor (see Shape-1 owner paths —
  all are usage/etymology prose).

### Check 3 — `.breakpoints` wrapper semantics

Determinable from the samples: the wrapper is a responsive-presentation
container that splits the printed headword into wrap-friendly chunks
(`span.breakpoint`), with an optional `no-hyphen` class on chunks ending in
`·`/`–`. It appears only inside `h1.hword`, may contain the homograph `sup`
as a sibling of chunks, and is entirely presentation: boundaries carry no
lexical or syllabic meaning and must never be emitted as breaks or
hyphenation.

### Renderer status (grep of src/conversion/renderStructuredContent.ts, no edits)

- `<br>`: `renderInlineNode` returns `renderResult([{ tag: "br" }])` (line
  446) — literal break preserved. Correct, and only reachable from usage
  prose given the DB evidence.
- `.sls`: rendered as `container("div", ..., data: unitData("source-block-boundary", { level: 5, sourceUnit: "sls" }))` in both `renderInlineNode` (lines 598–608) and `renderLooseNode` (lines 2642–2655) — block boundary preserved as a `div`.
- `.sl`, `.lb`, `.spl`, `.sgram`: rendered as inline `span` containers with
  tag data (lines 550–597) — no block/line break introduced for ordinary
  inline labels. Correct per this audit.
- `.breakpoint` / `.breakpoints`: NOT in `ignoredClasses` (lines 94–103) and
  no dedicated branch in the renderer; the spans render transparently inline,
  so chunk text (including `·` and `–`) is preserved with no break inserted
  and nothing dropped. `src/level1/planCanonical.ts` (lines 53–56) already
  treats `.breakpoints`/`.breakpoint` as known headword markup when
  extracting the searchable headword.
- Headword display: `renderHeader` (line 2470+) builds `displayHeadword`
  from `.hword` contents text — preserves inter-wrapper whitespace (word
  separators) that chunk concatenation would lose.

### Verdicts

- **Accept** the catalog's `headword-display` note: `.breakpoint` boundaries
  are responsive presentation, not syllables (mid-syllable splits proven at
  ids 2 and 40). Renderer handling (transparent spans) is correct.
- **Accept** `source-block-boundary` as stated: meaningful block boundaries
  are structural (`div.sls`; `span.drp` + `div.vg` alternation) or literal
  `<br>` inside Level 6 usage prose; both are cleanly distinguishable from
  `.breakpoint` presentation by element type, class, and DOM location
  (`h1.hword` only).
- **Accept** the inline-label safety claim: DB-wide zero co-occurrence of
  `<br`/`breakpoint` with any label class.
- **Renderer: no change required** for line-break shapes found in this audit.
  The one gap is cosmetic, not semantic: `.breakpoint`/`.no-hyphen`
  responsive chunking is intentionally flattened (no responsive re-wrapping
  in Yomitan), which is the correct output for a static dictionary.

### Open questions / observations for the coordinator

1. Checkbox 3 ("Findings recorded in the living survey") left unchecked — per
   the working agreement this agent does not edit
   `docs/mwu-html-survey/README.md`; the coordinator should merge these
   findings (the Shape-1 `<br>` owner-path table and the `.no-hyphen` chunk
   evidence are new).
2. Aside (not line-break related, found during sampling): id 57
   `{it}N{/it}-allylnormorphine` has unprocessed `{it}` template text inside
   the headword (`<span class="breakpoint">cl</span><span class="breakpoint">as</span><span class="breakpoint">s=</span>...`),
   i.e. the source HTML contains literal `class="mw_t_it"` text. That is a
   template-artifact headword for a later headword-display ticket, not a
   line-break shape.
3. The 8 `br`+`breakpoints` rows confirm the two markers are independent
   mechanisms that can co-exist in one row without interacting (headword
   chunking vs usage prose).

## How to find these examples

Same DB/table as ticket 01 (`word(id, w, m)`; `w` percent-encoded, `m` = HTML; needles are literal `instr(m, …)` substrings).

| Shape | Needle | Word (id) | What to look at |
| --- | --- | --- | --- |
| literal `<br>` (Level 6 prose) | `<br` | abortive (506) | `<span>Usage Discussion of <i>abortive</i></span><br> Sense 2 has been objected to occasionally since the 1880s…` — the `<br>` separates the "Usage Discussion of X" heading span from the body. 62 rows total, every `<br>` lives in usage/etymology prose |
| `.breakpoints` / `.breakpoint` (responsive headword) | `class="breakpoints"` | a cappella (71) | `<h1 class="hword"> <span class="breakpoints"><sup>1</sup> <span class="breakpoint">a</span></span> <span class="breakpoints"><span class="breakpoint no-hyphen">cap…` — always `h1.hword > span.breakpoints > span.breakpoint*`; chunks of ~2 chars, presentation only |
| both markers in one row | `class="breakpoints"` + `<br` | anticipate (10576) | the two markers are in disjoint DOM regions: headword (`breakpoints`) vs usage prose (`<br>`) — never the same line |

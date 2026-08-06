# 04 — Settle presentation questions for recognized units

**What to build:** A decided visual treatment for each already-understood
information unit whose presentation is still open — nested citations, related
inline items, called-also reference numbers, and the Level 6
`.see-in-addition` line — verified in the rendered output.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Source:** TODO.md, "Research before the richer Level 1-6 parser".

- [x] Visual treatment decided for nested citations, related inline items,
      and called-also reference numbers
- [x] Level 6 `.see-in-addition` presentation decided (ownership already
      resolved; only presentation remains open)
- [x] `.sgram` stays scoped inline content for the first slice; tag-bank
      promotion is deferred research and does not block the parser

## Findings (2026-08-07)

Evidence below was produced by read-only queries against
`packages/merriam_webster_unabridged/assets/MWU.db`
(`SELECT id, w, m FROM word WHERE …`, full-table scans via `instr(m, …)`,
cheerio parsing of individual rows). All five decisions reuse the existing
survey vocabulary (example-source, example-sentence, extra-examples,
called-also, see-in-addition, related-item, synonym-term-group, synonym-term,
synonym-introduction, grammar-label, superscript-reference, usage-note,
sub-definition); no new vocabulary is introduced.

### 1. Nested citations — example attributions inside nested structures

**Decision: accept.** Example attributions render as `example-source`
(level 6) attached to their owning example inside the existing collapse
pattern, regardless of whether the example sits in a usage note or a
sub-definition. `.auth`/`.source`/`.aqdate` stay inside the `.aq` attribution
unit; the renderer already emits `.source`/`.auth` as
`example-source-inline` spans inside the attribution. No new unit, no new
level.

Evidence:

- Usage-note nesting — `2.0` (id 9, decoded w `2.0`): attribution lives
  INSIDE the example group:
  `.dt > .uns > .un > .unText > .vis > .vi > .ex-sent-group > .ex-sent.aq`
  containing `.aq > .auth + .source + .aqdate` (`— Amina Khan`, `Los Angeles
  Times`, `27 Feb. 2014`). Same shape in `-'d` (id 18, `— Leslie Charteris`).
  This matches the renderer's `nextExampleAttribution` sibling lookup inside
  the group, so the in-group shape is already handled.
- Sub-definition nesting — `A post` (id 92), `a priori` (id 95), `abaft`
  (id 170), `abatement` (id 197), `abiotic` (id 380), `ablative` (id 412),
  and `turn` itself (id 450356): attribution sits OUTSIDE the example group,
  as a trailing sibling of `.ex-sent-group` directly inside `.sdsense`
  (`.sense > .sdsense > [.ex-sent-group, .ex-sent.aq]`). In a 400-row scan,
  163/163 sampled `.sdsense` attributions were this sibling-of-group shape
  (`aqInGroup: 0`, `aqSiblingOfGroup: 163`).

Renderer feasibility (grep only, no edits): the in-group shape works today
via `nextExampleAttribution` (sibling lookup within the group). The
`.sdsense` sibling-of-group shape would render the `.ex-sent.aq` through the
generic inline path, preserving the visible text but NOT attaching it to the
example or collapsing it with the group. Feasible with a small extension:
treat a trailing `.ex-sent.aq` sibling of `.ex-sent-group` as that group's
attribution (same unit data as the in-group lookup). This is a feasibility
note, not a blocker — the visual contract is decided.

### 2. Related inline items — `.related-to` inline flow

**Decision: accept current renderer behavior.** `synonym-term-group`,
`synonym-term`, and `synonym-introduction` render as inline flow (spans and
text nodes), not forced blocks, inside the collapsed related-item disclosure
(`related-item`, `open: false`). The term group reads as a comma-separated
inline list, the introduction prose continues inline, and each
`synonym-entry` keeps its term head + prose in one inline display flow, per
the survey rule "The head and prose stay in one inline display flow".

Evidence — `turn` (id 450356), `p.syn` children in source order:
`<strong>Synonym Discussion</strong>` (title, dropped from body), then
`.mw_t_sc` terms `revolve, rotate, gyrate, circle, spin, twirl, whirl, wheel,
eddy, swirl, pirouette` separated by comma text nodes, a trailing `:`, then
`.mw_t_sc turn` + introduction prose, then per-term entries
(`revolve may suggest …` + inline `.ex-sent t has-aq sents-inline` +
sibling `.ex-sent.aq` attributions). 56 `.ex-sent` and 27 `.ex-sent.aq`
inside the discussion; 1 `.see-in-addition` (`synonyms see in addition
depend`).

Renderer feasibility: `renderSynonymTerm` emits `span` with
`unitData("synonym-term")`; `renderSynonymGroup` wraps the group in a `div`
(`synonym-term-group`) containing those inline spans and separator text;
`renderSynonymIntroduction` and `renderSynonymEntry` emit `div` wrappers with
inline `span` content; `renderRelated` wraps everything in `details`/`summary`
with `unitData("related-item")` and `open: false`. Inline flow confirmed
already present in `src/conversion/renderStructuredContent.ts` — no change
needed.

### 3. Called-also reference numbers

**Decision: reject as a distinct unit; use the existing `called-also` +
`superscript-reference` units.** No "called-also reference number" pattern
exists in the source. In a full scan of all 16,400 rows containing
`class="ca"`, exactly 2 rows have any `<sup>` inside a `.ca` element:
`collegiate_z particle` (id 147979) and `Z particle` (id 469605), both
rendering `called also Z<sup>0</sup>, Z<sup>0</sup> particle`. The superscript
`0` there is part of the particle name `Z⁰`, not a reference number. Of 216
sampled `.ca` elements, the child shapes are `span,span` (mdash + intro) in
207 cases and variants with `a.cat` links in the rest; `set` (its row) has 1
`.ca` with no sup. A 400-row scan of `class="cat"` + `<sup>` found 0
superscripts inside called-also target links.

Renderer feasibility: `.ca` is already rendered as an inline `span` with
`unitData("called-also", { level: 6 })` in both the inline and loose paths;
`<sup>` is rendered as `superscript-reference`. The rare `Z⁰` spelling would
therefore render with the superscript preserved — correct as term spelling,
no reference-number handling needed.

### 4. Level 6 `.see-in-addition` presentation

**Decision: accept the existing `see-in-addition` unit treatment for Level 6
as well.** The line renders as a compact, non-interactive pointer line
(`div` with `unitData("see-in-addition")`), preserving the visible text
(`usages see in addition …`) and discarding the `bword://` navigation
targets, identical to the Level 1 synonym-discussion placement. Superscript
homograph prefixes in target text (e.g. `1account`) stay as
`superscript-reference` spans. No separate visual treatment for the Level 6
owner.

Evidence — owner paths differ but the unit and its text are the same:

- `#usage-notes` accordion (Level 6): `because` (id 21398,
  `usages see in addition 1account`, target `bword://account%5B1%5D` with
  `<sup>1</sup>`), `finalize` (id 184028, `-ize`), `one` (id 290476,
  `1you`), `they` (id 441972, `anybody, everybody, he, nobody, somebody`).
  All sit at
  `div#usage-notes.section.custom-accordion > .section-content.usage-notes >
  .sub-well > p.see-in-addition`, inside `[data-id="definition"]`'s
  `def-accordion-sections` (inVg: false, inDefSection: true).
- Definition-local `.usage` (Level 6): `he` (id 202718,
  `usages see in addition anybody, everybody, nobody, they`) at
  `.vg > .sb.has-num > .sense.has-num-only > .dt > .uns > .usages > .usage >
  p.see-in-addition` (inVg: true, inAccordion: false). The `.usage` block is
  a "Usage Discussion of he" sibling of the `.un` usage note inside `.uns`.

Renderer feasibility (grep only, no edits): the `see-in-addition` handler
already exists in both paths (`renderInlineNode` and `renderLooseNode` emit
`div` + `unitData("see-in-addition")`), and `renderSynonymDiscussion` already
renders the Level 1 placement. However, the two Level 6 placements are NOT
currently reachable:

- For `because`/`finalize`/`one`/`they`: `renderDefinitionSection` renders
  only the `.vg` groups when groups exist (1–2 per row here); the
  `def-accordion-sections` sibling containing `#usage-notes` is not traversed
  (only `renderOrigin` reaches into accordion sections, via its own
  `[data-id="origin"]` lookup). `one` additionally has 5
  `[data-id="definition"]` sections, and its `#usage-notes` is inside a later
  section than the first `.first()` lookup.
- For `he`: `renderUsageNotes` collects `.un` children and standalone
  `vi|vis|ex-sent-group` children, but the `.usages > .usage` sibling block
  is not collected, so the whole Usage Discussion (including its
  `.see-in-addition`) would be dropped.

So the presentation decision is settled, but wiring these two Level 6 paths
into the renderer is required before the line appears in output; the unit
handler itself needs no change. Flagged for the renderer follow-up, not a
survey blocker.

### 5. `.sgram` scoped-inline confirmation (restated with evidence)

**Decision: confirmed.** `.sgram` grammar labels remain scoped inline content
(`span` + `unitData("grammar-label")`); tag-bank promotion stays deferred
research and does not block the parser.

Evidence — `hand` (id 201297) has 5 `.sgram` spans, all immediately before a
local sense/subsense definition: `transitive` (with a
`bword:///dictionary/transitive` link) and `transitive + intransitive` at
`.vg > .sb.has-num[.has-let] > .sen.has-num-only` /
`.sense.has-num-only`. Survey inventory: `.sgram` in 216 rows, values
`transitive`, `intransitive`, `transitive + intransitive` (with/without
source trailing commas), and `T /I`.

Renderer feasibility: `hasClass(root, element, "sgram")` → inline `span`
with `unitData("grammar-label")` — already implemented; the label stays
beside its sense definition, no block wrapper, no tag-bank promotion.

### Verdicts

- Item 1 (nested citations): **accept** — `example-source` attachment inside
  the existing collapse pattern; in-group shape works, `.sdsense`
  sibling-of-group shape needs a small renderer extension (feasibility note).
- Item 2 (related inline items): **accept current behavior** — inline flow
  already implemented; no change.
- Item 3 (called-also reference numbers): **reject as a distinct unit** —
  no source pattern beyond `Z⁰` term spelling; existing `called-also` +
  `superscript-reference` units cover it.
- Item 4 (Level 6 `.see-in-addition`): **accept the unit treatment** for the
  Level 6 owner; renderer traversal for the two Level 6 placements is an open
  implementation follow-up, not a presentation decision.
- Item 5 (`.sgram`): **confirmed** scoped inline for the first slice.

### Open questions needing a human decision

None — all five items are decided. The only open work is the renderer
traversal for the Level 6 `.see-in-addition` placements and the `.sdsense`
sibling attribution, which is implementation work, not a presentation
decision.

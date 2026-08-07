## review 
done
# 02 — Audit every superscript shape and its owner

**What to build:** A verified inventory of every superscript shape in the
source — where each one belongs and how it should render — so the renderer
keeps four visually similar but semantically distinct kinds of number apart.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Source:** TODO.md, "Research before the richer Level 1-6 parser".

- [x] Four shapes kept distinct: headword homograph numbers, sense
      references, cross-reference numbers, and called-also reference numbers
- [x] Ownership verified for each shape (which node it belongs to)
- [x] Render treatment decided and verified per shape

## Findings (2026-08-07)

Evidence base: read-only queries against
`packages/merriam_webster_unabridged/assets/MWU.db` (`word(id, w, m)`, ids
1..470444). Sample: 77 rows containing `<sup>` spread across 12 id buckets
(154 sups parsed with cheerio), plus targeted scans for `.mw_t_sx`,
`.mw_t_mat`, `.mw_t_et_link`, `.mw_t_dxt`, `.cxl-ref`/`.cxt`, `.text-lowercase`,
`.sn`/`.letter`/`.sub-num`/`.num`, `.prs`/`.pr`, `.va`, `.ure`, `.if`, and
called-also classes. All `word.w` values decoded with `decodeURIComponent`
before comparison.

### Shape inventory

| Shape | Source markup | Owner (verified) | Representative evidence | Render treatment | Renderer status |
| --- | --- | --- | --- | --- | --- |
| (a) headword homograph number | `<sup>N</sup>` inside `.hword` (directly or via a `span.breakpoints` child) | `.hword` — Level 1 identity metadata (`homograph-number` unit) | id 20 `'ll` sups 1,2; id 25 `-'s` sups 1–6; id 39205 `cayenne` sups 1,2; id 39210 `Caymanian` sup 1 inside `span.breakpoints > h1.hword` | Header display metadata: extract as `homograph-number`, remove from searchable term and display headword (`<sup>1</sup> brief` → `brief`) | TREATED — renderStructuredContent.ts:2466-2469 extracts first `.hword` sup; 2470-2482 strips `sup` from display headword; styles.css:5-8 `vertical-align: super` |
| (b) sense reference | NOT a `<sup>`: `<span class="text-lowercase">1a</span>` as the next sibling AFTER a cross-reference anchor | Nearest cross-reference anchor (preceding sibling) — the catalog `superscript-reference` unit, usually Level 6 | 467/467 sampled `.text-lowercase` spans follow a ref anchor (400 rows); 709 spans in 600 rows: 440 digit-only (`3`, `7`), 202 digit+letter (`1a`, `2b`), 67 other (`1a(1)`, `2b(3)`, `intransitive sense 1`); id 596: `…class="mw_t_sx"> <sup>1</sup><span class="text-uppercase">crow</span></a>` + `<span class="text-lowercase">8</span>` | Keep as a reference pointer to the target's sense; visually lowered/small, never a new sense number | NOT TREATED — no `text-lowercase` handling in renderer; renders as plain inline span, text preserved but unit label and lowered presentation lost |
| (c) cross-reference number | `<sup>N</sup>` inside a reference anchor: `a.mw_t_sx`, `a.mw_t_mat`, `a.mw_t_et_link`, `a.mw_t_dxt`, `a.cxt` in `p.cxl-ref` — homograph prefix of the LINK TARGET, before the target text (`span.text-uppercase`) | The anchor: `cross-reference` (Level 6) or Level 1 origin reference; `comparison-reference` (`.mw_t_dxt`); `variant-reference` (`.cxl-ref`/`.cxt`) | 34/154 sample sups: id 18 `-'d` `1would`/`1-ed` (mw_t_sx); id 63 `a` `1an` (mw_t_dxt); id 103 `A&P` `1at` (mw_t_mat); id 39230 `CBer` `2-er` (mw_t_et_link); id 26 `'se` `6's` (a.cxt in p.cxl-ref); id 352867 `starquake` `1star`/`2quake` (mw_t_et_link) | Keep visually superscripted inside the reference; never a new sense number | PARTIALLY TREATED — anchors get relation labels (`mw_t_mat`→origin, `mw_t_sx`→see, `mw_t_dxt`→compare, `cxt`→variant; renderStructuredContent.ts:637-653) and the sup renders via the generic sup branch → `superscript-reference` unit (styles.css:81-84). `a.mw_t_et_link` is NOT in the relation map → generic `cross-reference`, no relation |
| (d) called-also reference number | DOES NOT EXIST in the source | n/a | `class="cat"><sup` = 0, `class="cat"><` = 0, `class="ucat"><sup` = 0, `class="ca"><sup` = 0 across all rows; parsing all 2,669 rows containing both `class="cat"` and `<sup>` → 0 sups inside a cat anchor; `/^\d+[a-z]/` homograph-prefix text in `.cat` anchors = 0 in 8,000 rows | Nothing to render; called-also targets carry any leading digits as plain chemical names (`2,4-dichlorophenoxyacetic acid`, `4-aminodiphenyl`) | n/a |
| (e) pronunciation-content superscript | literal `<sup>` inside `.prs`/`.pr` reading content | `pronunciation` unit; literal reading text, not a reference | id 19 `'em` `<sup>21</sup>` inside `.prs`; id 32 `'z` `<sup>4</sup>` inside `.pr` in `like 4's` | Preserve as inline superscript within the pronunciation | TREATED generically (sup branch → `superscript-reference`) |
| (f) chemical-formula superscript | literal `<sup>` for charge/ion notation in example or definition prose | `example-sentence` / `definition` text | id 441962 `thetin` `(CH3)2S+CH2COO−` (sups `+`, `−` in example); id 441981 `thiamine` `[C12H17N4OS]+` in definition; id 103 `A&P` `Ca2+` in example | Preserve as inline superscript | TREATED generically (sup branch → `superscript-reference`) |

Counts in the 77-row sample: (a) 117/154 (76%), (c) 34/154 (22%), (e) 1,
(f) 4 across 3 rows; zero (b)-as-sup and zero (d). 52,982 rows contain
`<sup>` (survey note confirmed).

### Ownership verification

- (a) The sup is a child of `.hword` (possibly through `.breakpoints`), so it
  belongs to the local headword/`<mean>` identity. It never co-occurs with a
  sense marker in the same element.
- (b) 100% of sampled `.text-lowercase` spans have a cross-reference anchor as
  their immediately preceding sibling (`mw_t_sx`, `mw_t_dxt`, …), so the span
  is bound to that reference, not to a sense. The value is the target's sense
  pointer (`1a`, `8`, `1a(1)`).
- (c) The sup is inside the anchor and is the homograph prefix of the anchor's
  `bword://TARGET[N]` target (e.g. `bword://crow[1]` renders `<sup>1</sup>crow`).
  Both shapes can co-occur on one reference: 132/300 sampled rows have a sup
  inside the anchor AND a `.text-lowercase` sense pointer after it.
- (d) No sup (or homograph-prefix text) ever appears in called-also anchors.
- Sense markers themselves never use `<sup>`: `.sn` is
  `<span class="sn sense-1 a"><span class="num">1</span><span class="letter">a</span></span>`
  (row id 63), plain spans, no sup.

### Renderer check (grep only, no edits)

`src/conversion/renderStructuredContent.ts` handling of `sup`:

1. `.hword` sup → `homograph-number` header unit, stripped from display
   headword (lines 2466-2482, 2507-2515).
2. Any other `sup` → `span` with `unitData("superscript-reference")`
   (lines 665-674); `sup` is in `knownTags` (line 81), so no
   unsupported-subtree findings.
3. Reference anchors → `cross-reference` unit with relation (lines 637-653):
   `mw_t_mat` → origin, `mw_t_sx` → see, `mw_t_sc` → related, `mw_t_dxt` →
   compare, `cxt` → variant; everything else generic `cross-reference`.
4. `.text-lowercase` → no branch at all; renders as plain inline content.

Shapes not yet treated by the renderer: (b) `.text-lowercase` sense pointers
get no unit and lose their lowered presentation; `a.mw_t_et_link` has no
relation label.

### Verdicts

- Accept (a) as hypothesized: headword homograph number, header metadata,
  removed from searchable term. Already implemented.
- Accept (b) with correction: the "sense reference" is real but is NOT a
  `<sup>`; it is a `.text-lowercase` span after a cross-reference anchor.
  Decide: fold into the existing `superscript-reference` unit (catalog class
  `.text-lowercase` already names it) and give it a render branch so the
  lowered presentation survives; never treat it as a new sense number.
- Accept (c) as hypothesized: sup inside reference anchors = homograph prefix
  of the target. Keep the generic superscript rendering. Decide: add
  `mw_t_et_link` to the anchor relation map (an etymology link is a Level 1
  origin cross-reference, same as `mw_t_mat`).
- Reject (d): called-also reference numbers do not exist in the source; no
  renderer work required.
- Note (e) and (f) as bonus shapes the generic `superscript-reference` branch
  already covers.

### Open questions needing a human decision

1. Should `.text-lowercase` receive its own unit label (e.g.
   `sense-reference`) distinct from the in-anchor `sup` shape, or stay folded
   into `superscript-reference` per the catalog? The two are visually
   different (lowered span vs raised sup) and semantically different (target
   sense pointer vs target homograph prefix).
2. Should `a.mw_t_et_link` reuse the `origin` relation or get a dedicated
   relation label?
3. `'em` (id 19) has a literal `<sup>21</sup>` inside `.prs` — worth
   confirming against print what the raised "21" denotes before deciding
   whether it needs a dedicated unit beyond generic superscript rendering.

## How to find these examples

Same DB/table as ticket 01 (`word(id, w, m)`, `w` percent-encoded, `m` = HTML; needles are literal `instr(m, …)` substrings).

| Shape | Needle | Word (id) | What to look at |
| --- | --- | --- | --- |
| (a) headword homograph | `<h1 class="hword">` then first `<sup>` | cayenne (39205) | `<h1 class="hword"> <sup>1</sup> cay·enne</h1>` — the sup is a direct child; a cappella (71) shows the same sup nested inside `span.breakpoints` |
| (b) sense reference | `class="text-lowercase"` | Absaroka (596) | `<span class="text-uppercase">crow</span></a> <span class="text-lowercase">8</span>` — a lowered span whose immediately PRECEDING sibling is a cross-reference anchor (`a.mw_t_sx`), i.e. "sense 8 of crow" |
| (c) cross-reference number | `class="mw_t_et_link"` | starquake (352867) | `<a href="bword://star[1]" class="mw_t_et_link"><sup>1</sup>star</a>` — the sup is the homograph prefix of the link TARGET; 4-aminobiphenyl (45) shows the same for `amino-` + `biphenyl` |
| (d) called-also number | `class="cat"><sup` | none | 0 rows (also 0 for `class="ucat"><sup`, `class="ca"><sup`) — this shape does not exist |
| (e) pronunciation-content sup | `<sup>21</sup>` | 'em (19) | `ˈsāb<sup>21</sup>m` inside `span.prs` — literal reading text, not a reference |
| (f) chemical-formula sup | `<sup>+</sup>` | thetin (441962) | `(CH<sub>3</sub>)<sub>2</sub>S<sup>+</sup>CH<sub>2</sub>COO<sup>−</sup>` inside an example |

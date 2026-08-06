# 01 — Classify remaining unknown HTML classes

**What to build:** Every remaining unclassified MWU source class understood —
what it means, which Level 1-6 semantic owner it binds to, and whether the
parser should treat it as content, a wrapper, or ignore it. This is the
prerequisite for any parser mapping of these shapes.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Source:** TODO.md, "Research before the richer Level 1-6 parser".

- [x] All 15 classes classified: `.caption`, `.date`, `.disc`,
      `.illustrations`, `.iw`, `.l`, `.mw_t_a_link`, `.mw_t_bold`,
      `.mw_t_i_link`, `.pn`, `.sense-(a)`, `.sense-(b)`, `.table-image`,
      `.table-section`, `.visible-phone`
- [x] Representative source words and DOM owner paths recorded for each class
- [x] Information meaning and nearest Level 1-6 semantic owner determined per
      class
- [x] Each shape classified as one of: semantic unit, transparent wrapper,
      intentionally ignored content, or atomic unrecognized fallback
- [ ] Shared information-unit catalog updated before any parser behavior is
      implemented for a newly understood shape

## Findings (2026-08-07)

Method: read-only scans of `word(id, w, m)` via `instr(m, '<needle>') > 0`
counts, samples taken with `ORDER BY id`, parsed with cheerio (class token
selection `[class~=...]`; bare `.x` selector is correct in cheerio — the
earlier zero hits were a tag-vs-class selector bug in the scratch script,
not missing elements). Percent-encoded `word.w` decoded with
`decodeURIComponent` before comparison. All counts are exact-token class
counts after resolving substring noise (see per-class notes).

### Per-class classification

| Class | Rows | Meaning | Representative words (id) | Owner path | Classification | Catalog unit / candidate |
| --- | --- | --- | --- | --- | --- | --- |
| `.caption` | 3,982 | Illustration subject label; may carry sense refs and markup (`compass 4a`; `abscissa` caption has `<em class="mw_t_it">AP</em>` + prose) | aardvark (125), cornice (153012), ziggurat (469903), zither (470048) | `p.caption > div.sub-well > div.section-content > div.section.custom-accordion.illustrations` | semantic unit | candidate new: `illustration-caption` (child of illustration section) |
| `.date` | 2 | Phrase date (year) attached to a defined phrase in `.dro` (`1850`, `1681`) | American way (7677), Little Bear (230263) | `span.date > div.dro` | semantic unit | candidate new: `phrase-date` (phrase analog of `first-known-use`; distinct from `.aqdate` = example-date) |
| `.disc` | 0 | No such class | none | n/a | not present — 49,214 raw `disc` substring matches are prose/href noise (`discussion`, `discover`, `compact disc`) | no mapping |
| `.illustrations` | 3,984 | Artwork/illustration section containing one definition image + caption | aardvark (125), cornice (153012), ziggurat (469903), zither (470048) | `div.section.custom-accordion.illustrations > div.def-accordion-sections` | semantic unit | candidate new: `illustration` (media container) |
| `.iw` | 158 | In-word sense pointer (`see sense 3`, `see numbered senses`); visible text is literally encoded as class tokens (`class="iw see sense 3"`) | addendum (2540), anecdote (9006), license (228568), yolk (469390) | `span.iw.see.sense.N > span.vg-ins > div.col > div.row.headword-row` | semantic unit | catalog: `cross-reference` (Level 1, attached to the inflection-group) |
| `.l` | 3,255 | Pronunciation qualifier prose (`also`, `or`, `chiefly Midland also`, `for 1 also`); always under `.pr` in the 12-row sample | Alhambra (5790), Alleghenian (6127), Washingtonian (462169), Wyandotte (468183) | `span.l > span.pr > span.prs` | semantic unit | catalog: `pronunciation-note` (existing unit; `.l` is its source class) |
| `.mw_t_a_link` | 77,309 | Anchor-style cross-reference link inside definition text (`href="bword://Alabama"`) | alabaster (5222), Australasian (16213), collegiate_mindful (103344), york (469422), Zambesi (469641) | `a.mw_t_a_link > span.dt > div.sense.*` | transparent wrapper | catalog: `cross-reference` (Level 6; discard bword:// target, keep text) |
| `.mw_t_bold` | 61 | Bold presentation wrapper: phrase form at the start of an example (`run aground`) or bold text inside a definition (`I`, `II`, `III`, `QZR`) | aground (4580), altar (6847), collegiate_edward (76085), out-of-bounds (293243), upper case (456550) | `strong.mw_t_bold > span.ex-sent` or `> span.dt` | transparent wrapper (presentation) | no new unit; preserve bold styling only |
| `.mw_t_i_link` | 471 | Italic-style cross-reference link inside definition text (`href="bword://Acrasis"`) | Acrasiales (1946), agarwood (4138), collegiate_ou sont les neiges d'antan (110077), yacca (468587), yeast infection (468843) | `a.mw_t_i_link > span.dt` | transparent wrapper | catalog: `cross-reference` (Level 6) |
| `.pn` | 59 | Parenthesized list-number in called-also `respectively` lists (`(1)`, `(2)`, `(3)` between `.ucat` terms); the other 166 `class="pn`-prefix rows are the unrelated `.pname` (proper-name) class | alligation (6220), asclepiad (14336), avanturine (16841), trochanter (448825), vermouth (459040) | `span.pn > p.ca > span.dt` | semantic unit (marker) | candidate new: `called-also-number` (bound to called-also at Level 6) |
| `.sense-(a)` | 1 | Legacy subsense-letter marker variant (letter `a`) duplicating the `.letter` child text | indirect (213897) | `span.sn.sense-(a) > div.sense.has-sn > div.pseq.no-subnum > span.sb-3 > div.sb.has-subnum.letter-only` | transparent wrapper (class-name variant) | catalog: `subsense-letter` (Level 4) |
| `.sense-(b)` | 1 | Same, letter `b`, same single row | indirect (213897) | `span.sn.sense-(b) > div.sense.has-sn > div.pseq.no-subnum > span.sb-3 > div.sb.has-subnum.letter-only` | transparent wrapper (class-name variant) | catalog: `subsense-letter` (Level 4) |
| `.table-image` | 52 | Whole row is a table rendered as a full-page image (`mean show="0"`, single `<img src="table_unabridged_weight.jpg">`) | table_collegiate_alphabet (361661), table_collegiate_truth table (361687), table_unabridged_weight (361725), table_unabridged_zodiac (361726) | `p.table-image > div.well.content-body > div.page-content > mean(show="0")` | semantic unit (media) | candidate new: `table-image` (media page reached via `.table-section` links) |
| `.table-section` | 65 | Related section pointing to a table page (`<a href="bword:///table/unabridged/alphabet.htm"> Alphabet Table </a>`), directly after the definition body | alphabet (6705), alphabets (6723), collegiate_radio frequency (119604), weights (463605), zodiac (470081) | `div.table-section > div.section` | semantic unit (pointer) | candidate new: `table-reference` (Level 1 related-item pointer to media) |
| `.visible-phone` | 64,901 | Responsive display class on accordion `[+]` toggle icons; 100% of occurrences are `class="toggle-icon visible-phone"` | abysm (828), adage (2452), collegiate_leap second (97794), written (468090), wrote (468121) | `span.toggle-icon.visible-phone > h2.toggle` | intentionally ignored (layout/presentation) | no catalog unit |

### Count-noise notes (for future scans)

- `.l` raw `class="l` count is 470,121 because of prefix collisions (`label`,
  `lb`, `letter`, `lbs`, `last-slash`, …); exact token `class="l"` = 3,255.
- `.date` raw `date` = 32,354, of which `.aqdate` = 14,073 and ` date"` =
  1,802 are all prose/link-text (`blind date`, `desert date`, “up to date”);
  exact `class="date` = 2.
- `.pn` `class="pn` = 225 splits into `.pn` (59) and `.pname` (166, proper
  names in biographical entries, e.g. collegiate_adams id 49512).
- `.sense-(a)`/`.sense-(b)` never appear as a first token (`class="sense-(a)`
  = 0); the single occurrence in each case is the second token of
  `class="sn sense-(a)"`.

### Verdicts

- **Accept as new candidate units** (names follow catalog style — lowercase,
  hyphenated): `illustration-caption`, `illustration`, `phrase-date`,
  `called-also-number`, `table-image`, `table-reference`.
- **Map to existing catalog units**: `.l` → `pronunciation-note`;
  `.mw_t_a_link`, `.mw_t_i_link`, `.iw` → `cross-reference`;
  `.sense-(a)`/`.sense-(b)` → `subsense-letter`.
- **No mapping**: `.disc` (does not exist as a class); `.mw_t_bold` and
  `.visible-phone` (presentation only).

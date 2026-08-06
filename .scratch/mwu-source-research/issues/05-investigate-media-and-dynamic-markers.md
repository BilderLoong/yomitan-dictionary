# 05 — Investigate media, tables, dates, and dynamic markers

**What to build:** A classified understanding of the remaining uncommon
shapes — definition images, tables, phrase dates, dynamic sense-marker
classes, and unfamiliar link/style classes — grounded in representative
source words, before any semantic parser mapping is added for them.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Source:** TODO.md, "Research before the richer Level 1-6 parser".

- [x] Representative source words collected for definition images, tables,
      phrase dates, dynamic sense-marker classes, and unfamiliar link/style
      classes
- [x] Each shape classified as semantic unit, transparent wrapper,
      intentionally ignored content, or atomic unrecognized fallback
- [ ] Classifications recorded in the living survey before parser mappings
      are added

## Findings (2026-08-07)

Method: read-only `instr(m, ...)` scans of `word(id, w, m)` with
`ORDER BY id` samples parsed via cheerio; `word.w` decoded with
`decodeURIComponent`. Per-class detail (owner paths, representative words,
classification) lives in ticket 01's Findings; this ticket records the
media/tables/dates/marker inventory.

### Definition images

- `<img` occurs in 14,108 rows total. 10,105 rows pair it with
  `entry-status` (cataloged `entry-status-image`, Ignore=true).
- 4,003 rows have an `<img>` outside `.entry-status`, and **every one of
  them** is either an `.illustrations` section (3,951 rows) or a
  `.table-image` page (52 rows). There are no other non-status image
  contexts in the DB.
- `.illustrations` sections: `<div id="art" class="section
  custom-accordion illustrations" data-id="artwork">` with an
  `h2.toggle` title `Illustration of X` and `.section-content >
  .sub-well > <img alt="">` + `p.caption`. Two image families: `art_mwu_*.gif`
  (1,254 rows, Unabridged artwork) and `art_dict_*.gif` (the remaining
  ~2,697 illustration rows, observed at ids 48681–48915). Captions can
  carry sense references (`compass 4a`) and inline markup (`abscissa`).
  Representative: aardvark (125), cornice (153012), zither (470048).
- `.table-image` rows (52) are dedicated table pages: `w` = `table_*.htm`,
  `<mean show="0">`, single `<img src="table_collegiate_alphabet.jpg">` /
  `table_unabridged_weight.jpg` / `table_unabridged_zodiac.jpg`.
  Representative: table_collegiate_alphabet (361661), table_unabridged_weight
  (361725), table_unabridged_zodiac (361726).

### Tables

- **There are no HTML `<table>` elements anywhere in the DB** (`instr(m,
  '<table')` = 0 rows).
- Tables exist only as image pages (`.table-image` rows above) reached via
  `.table-section` pointer sections (65 rows): `<div class="table-section"
  data-id="table"><a href="bword:///table/unabridged/alphabet.htm">
  Alphabet Table </a></div>`, directly after the definition body.
  Representative: alphabet (6705), weights (463605), zodiac (470081).

### Dates

- `.aqdate` (14,073 rows) = example-attribution dates, already cataloged as
  `example-date` (`5 Dec. 1999` id 6; `27 Feb. 2014` id 9; `20 Feb. 2013`
  id 40).
- `.date` (exactly 2 rows) = **phrase date**, a bare year inside `.dro`
  immediately before the `.drp` phrase: `1850` for `the American way`
  (id 7677), `1681` for `the Little Bear` (id 230263). Distinct from
  `.aqdate` and from entry-level `first-known-use`. Candidate unit:
  `phrase-date`.

### Dynamic sense-marker classes `.sense-(a)` / `.sense-(b)`

- Occur in exactly one row: `indirect` (id 213897).
- They are **subsense-letter markers** (Level 4), not definition numbers.
  `<span class="sn sense-(a)"><span class="letter">a</span></span>`; the
  `.letter` child carries the visible text and the class token duplicates it.
- The same row contains the full legacy `sense-*` family on `.sn` spans:
  `sense-a (1)`, `sense-(2)`, `sense-(3)`, `sense-b`, `sense-c`,
  `sense-d (1)`, `sense-(a)`, `sense-(b)`, `sense-e`, `sense-f` — class
  tokens mirror the printed marker text (letters and parenthesized numbers).
- Relationship to `.sb.has-subnum` / `.sub-num`: the row's sense containers
  use `.sb.has-subnum.letter-only` (6 `has-subnum`, 0 `has-let`). `.sub-num`
  (5 occurrences) carries the parenthesized **definition-number** markers
  `(1)(2)(3)` (Level 5); `.letter` (8) carries the subsense letters. The two
  `.sense-(a)`/`.sense-(b)` spans sit under `span.sb-3` — the lettered `a`/`b`
  subsenses of the `d` group — while sibling groups use the unpadded variants
  `sense-b`, `sense-c`, `sense-e`, `sense-f`. Functionally identical to a
  normal `.sn` + `.letter` subsense marker; a one-off legacy naming variant.

### Unfamiliar link/style classes

- `.mw_t_a_link` (77,309 rows): plain cross-reference anchor in `.dt`,
  `href="bword://..."` — transparent wrapper over `cross-reference` (Level 6).
- `.mw_t_i_link` (471 rows): italic-styled cross-reference anchor in `.dt` —
  transparent wrapper over `cross-reference` (Level 6).
- `.mw_t_bold` (61 rows): bold wrapper (phrase forms heading examples, or
  bold definition text) — presentation only.
- `.l` (3,255 rows): pronunciation qualifier prose under `.pr` —
  `pronunciation-note`.
- `.iw` (158 rows): in-word `see sense N` pointer on the inflection group —
  `cross-reference` (Level 1); text encoded in the class tokens.
- `.pn` (59 rows): parenthesized number in called-also lists (`p.ca`) —
  candidate `called-also-number`.

### Verdicts

- Definition images are real but narrow: exactly two containers
  (`.illustrations` artwork, `.table-image` pages), both outside
  `entry-status`; recommend cataloging both as media units (candidates
  `illustration`, `table-image`) and deferring table rendering (no HTML
  tables exist).
- `.date` is a genuine phrase-date unit (candidate `phrase-date`) and must
  not be confused with `.aqdate`.
- `.sense-(a)`/`.sense-(b)` need no parser special-casing: they are legacy
  tokens of the existing `subsense-letter` unit.

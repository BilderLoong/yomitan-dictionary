# MWU Entry Conversion

## Purpose

Convert planned MWU canonical owners into deterministic, MWU-shaped Yomitan structured content with named information units, while keeping soft links definition-free.

## Requirements

### Requirement: Convert only planned canonical owners

The converter SHALL accept a `main-canonical-entry`,
`alternative-spelling-canonical-entry`, or `drp-phrase-canonical-entry` plan
from Level 1 generation. It SHALL NOT discover additional canonical ownership,
promote unrelated source content, or convert a `soft-link-entry` plan as if it
owned a definition.

#### Scenario: Planned main or alternative-spelling canonical entry

- **WHEN** one independent `<mean>` has a `main-canonical-entry` or
  `alternative-spelling-canonical-entry` plan
- **THEN** conversion reads definition content owned by that `<mean>` and
  retains the plan's canonical spelling and source identity

#### Scenario: Planned DRP phrase canonical entry

- **WHEN** one definition-bearing `.drp` has a
  `drp-phrase-canonical-entry` plan
- **THEN** conversion reads only that phrase's definition-bearing subtree and
  does not absorb adjacent phrases or parent definitions

#### Scenario: Soft-link entry

- **WHEN** the input is a `soft-link-entry` plan
- **THEN** the canonical converter is not invoked for that plan and no copied
  definition is created

### Requirement: Render one mwu-entry root in source order

Every canonical record's content root SHALL be an `mwu-entry` `div` (`content
= mwu-entry`, `level = 1`, `unit = lexical-entry`) containing, in source
order: the header; the definition body with verb-subtype labels and the
nested sense list; defined phrase sections as collapsed `details`; the origin
section as a collapsed `details`; the related-to section as a collapsed
`details`; and any remaining visible source content rendered loosely.
Styling SHALL be delivered by the dictionary stylesheet (`styles.css`,
selectors on `data-sc-content`); the renderer SHALL emit no inline styles.

#### Scenario: Canonical owner root

- **WHEN** a `main-canonical-entry` owner is converted
- **THEN** its content root is one `mwu-entry` div with header, sense tree,
  and section disclosures in source order

#### Scenario: Phrase owner renders flat

- **WHEN** the converted owner is a `drp-phrase-canonical-entry`
- **THEN** the phrase body renders flat as `definition-flow` instead of being
  wrapped in `details`

#### Scenario: Fixture origin placement divergence

- **WHEN** the hand-authored fixture places the origin details inside the
  header
- **THEN** production output keeps source order instead — origin appears at
  the bottom of the entry — and this deliberate divergence is not a
  conversion failure

### Requirement: Map source classes to named structured-content units

The converter SHALL recognize the following source classes and emit the named
units, with levels following the six-level source model. Internal navigation
targets (`bword://`, `gdlookup://`, `sound://`) SHALL NOT survive; visible
link text SHALL be kept. Unknown tags (`em`, `strong`, `sup`, `p`) SHALL map
to supported styled nodes or be treated as transparent, because Yomitan's
structured-content generator drops unknown tags.

| Source evidence | Unit | Tag |
| --- | --- | --- |
| `.hword > sup` | `homograph-number` | `span` |
| `.hword` when display differs from searchable term | `headword-display`, `syllabification-marker` | `div`/`span` |
| `.lbs` / `.lb` | `entry-qualifier` | `span` |
| `.prs` / `.pr` | `pronunciation` | `span` |
| `.vg-ins`, `.il`, `.if`, `.ix` | `inflection-group`, `inflection-label`, `inflection-marker` | `div`/`span` |
| `.prt-a`, `.mw` | `form-pronunciation` | `span` |
| `.vr`, `.vl`, `.va` | `alternate-form`, `variant-qualifier` | `div` or `span` |
| `.vd` | `verb-subtype` | `div` |
| `.sgram` | `grammar-label` | `span` |
| `.sl` / `.sls > .sl` / `.lb` | `tag` (local structured content only, never global tag-bank metadata) | `span` |
| `.sn` with `.num`/`.letter`/`.sub-num` | `sense-number`, `subsense-letter`, `definition-number` | `ol`/`li` |
| `.dt` | `definition` | `span` or `div` |
| `.uns` / `.un` / `.mdash` / `.unText` | `usage-note` | `div` |
| text part of `.un` (`.mdash` / `.unText` content) | `usage-note-text` | `span` |
| `.vis` / `.vi` / `.ex-sent-group` / `.ex-sent` | `example-sentence`, `extra-examples` | `div`/`details` |
| `.mw_t_wi` | `target-highlight` | `span` |
| `.aq` / `.auth` / `.aqdate` | `example-source` | `div` |
| `.source` / `.auth` not under `.aq` | `example-source-inline` | `span` |
| `.dx-jump` / `.mw_t_dxt` | `comparison-reference` + `cross-reference` (relation `compare`) | `div`/`span` |
| `.cxl-ref` / `.cxl` / `.cxt` | `relation-reference` (exact relation phrase) + `cross-reference` (no relation) | `span` |
| `.mw_t_mat`, `.mw_t_sx`, `.mw_t_sc` | `cross-reference` (relations `origin`, `see`, `related`) | `span` |
| `.ca`, `.intro`, `.cat`, `.ucat` | `called-also` | `span` |
| `.sdsense`, `.sd` | definition continuation (no separate unit) | inline |
| `.see-in-addition` | `see-in-addition` | `div` |
| `.urefs .ur` | `usage-discussion-reference` (visible pointer, no interactive link, no copied discussion) | `span`/`div` |
| `.section[data-id=origin]` | `origin` + `origin-section-title` + `origin-text` + `first-known-use` | `details`/`summary`/`div` |
| `.section[data-id=related-to]` | `related-item` + `synonym-discussion` | `details`/`div` |
| `.dro` / `.drp` | `phrase` + `definition-flow` | `details`/`div` |

`em`/`mw_t_it` SHALL become italic `span` nodes with
`data-content = emphasis`; `strong`/`b` SHALL become bold
`data-content = strong` spans; `sup` SHALL become
`data-content = superscript-reference` spans; `p` SHALL be transparent;
`.mw_t_bc` SHALL render as plain colon text. `.entry-status` images SHALL be
excluded from output. `First Known Use` paragraphs inside the origin section
SHALL render as `first-known-use` units (`div`) with their text verbatim, in
source order after the etymology prose.

The term-bank rules field SHALL be empty except for `v_phr`: a canonical
entry (main, alternative-spelling, or drp-phrase) whose term has at least
two space-separated words and whose own examples contain two marked spans
(`.mw_t_wi` or `.mw_t_it`) with retained text between them, where the second
marked span equals the term's final token, SHALL receive the rule `v_phr`
(evidence-based; see ADR 0005). Every attachment SHALL be reported as an
`interposed-object-v-phr` conversion finding.

#### Scenario: Sense-local label stays local

- **WHEN** a `.sl` label such as `chiefly substandard` qualifies one sense
- **THEN** it renders inline beside that sense as local structured content
  and does not populate the Yomitan tag bank

#### Scenario: Navigation target removed

- **WHEN** source content contains a `bword://` or `gdlookup://` link with
  useful visible text
- **THEN** the visible text remains and the internal navigation target is not
  emitted

### Requirement: Preserve the six-level sense hierarchy

Senses SHALL be collected from `.sense` and `.sen` containers whose nearest
`.sb` is the current one, in document order. Each container's marker path
SHALL come from its `.sn` (`.num` → level 3, `.letter` → level 4, `.sub-num`
→ level 5). A sense without its own marker at a level SHALL inherit the
previous sense's marker at that level. Bare senses (no `.sn`) SHALL render
directly into the parent flow. Resolved paths SHALL be grouped into nested
`ol` lists — level 3 decimal, level 4 lower-alpha, level 5 decimal — with
each `li` carrying its source marker in `data.sourceMarker`. Each sense's
content SHALL be wrapped in a `definition-flow` div at the sense's level.

#### Scenario: Numbered-lettered-parenthesized runs

- **WHEN** source markers form `1a(1)`, `1a(2)`, `1b(1)` runs
- **THEN** the renderer reproduces the nested marker paths and each level uses
  its own list style

#### Scenario: Bare sense

- **WHEN** a sense has no `.sn` marker
- **THEN** its content renders directly into the parent flow

#### Scenario: Verb subtype placement

- **WHEN** a `.vd` verb subtype precedes the sense list it owns
- **THEN** it emits as a bold `verb-subtype` block before that list

### Requirement: Collapse examples after the first

One `.vis` (or a bare `.ex-sent-group`) SHALL be one local example group: its
first example SHALL render as a visible `example-sentence`, and every later
example SHALL collapse into an `extra-examples` `details` with an
`N more examples` summary. Attributions SHALL stay attached to their own
example (one per `ex-sent-group`, never inherited from a sibling). The `→`
arrow prefix of a source example SHALL be dropped as presentation metadata.

#### Scenario: One-visible-example policy

- **WHEN** a local example group contains three examples
- **THEN** the first renders visibly and the other two render behind an
  `N more examples` disclosure

### Requirement: Map part-of-speech labels to definition tags

The `.fl` label SHALL map to the Yomitan `definitionTags` field: `noun` →
`n`, `adjective` → `adj`, `verb` → `v`, `adverb` → `adv`, `pronoun` →
`pron`, `conjunction` → `conj`, `preposition` → `prep`, `interjection` →
`interj`, `abbreviation` → `abbr`, `symbol` → `symbol`, `prefix` →
`prefix`, `suffix` → `suffix`, `combining form` → `comb`. Verb subtypes SHALL
collapse to `v`. Special forms: `geographical name` → `geo`, `biographical
name` → `bio`, `proper noun` → `prop n`,
`trademark`/`service mark`/`certification mark` → `trademark`,
idioms/phrases → `phrase`, `auxiliary verb` → `aux`, articles → `art`,
`contraction` → `contraction`, `affix` → `affix`. Compounds SHALL join
mapped parts with ` or `; parenthesized alternates SHALL drop the
parenthetical; `noun … in construction` forms SHALL collapse to `n`, `plural
noun` to `n pl`; unknown labels SHALL keep their cleaned source text as a
tag.

#### Scenario: Verb subtype collapse

- **WHEN** the label is `transitive verb` or `verb, transitive +
  intransitive`
- **THEN** the definition tag is `v`

#### Scenario: Compound part of speech

- **WHEN** the label is `adjective or noun`
- **THEN** the definition tag is `adj or n`

### Requirement: Render undefined run-ons and local form flow without block breaks

An undefined `.uro` derivative SHALL render as a compact child of its parent
entry with its form, pronunciation, part of speech, labels, and inflection
markers in source order. A sense-local form such as `turns` SHALL remain
ordinary inline text. The renderer SHALL NOT introduce a block break merely
because the source uses separate inline spans for a form and its label.

#### Scenario: Undefined run-on

- **WHEN** the `abandon` entry contains `abandoner` with pronunciation, noun
  label, and plural form but no definition
- **THEN** it renders as one compact child of the parent entry and never
  creates a canonical record or soft link

#### Scenario: Sense-local form stays inline

- **WHEN** a sense shows `c turns plural : menses` from separate inline
  spans
- **THEN** the form, label, and cross-reference stay in one responsive flow
  with no block break

### Requirement: Preserve unsupported visible content once

The converter SHALL retain unsupported visible content as one neutral fallback
at its source position and SHALL record one actionable conversion finding. It
SHALL NOT silently discard the content or render recognizable descendants a
second time. A converted owner whose rendered visible text is empty SHALL fail
conversion with a fatal diagnostic.

#### Scenario: Unknown visible subtree

- **WHEN** a canonical owner contains an unsupported subtree with visible text
- **THEN** that subtree contributes one neutral fallback and one
  `unsupported-visible-subtree` finding with the source row, canonical owner,
  element, classes, source position, and text preview

#### Scenario: Empty presentation node

- **WHEN** an unsupported node has no visible text or meaningful media-like
  content
- **THEN** it produces neither visible fallback nor a misleading semantic unit

#### Scenario: Empty canonical definition

- **WHEN** a planned canonical owner renders no visible text
- **THEN** conversion fails with `empty-canonical-definition` and emits no
  empty canonical record

### Requirement: Keep source identity and findings inspectable

Every conversion result SHALL retain its canonical plan identity, source row
ID and key, owner position, structured definition, and ordered findings. The
same inputs SHALL produce equal result data and finding order.

#### Scenario: Same-spelling canonical entries

- **WHEN** separate canonical plans share one searchable spelling
- **THEN** their conversion results remain distinct through their source owner
  identities

#### Scenario: Repeated conversion

- **WHEN** the same canonical plan and source HTML are converted twice
- **THEN** their structured content and findings are equal in content and order

### Requirement: Keep the Yomitan reading field empty

The converter SHALL leave the Yomitan reading field empty and SHALL display
all MWU pronunciation in structured content. Source-supported readings SHALL
be wrapped in `/…/` delimiters with `¦` normalized to `ˈ` and zero-width
spaces removed. Annotation prose (segments with `.mw_t_it` markup) and
inter-element punctuation (`.addPunct`, `.pun`) SHALL be preserved outside
reading delimiters. Ambiguous text SHALL NOT receive invented IPA
delimiters.

#### Scenario: Reading field

- **WHEN** a canonical source contains MWU pronunciation text
- **THEN** the emitted Yomitan reading string remains empty

#### Scenario: Multiple readings

- **WHEN** a source contains several readings such as `/ˈtərn/` and
  `/ˈtu̇rn/`
- **THEN** every reading appears visibly in structured content and none is
  silently discarded

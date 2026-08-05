# Design fixtures

This directory contains a hand-authored Yomitan term-bank fixture for agreeing
on the MWU structured-content design. It is a design reference, not the
production parser data model.

## The `what` fixture and ten-word expansion

[`what/term_bank_1.json`](what/term_bank_1.json) is a provisional reference
artifact. It is written directly as Yomitan term-bank JSON, using real text
from the MWU articles as evidence, but it is not the production source of
truth or final visual design. It currently contains 136 records: the original 22
`what` records, 77 records for the ten additional source families, four
`bare-affix-soft-link` records, and 29 `drp-phrase-canonical-entry` records for
`set` plus one
`set upon` alternative soft link, plus the two definition-bearing
`hand cheese`/`hand game` records found inside the `hand` source row, and the
definition-bearing `O` variant mean from the `o` source row.
`turn`, `take`, `run`, `process`, `have`, `set`, `hand`, `give`, `in`, and
`o`. The JSON is intentionally readable: each structured-content node carries
a `data.content` information-unit name and, where useful, a `data.level` or
`data.sourceMarker` value.

The fixture currently demonstrates:

- five independent `what` Level 1 entries with WTY-style POS definition tags;
- multiple IPA readings in one visible structured-content line, with the
  Yomitan reading field empty;
- inline scoped labels such as `substandard`, `slang`, and `obsolete`;
- local grammar labels such as `transitive` and `transitive + intransitive`,
  kept beside the sense they qualify;
- nested definitions, usage notes, examples, target highlighting, and
  superscript references in `1whatever`, `whoever 1`, and `2whatever`;
- one-line inflection metadata;
- titled, collapsed origin sections;
- defined phrase sections that are collapsed by default;
- one visible example per local example group, with additional examples in a
  collapsed `details` node;
- the canonical `what an if` entry and the `what and if` dictionary-
  deinflection soft link.

The ten-word expansion adds:

- same-spelling independent `<mean>` records for `turn`, `run`, `process`,
  `have`, `set`, `hand`, `give`, `in`, and `o`;
- normalized searchable terms such as `process` while retaining the visible
  `pro·cess` headword display;
- one-line multi-reading pronunciation and inflection groups from `process`,
  `turn`, `in`, and `o`;
- Level 2 verb groups, phrase-owned POS labels, `called also`, related-word
  discussion, the separate `synonyms see in addition ...` line, and
  sense-bound usage notes;
- `drp-phrase-canonical-entry` records such as `take a bath`, `take apart`, `by the run`,
  and `give up`, plus `phrase-alternate-soft-link` records such as `take the stage` →
  `take stage`;
- the complete recognized `set` source slice: 112 direct verb senses, 16
  adjective senses, 80 noun senses, 29 defined phrases, and `set upon` →
  `set on` as an `alternative` soft link;
- `main-to-alternative-spelling-soft-link` records whose lookup term is the
  source `word.w` spelling:
  `in` → `in-`/`-in` and `o` → `O`/`o-`/`-o`/`-o-`/`o'`/`oh`;
- explicit `vr-mean-alternate-soft-link` records for `il-`, `im-`, `ir-`, and
  `ino-`, plus the
  current bare lookup examples `il`, `im`, `ir`, and `ino`, all targeting
  `in-`; the design rule is general and applies to every source-confirmed
  marked prefix, suffix, infix, or marked alternate, reusing an existing
  source-row link when it already supplies the same route;
- `alternative-spelling-canonical-entry` ownership and dedicated-row deferral
  evidence for the `in` and `o` families.
- source-assisted Level 1 homograph metadata for the selected source means,
  entry qualifiers such as `often attributive`, and the two definition-bearing
  embedded `hand cheese`/`hand game` records.

The latest render pass confirms that the experimental source-shaped additions
import and render in the same ZIP: `process` keeps its three header readings and one form-pronunciation
line, `take` preserves spaces around highlighted examples, `hand` renders its
local `.sgram` labels, `set` keeps its full recognized sense/phrase slice with
the ordinary `set` records prioritized before `seth`/`sett`, and
`give up`/`sett` retain their dedicated source-row entries.

The production selected-word path now implements the corresponding Level 1
structured-content slice in
[`src/conversion/renderStructuredContent.ts`](../src/conversion/renderStructuredContent.ts).
It consumes canonical `<mean>` HTML, emits semantic MWU headers and native
ordered lists, keeps local labels/examples attached to their owning senses,
and collapses origin, phrase, and extra-example sections. The fixture remains
the visual reference and coverage ledger; production output is verified by
focused converter tests, real SQLite builds, archive schema checks, and the
bundled-Chromium importer.

The source-to-fixture comparison is recorded in
[`coverage-audit.md`](coverage-audit.md). It deliberately distinguishes
information-unit coverage from complete article transcription. The `set` slice
is frozen for the recognized source structures; the audit still lists the
large `turn`, `take`, and other articles that remain compact design slices.

For repetitive source inspection, use the read-only fragment helper:

```sh
bun run design:fragments set turn take what
```

It writes `build/design-what/mwu-source-fragments.json` with the real source
headword, pronunciation, inflection text, origin, sense text, phrase
definitions/alternatives, sense blocks, local alternatives, and superscript
values. It does not generate or modify the term bank. The
term-bank JSON remains hand-authored; this helper exists so source text is
copied from evidence rather than reconstructed from memory.

For stable metadata that is repetitive to copy, the narrowly scoped updater
can copy source `<h1><sup>` homograph numbers, `.lbs` entry qualifiers, and
definition-bearing `.cxl-ref` variant references into the existing JSON. It
also keeps pronunciation nodes inline so a homograph number does not become
an isolated line before the IPA. It writes a match report:

```sh
bun run design:update-metadata
```

It does not generate definitions, examples, hierarchy, or relationships. Those
remain directly visible in the hand-authored term bank. The current selected
report matches 55 source means; it leaves only the no-POS/no-homograph `-o-`
mean unmatched, which is retained manually in the fixture and recorded in
`build/design-what/known-metadata-update.json`.

The source survey has three findings sections under `findings`:
`interesting`, `notNeeded`, and `notYetNoticed`. For the selected eleven-word
report, the latest run has zero `notYetNoticed` findings. The `.sen` class found
in `hand`, `process`, `run`, `set`, `take`, and `turn` is a transparent MWU
sense wrapper, not a new information unit; class fragments such as `(with` and
`{ldquo}thou{rdquo})` are label-text presentation tokens, not separate
dictionary data.

The fixture is deliberately manual. No HTML parser runs when the design ZIP is
created. The original HTML and GoldenDict rendering remain evidence for the
text and ownership decisions; they are not runtime inputs to this design job.

## Packaging and checks

From the package directory:

```sh
bun test design-fixtures/what.test.ts
bun run design:what:zip
```

The ZIP is written to
`build/design-what/MWU-what-design.zip`. To package it and run the existing
dictionary-import/UI harness together:

```sh
bun run design:what
```

`what/write-zip.ts` only reads `what/term_bank_1.json`, adds the tag bank, and
packages the result. It does not parse HTML, query SQLite, or generate
semantic data. Edit the JSON directly when changing the design fixture;
update the survey catalog when a new information unit is discovered.

The Level 1 relationship direction is intentional. A
`main-to-alternative-spelling-soft-link`
uses the source lookup term as the Yomitan term and the local canonical
headword as its dictionary-deinflection target. For every source-confirmed
marked affix or marked alternate, the general bare-affix rule additionally
removes only boundary hyphens and points the bare term to that same target
with the `alternative` rule, unless an exact
`main-to-alternative-spelling-soft-link` route already exists.
Therefore searching `in` can surface the canonical `in-` and `-in` entries,
while `-in` remains independently searchable through its own canonical record.

The ZIP is reference evidence for the eventual implementer. It is not a final
visual contract, a production output snapshot, or evidence that the production
converter already supports every unit shown here. Production ownership and
link tests may replace its choices.

## Deferred investigations

The fixture intentionally leaves these for later:

- expanding the direct MWU HTML renderer to uncommon source wrappers and
  broad all-article coverage;
- exact ownership of unusual markup, images, and less common presentation
  classes;
- whether `.sgram` grammar labels should ever be promoted from scoped inline
  text into a Yomitan tag-bank tag;
- the final visual styling of Level 6 `.see-in-addition` lines inside
  `#usage-notes` or a definition-local `.usage` block; their source ownership
  is now recorded by the survey;
- the complete label inventory and future tag-bank promotion rules;
- broader validation of dictionary-deinflection soft links and phrase lookup
  behavior in Yomitan;
- copying every remaining definition and phrase from the ten source articles;
- reconciling fixture-only soft-link examples with the approved general
  `main-to-alternative-spelling-soft-link` rules before reusing them in
  production tests;
- the final policy for origin/First Known Use and audio extraction.

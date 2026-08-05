# Manual design-fixture render audit

Updated: 2026-08-06

This is a visual/behavioral check of the hand-authored
[`what/term_bank_1.json`](what/term_bank_1.json) after packaging it as
`build/design-what/MWU-what-design.zip`. It is not parser output. The ZIP was
imported into the local Yomitan Chromium fixture with revision
`design-what-plus-set-1`.

## Production renderer audit

The production selected-word builder now consumes the same MWU source shape
through [`renderStructuredContent.ts`](../src/conversion/renderStructuredContent.ts);
the hand-authored JSON remains a reference, not an input. A five-root build of
`what`, `take`, `process`, `set`, and `hand` produced 180 canonical records and
29 soft links with no fatal errors. The direct `what` owner rendered 12 native
ordered-list levels, 13 collapsed phrase sections, 9 collapsed example groups,
84 example nodes, orange target highlights, and zero conversion findings.

The bundled-Chromium importer then passed per-query searches for `what`,
`process`, `set`, `hand`, and `take stage`; a screenshot of the rendered result
was captured during the audit. The Chrome MCP connector was unavailable, so
this is local Playwright evidence rather than Chrome-MCP evidence. The harness
now supports `--extension-path` for the ignored fixture, `--screenshot` for
visual review, and explicit per-query result assertions.

## Queries checked

The current rebuilt ZIP was imported and rendered for `set`, `what an if`,
`take the stage`, `il`, and `in`; the earlier audit also covered `what`,
`turn`, `take`, `run`, `process`, `have`, `sett`, `hand`, `give`, `give up`,
and `o`.

Representative screenshots were generated under `/tmp/yomitan-design-*.png`
during the audit. The source comparison used the original MWU HTML rows in
`assets/MWU.db` and the previously recorded GoldenDict evidence.

## Confirmed render behavior

- `what` has five independent POS entries. Its nested `ol` lists use Yomitan’s
  ordered-list rendering, target words are orange-highlighted, origin is a
  collapsed titled section, and only one example is visible in each local
  example group.
- `process` searches as `process` while displaying `pro·cess`; all three
  header readings remain on one line, and the plural form pronunciation occurs
  once in the inline inflection group.
- `take` shows the nested transitive/intransitive groups, keeps the source
  space in `take the book from the table`, and collapses the defined phrase
  sections by default.
- `hand` displays `.sgram` values such as `transitive` and
  `transitive + intransitive` beside their local senses. The labels are scoped
  italic text, not global Yomitan tags.
- `set` search places the ordinary `set` POS records before the lower-score
  `main-to-alternative-spelling-soft-link` routes to `seth` and `sett`; all
  112 verb, 16 adjective, and
  80 noun senses are present, all 29 phrase sections are collapsed by
  default, and `sett` remains independently searchable through its dedicated
  canonical entry.
- `give up` has the dedicated verb and noun records. `in` and `o` retain their
  normal entries as well as the independently searchable affix/variant
  records reached by `main-to-alternative-spelling-soft-link` routes.
- `take the stage` resolves to the canonical `take stage` phrase entry and
  visibly retains `or take the stage`; the parent `take` entry still retains
  its collapsed phrase section.
- `what an if` is an independent phrase result, while `what and if` is its
  dictionary-deinflection soft link. The soft-link result visibly carries the
  `alternative` rule tag and does not duplicate the definition tree.
- Searching bare `il` resolves to the marked `in-` canonical entries through
  the `alternative` rule. The displayed entries retain `in-` and their source
  alternate forms; the bare query does not create a duplicate definition.
- The rebuilt ZIP imports with 136 term-bank records. The variant-only `O`
  record is covered by the JSON/schema tests; its direct visual query remains
  a follow-up screenshot rather than being inferred from the import alone.
- The `turn` synonym discussion remains collapsed, and its separate
  `synonyms see in addition depend` line is stored under that Level 1 related
  section rather than being mixed into the synonym prose.

## Yomitan-owned grouping presentation

The fixture does not place the dictionary name or a `wty-en-en`-style label
inside every structured-content definition. Yomitan adds the dictionary tag
while rendering a term result. Its display generator marks later tags from
the same dictionary as redundant, and the compact-tags style hides redundant
copies. Therefore the number of visible dictionary labels depends on
Yomitan's result grouping and compact-tag settings; it is not a missing MWU
information unit and does not require repeated text in the hand-authored
JSON.

The fixture uses the ordinary `group` result mode for same-term records. It
does not use `merge`/“Group related terms”: that mode is intended for a
dictionary whose term records contain related-term sequence data, whereas our
`main-to-alternative-spelling-soft-link` relationships are represented explicitly by dictionary-
deinflection soft-link records.

## Issues found and fixed during the audit

1. The first renderer import rejected a raw `strong` structured-content tag.
   Yomitan’s schema supports a styled `span` here, so the manual JSON now uses
   a styled `span` for the bold `synonyms` label.
2. The first render pass exposed missing spaces around highlighted example
   spans and a repeated form pronunciation. The manual JSON now keeps the
   source boundary spaces and emits the form pronunciation only in its form
   group.

## Deferred checks

- The fixture is a structural slice, not a transcription of every source
  definition or phrase.
- The survey now enumerates `.sgram` in 216 source rows; the remaining
  decision is whether any scoped grammar label should become a Yomitan tag.
- `.see-in-addition` outside the synonym-discussion wrapper is now known to
  occur in `because`, `finalize`, `he`, `one`, and `they`; their surrounding
  ownership still needs a later focused fixture.
- The fixture still does not define every production fallback or uncommon
  source wrapper. The production renderer now covers the documented Level 1
  slice; broader uncommon markup, media, and full-article transcription remain
  deferred.

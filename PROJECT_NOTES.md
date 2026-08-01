# MDX to Yomitan: Project Notes and Research Log

Last updated: 2026-08-01

Status: the first end-to-end conversion slice is implemented and verified. It
is intentionally not the final full-database fidelity pass.

## Goal

Convert the English Merriam-Webster Unabridged MDX dictionary into a Yomitan
dictionary while preserving useful dictionary structure:

- headwords and alternate forms;
- parts of speech and pronunciation;
- multiple senses and nested sense numbering;
- examples and usage notes;
- phrases and phrasal verbs;
- cross-references and other source-specific information where it can be
  represented reliably.

The important design principle is that the converter should preserve meaning
and structure first. It should not flatten every piece of MDX HTML into one
large block of text merely because that is easier to export.

## What we have explored

- The repository structure and the roles of the main packages.
- The SQLite database produced from the MDX source.
- The current parser and Yomitan dictionary-building pipeline.
- Yomitan's term-bank format and structured-content format.
- Yomitan's scanner, translator, database lookup, and English language
  transforms.
- The behavior of interposed objects in English phrasal verbs, confirmed by a
  Yomitan clipboard lookup such as `give you up` → `give up`.
- WTY's grouping, form-bank, tag-bank, and IPA representation patterns.
- Real MWU HTML details: `.un` is an additional definition block, while
  `.snote` is a source note; `.dro`/`.drp` contains independently defined
  phrases; `.if` and `.pr` contain inflection and pronunciation information;
  `.vd` marks grammar groups; `.sdsense` marks subordinate senses; `.vr`/`.va`
  supplies alternate phrase display forms; and `.ca`/the related-to section
  contains called-also and discussion material.

The first conversion slice is now implemented. Existing user changes in the
worktree remain untouched.

## Current project flow

The current pipeline is:

```text
MDX dictionary
    ↓ pyglossary conversion
SQLite database (MWU.db)
    ↓ db.ts queries word records
HTML definition for one headword
    ↓ parser.ts / Cheerio
plain MwuEntry values
    ├── main lexical entry
    ├── phrase entries
    └── alternate-form links
    ↓ yomitan.ts / builder.ts
Yomitan ZIP dictionary
```

### SQLite source

[`packages/merriam_webster_unabridged/src/db.ts`](packages/merriam_webster_unabridged/src/db.ts)
documents the current SQLite shape:

- `word(id, w, m)` contains the main headword and its MDX HTML content.
- `alt(id, w)` contains alternate-word information and is queried to emit
  lightweight canonical-term links.
- `dbinfo` and `dbinfo_extra` contain source metadata.
- `queryWordRows` reads the main `word` table and excludes entries whose keys
  begin with `collegiate_`, `medical_`, or `thesaurus_`.
- `queryGivenWordRows` performs exact `w IN (...)` lookups for requested test or
  extra words.

### Builder entry point

[`packages/merriam_webster_unabridged/src/index.ts`](packages/merriam_webster_unabridged/src/index.ts)
now:

1. creates the Yomitan dictionary index;
2. adds the stylesheet and tag-bank definitions;
3. iterates through SQLite word rows;
4. sends each HTML value to `parseMwuEntry`;
5. renders main entries and `.drp` phrase entries as Yomitan terms;
6. adds lightweight `alt` records that point to the canonical term;
7. exports the dictionary ZIP.

`builder.ts` is the small adapter around `yomichan-dict-builder`'s
`TermEntry`. It maps our plain record to the eight-field Yomitan term tuple and
uses `setDeinflectors` for English rules such as `v` and `v_phr`.

### Current HTML parser

[`packages/merriam_webster_unabridged/src/parser.ts`](packages/merriam_webster_unabridged/src/parser.ts)
currently treats each `<mean>` block as a parser result. It extracts or builds:

- `.hword` as the headword;
- `.fl` as part of speech and `.pr` as pronunciation;
- `.sb`, `.sbNum`, and `.sense` as a nested sense tree;
- `.un` blocks as additional definitions under a sense;
- `.snote` blocks as indented notes;
- `.ex-sent-group` as examples;
- `.vd` grammar groups and `.sdsense` subordinate senses;
- `.et` plus first-known-use text as origin information, and `.dx-jump`, `.ca`,
  and related-to discussion as related information;
- `.dro`/`.drp` as phrase entries;
- `.vr`/`.va` phrase variants as additional searchable phrase entries;
- `.if` as inflected forms;
- structured content for the resulting entry.

The parser still has incomplete source coverage for some source-specific
classes such as audio, images, and several specialized related/variant lists.
Grammar groups, subordinate senses, first-known-use text, called-also text, and
the main related-to discussion are now supported. The remaining gaps are
tracked as follow-up fidelity work rather than silently treated as complete.

## What is implemented in the first slice

- Each `<mean>` becomes its own lexical record, preserving multiple
  part-of-speech/homograph records for one source row.
- All visible pronunciations are shown in the definition; the first is also
  placed in Yomitan's single `reading` field.
- Main senses, nested senses, `.un` definitions, examples, `.snote` notes,
  source labels, grammar groups, subordinate senses, origin/first-use text,
  and cross-reference text are retained.
- MWU internal link targets such as `gdlookup://` and `bword://` are removed;
  visible link text remains.
- `.drp` phrases become separate searchable entries and are listed compactly
  under their parent entry; `.va` variants become additional searchable phrase
  entries with the same source definition.
- `alt` rows become lightweight records such as `givers → gave/give` rather
  than copied full definitions.
- Reliable labels become short Yomitan tags (`arch.`, `obs.`, `dial.`, `Br.`,
  `sub.`, `Scot.`, and similar). Unmapped source labels receive a stable
  `mwu_...` fallback tag with the original text in the tag-bank notes.
- Verb phrases ending in a recognized English particle receive `v_phr`, so
  Yomitan's own English transform can resolve `give you up` to `give up`.
- Long related-to discussions are represented as closed-by-default Yomitan
  `<details>` sections; short related references remain visible.
- `styles.css` provides only spacing, muted metadata, indented notes, and
  section separators.

Verification performed on 2026-08-01:

- `bun test packages/merriam_webster_unabridged/tests`: 24 passing tests.
- `bun build packages/merriam_webster_unabridged/src/index.ts --target bun`:
  successful bundle.
- Sample export with `what`, `word`, `useless`, `give`, and `give%20up`:
  83 terms; archive contains `index.json`, `styles.css`,
  `term_bank_1.json`, and `tag_bank_1.json`.
- Local Yomitan English transform suite: 107 tests passing, including the
  interposed-object cases.
- Local Yomitan fixture import and rendered search check: `give up` produced
  separate noun and verb results; the verb result visibly showed `Grammar`,
  pronunciation, forms, examples, and `v_phr`; `count` showed grammar groups,
  compact source tags, phrases, origin/first-use text, and a collapsed long
  related section.

## Yomitan behavior we confirmed

### Ordinary multiword expressions

A contiguous expression such as `give up` is stored as the normal dictionary
term `give up`. The scanner supplies text candidates to the translator, and
the database then looks up the normalized expression.

### English interposed-object phrasal verbs

Yomitan has an English language-transform rule named `interposed object`. The
current upstream source is:

- [English transforms](https://github.com/yomidevs/yomitan/blob/master/ext/js/language/en/english-transforms.js)
- [English transform tests](https://github.com/yomidevs/yomitan/blob/master/test/language/english-transforms.test.js)

The rule recognizes an object placed between a verb and a separable particle
and removes that object before dictionary lookup:

| Text being looked up | Normalized dictionary term | Reason shown by Yomitan |
| --- | --- | --- |
| `give you up` | `give up` | `interposed object` |
| `look something up` | `look up` | `interposed object` |
| `look it up` | `look up` | `interposed object` |
| `looked something up` | `look up` | `past` + `interposed object` |

This is not a wildcard stored in the dictionary. The mechanism is:

```text
page/clipboard text: give you up
    ↓ English language transform
normalized text: give up
    ↓ dictionary term lookup
term-bank entry: give up
```

The transform emits the intermediate English condition `v_phr`. Therefore the
dictionary entry for a phrasal verb must carry the equivalent Yomitan rule
identifier `v_phr`; merely tagging it visually as a verb is not enough when
Yomitan's parts-of-speech filtering is active. The translator matches the
transform conditions against the term entry's rules before accepting the
result. See the upstream [translator implementation](https://github.com/yomidevs/yomitan/blob/master/ext/js/language/translator.js).

### Consequence for this converter

For a source phrase such as `give up`, the target should contain:

```text
expression: give up
rules: v_phr
```

It should not contain a literal expression such as `give XXX up`. Yomitan's
English transform already handles examples such as `give you up` and
`give the plan up`, as long as the normal phrasal-verb term and its rule are
exported correctly.

This also explains why different words need different structures. A regular
verb, a fixed multiword expression, a separable phrasal verb, an inseparable
prepositional verb, and a usage-pattern note should not all be represented by
the same generic output shape.

## Decisions and working design

These are the decisions captured from the discussion so far. They guide the
ongoing implementation; they do not mean that every source-specific feature
has already been solved.

### Source links

MWU links such as `gdlookup://localhost/word` do not need to survive in the
Yomitan dictionary. We should remove the internal link target and keep useful
visible text as ordinary text when possible. We should not invent a Yomitan
link target merely because the source used an HTML link.

### Grouping meanings and homographs

WTY gives us a useful reference point:

- one Wiktionary `WordEntry` becomes one lexical entry with a nested gloss or
  sense tree;
- grammar, etymology, examples, and sense-specific labels stay inside that
  entry;
- forms and alternate forms point back to the lemma rather than copying the
  complete definition;
- distinct source entries can remain distinct even when their displayed word
  is the same.

Therefore, we should not blindly make every `<mean>` a separate Yomitan entry,
and we should not blindly merge every `<mean>` from one database row. The
working MWU grouping key is the lexical identity of the item:

```text
normalized expression + part of speech + reading/pronunciation identity
```

Senses belonging to that item should be grouped into one entry. A different
homograph, part of speech, independent phrase, or meaningful reading should
remain a separate entry. A database row is useful source context, but it is
not by itself the final Yomitan grouping rule; representative HTML fixtures
must show how MWU uses `<mean>` and neighboring nodes.

### Alternate forms and deinflection

The preferred output is a searchable alternate form that points to the
canonical lemma, not a second full copy of the definition. This follows WTY's
form-bank pattern.

However, Yomitan deinflection is not a general-purpose alias table. It can
only produce forms and conditions implemented by the language transform. The
working policy is:

- regular English inflections or phrasal-verb transformations: use Yomitan
  rules when the English transform recognizes them;
- an MWU alternate spelling or lexical variant that Yomitan cannot generate:
  export a lightweight searchable form/alias record pointing to the
  canonical expression;
- do not duplicate the entire definition merely because two searchable forms
  reach the same lemma.

We still need to inspect real `alt` rows before deciding which MWU variants
belong in each category.

### Usage notes

Usage notes should be rendered as indented text first. They should remain
visibly distinct from the definition while staying open and easy to scan. A
later iteration may make very long material collapsible, but that is not part
of the first representation.

### Labels, tags, and rules

Yomitan tags and Yomitan rules have different jobs:

- definition or term tags are visual metadata such as `archaic`, `slang`, or
  `chiefly British`;
- structured-content labels can display information that applies to only one
  sense;
- rules are machine-readable language conditions used by transforms and
  deinflection, such as `v` or `v_phr`.

The WTY pattern is a good starting point for MWU `.sl` labels: normalize known
source labels, map reliable labels to a tag bank, place labels common to the
whole grouped entry at the top level, and keep sense-specific labels beside
their sense. The first slice also creates a stable `mwu_...` fallback tag for
unmapped labels, with the original source text in the tag-bank note; this
avoids silently losing source labels while keeping the visible tag token safe
for Yomitan's space-separated tag field. A label such as `v` may contribute to
a Yomitan rule, but it should not be treated as a visual tag when the purpose
is to enable a transform.

### Pronunciation and multiple readings

The user wants pronunciation available both to Yomitan and visibly in the
definition. Yomitan's term-bank record has one `reading` string, not a list of
readings. WTY works around this limitation by selecting one displayed reading
and representing other readings as forms; its source comments explicitly note
that this can cause an alternate-reading search to display the first reading.
WTY also has a separate IPA dictionary, which is useful evidence that IPA and
the searchable reading field are not always the same concept.

Our working design is:

- show every available MWU pronunciation in a structured Pronunciation
  section/header;
- use the Yomitan `reading` field for one meaningful searchable reading per
  term record;
- if multiple readings must be independently searchable, emit one lightweight
  term record per reading while keeping the definitions produced from the
  same intermediate entry;
- do not assume that an IPA string should be the searchable reading until we
  inspect what MWU's `.pr` contains. It may be better as displayed
  pronunciation metadata.

This preserves both search behavior and complete pronunciation information,
while acknowledging that Yomitan cannot store a true multi-valued reading in
one term-bank record.

### Phrases and derivatives

A phrase is a multiword expression that functions as a lexical unit. Examples:

- `give up` — a phrasal verb;
- `in spite of` — a fixed prepositional phrase;
- `by and large` — an idiomatic adverbial phrase.

A derivative is a new word formed from another word, usually by derivation.
For example:

- `happy` → `happiness`;
- `help` → `helpful`;
- `use` → `useful`.

`help` → `helped` and `cat` → `cats` are inflections, not derivatives. A
collocation appearing only inside an example is not automatically a phrase
entry, and a related-word link is not automatically a derivative.

For MWU, a phrase with its own definition should become its own searchable
Yomitan term and may also be listed under the parent word. A phrase used only
as an example stays with that sense. A derivative with its own MWU definition
should likewise be a separate searchable term; the parent can additionally
show it in a Related or Derived forms section.

### Origin and related information

The converter should preserve as much origin, etymology, related-word, and
derived-form information as the MWU source provides reliably. We will display
it in clearly labeled structured sections and keep it separate from the main
definition/sense tree. Source-specific internal links are still discarded
according to the link decision above; their useful visible text can remain.

## WTY and Yomitan references read

The following references informed the working design:

- [WTY project](https://github.com/yomidevs/wiktionary-to-yomitan) converts
  Wiktionary data into Yomitan-compatible main, glossary, and IPA dictionaries.
- [WTY dictionary documentation](https://yomidevs.github.io/wiktionary-to-yomitan/dictionaries/)
  describes the main dictionary as the detailed form containing etymology and
  examples, while forms are emitted as searchable records rather than copied
  definitions.
- [WTY tag documentation](https://yomidevs.github.io/wiktionary-to-yomitan/tags/)
  describes normalized labels, tag-bank entries, aliases, sorting, and the
  distinction between top-level and sense-specific tags.
- [Yomitan dictionary format](https://github.com/yomidevs/yomitan/blob/master/docs/making-yomitan-dictionaries.md)
  documents term-bank fields, structured content, tag banks, and language
  rules.
- [Yomitan term-bank schema](https://github.com/yomidevs/yomitan/blob/master/ext/data/schemas/dictionary-term-bank-v3-schema.json)
  confirms that a term record has one reading and a separate rules field.

WTY is a reference for representation patterns, not a promise that MWU's HTML
has the same semantics. MWU fixtures remain the source of truth for parsing.

## Follow-up questions after the first slice

These questions are deliberately left for the next fidelity pass and should be
answered with more representative MWU HTML and builder tests:

1. Which remaining phrase/variant classes need the same treatment as
   `.drp`/`.vr`/`.va`? The main phrase ownership is now understood.
2. Which remaining MWU part-of-speech labels should become Yomitan rules such as `v`,
   `v_phr`, `n`, or `adj`?
3. Which `alt` rows are inflections, spelling variants, pronunciation
   variants, or separate lexical items?
4. What exactly does MWU `.pr` contain, and how many pronunciation variants
   can occur for one lexical item?
5. Which `.sl` values are stable enough for a tag bank, and which should stay
   inline?
6. Which derived-form classes deserve separate searchable records, beyond the
   current `.drp` phrases and `alt` aliases?
7. What exact `yomichan-dict-builder` API shape should represent form/alias
   records without duplicating full definitions?

## Research checklist

### Completed

- [x] Identify the monorepo packages and main build entry point.
- [x] Trace SQLite rows through the parser and Yomitan builder.
- [x] Inspect representative complex entries with multiple senses and usage
      structures.
- [x] Read the Yomitan term-bank and structured-content documentation.
- [x] Inspect Yomitan scanner and translator responsibilities.
- [x] Confirm Yomitan's English `interposed object` transform.
- [x] Confirm that `give you up` can resolve to `give up`.
- [x] Identify `v_phr` as an important output rule for phrasal verbs.
- [x] Read WTY's main-dictionary, form-bank, tag-bank, and IPA patterns.
- [x] Confirm that WTY groups senses under a lexical entry and emits forms
      separately instead of copying the full definition.
- [x] Confirm that Yomitan visual tags and deinflection rules are separate
      concepts.
- [x] Record the user's decisions about links, grouping, alternate forms,
      usage notes, labels, pronunciation, and related information.

### Next fidelity pass

- [x] Capture representative raw MWU HTML for ordinary words, phrasal verbs,
      phrases, cross-references, and entries with multiple `<mean>` blocks.
- [x] Inspect representative `alt`, `.pr`, `.sl`, origin, and related-content
      samples and classify their meanings before choosing output shapes.
- [x] Define a small intermediate representation that separates headwords,
      senses, phrases, examples, labels, and cross-references.
- [x] Map that representation to Yomitan term-bank records and structured
      content.
- [x] Verify the `yomichan-dict-builder` API mapping for `v_phr`.
- [x] Build/import a tiny test dictionary inside the Yomitan UI and inspect
      the rendered card; the archive and source-transform tests are complete.
- [x] Test `give up` and the local Yomitan interposed-object cases through the
      source transform suite.
- [ ] Add remaining source-specific audio, image, and specialized related/
      variant structures without making the first card noisy.

## Important boundary

The goal is not to make the converter understand every English grammar rule.
Yomitan already owns language-specific lookup transforms such as interposed
objects. The converter's responsibility is to export accurate lexical entries,
phrases, definitions, and the rule metadata that allows Yomitan to apply those
transforms.

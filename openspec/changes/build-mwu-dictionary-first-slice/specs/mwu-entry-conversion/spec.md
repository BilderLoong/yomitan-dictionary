## ADDED Requirements

### Requirement: Preserve the MWU hierarchy
The converter SHALL represent each independent `<mean>` lexical identity as Level 1, each source-owned transitive or intransitive subgroup as an integer-ordered Level 2 group, numbered senses as Level 3, lettered subsenses as Level 4, parenthesized individual definitions as Level 5, and definition attachments as Level 6.

#### Scenario: Nested sense markers
- **WHEN** an MWU definition contains a numbered sense, a lettered child, and a parenthesized child definition
- **THEN** the converted model contains nested Level 3, Level 4, and Level 5 nodes with the source markers and ordering preserved

#### Scenario: Meaning without a verb group
- **WHEN** a lexical entry contains Level 3 senses directly and has no source-owned Level 2 subgroup
- **THEN** the converter attaches those senses directly to Level 1 without inventing a Level 2 node

### Requirement: Preserve nearest-owner binding and source order
The converter SHALL attach every recognized information unit to its nearest semantic owner and SHALL retain the relative source order of definitions, child senses, labels, examples, usage notes, subordinate definitions, forms, and references.

#### Scenario: Subordinate definition after an example
- **WHEN** a definition contains an example followed by an `.sdsense` continuation
- **THEN** the converted body places the example before the subordinate definition under the same owning definition

#### Scenario: Phrase-local part of speech
- **WHEN** `.fl` occurs immediately under a defined phrase such as `by the run`
- **THEN** the part-of-speech information belongs to that phrase rather than its parent `run` entry

#### Scenario: Local cross-reference
- **WHEN** a comparison or cross-reference occurs inside a Level 5 definition
- **THEN** it remains a Level 6 attachment to that definition and is not promoted to Level 1

### Requirement: Represent recognized information units
The converter SHALL provide typed representations for all currently cataloged, non-ignored MWU information units: lexical identity, visible headword display, and part of speech; entry and form pronunciation; inflections, groups, labels, and markers; origin; verb subtype; sense markers and labels; definition text and labels; subordinate definitions; usage notes; examples, sources, and dates; comparisons and cross-references; phrases, alternate forms, and variant qualifiers; undefined run-ons and defined derivatives; related items; called-also text; synonym discussions and pointers; target highlighting; and interposed-object evidence. Each unit SHALL render at its nearest MWU semantic owner and Level 1–6 position. A newly encountered semantic unit SHALL follow the same owner-and-level rule once its meaning and source boundary are recognized.

#### Scenario: Rich headword display at its source level
- **WHEN** MWU presents a Level 1 headword with homograph numbers, printed syllable dots, or responsive breakpoint spans
- **THEN** the model retains the visible rich headword display while treating breakpoint span boundaries as presentation rather than inferred linguistic syllables

#### Scenario: Defined derivative at its source level
- **WHEN** MWU provides a derivative with its own source-owned definition
- **THEN** the model retains the derivative relation at its observed level and makes the defined derivative available as an independent lexical entry

#### Scenario: Undefined run-on derivative
- **WHEN** `abandon` contains `.uro` run-on `abandoner` with form metadata and examples but no definition
- **THEN** the model retains the complete run-on under the Level 1 parent and does not make `abandoner` independently searchable or create a soft link

#### Scenario: Newly recognized information unit
- **WHEN** reconnaissance establishes the meaning, source boundary, and nearest owner of a previously unknown information unit
- **THEN** the converter gives it a named typed representation and renders it in source order at that owner's level rather than promoting it to another level

#### Scenario: Inflected form with local readings
- **WHEN** an inflection group contains ordered labels, markers, forms, multiple pronunciations, and a local register qualifier
- **THEN** the converter retains each value in source order under that inflection group without creating an independent lexical entry

#### Scenario: Example attribution
- **WHEN** an example includes source text and a date
- **THEN** the source and date remain attached to that example

#### Scenario: Nested usage note
- **WHEN** a usage note contains another usage note and examples
- **THEN** the converter preserves the nested ownership and ordering

### Requirement: Render rich structured content
The renderer SHALL convert the intermediate model into Yomitan structured content while preserving visible pronunciation, inline labels and qualifiers, emphasis, target highlighting, source ordering, and example attribution. It SHALL leave the Yomitan reading field empty.

#### Scenario: Multiple pronunciations
- **WHEN** one lexical entry or form has multiple MWU pronunciations
- **THEN** every pronunciation and local qualifier is visible in structured content and no pronunciation is placed in the Yomitan reading field

#### Scenario: Additional examples
- **WHEN** a definition has more than three examples
- **THEN** the first three examples are visible and the remaining examples are placed in a collapsed section without losing their highlighting or attribution

#### Scenario: Subordinate qualifier rendering
- **WHEN** `.sdsense` introduces a qualifier such as `specifically`
- **THEN** the qualifier is visually distinct in the MWU style and its definition text continues normally at the source position

### Requirement: Preserve useful reference text without source navigation
The converter SHALL retain visible comparison, see-also, synonym-pointer, and etymological-reference text at its source owner, and SHALL discard internal `gdlookup://` and `bword://` navigation targets.

#### Scenario: Etymological more-at reference
- **WHEN** an origin section contains a `more at` reference
- **THEN** its visible text remains in the Level 1 origin content and its internal navigation target is absent

### Requirement: Extract independently defined phrases
The converter SHALL treat each `.drp` with its owned definition tree as one defined phrase, SHALL retain it in the parent entry, and SHALL make it available for independent searchable-record assembly. Defined phrase-local `.va` forms SHALL share that phrase meaning, retain their variant qualifiers, and be assembled as Yomitan dictionary-deinflection records pointing to the canonical phrase.

#### Scenario: Defined run-on phrase
- **WHEN** `take` contains the defined phrase `take a bath`
- **THEN** the model contains one `take a bath` phrase with its owned definition tree and the parent `take` entry retains the phrase relation

#### Scenario: Phrase with alternative
- **WHEN** `take the word` has the phrase-local alternative `take up the word` qualified by `or less commonly`
- **THEN** the canonical expression stores the parsed phrase-definition tree, the alternative stores a dictionary-deinflection pointer to the canonical expression, and the qualifier remains attached to the alternative relation

#### Scenario: Adjacent phrases
- **WHEN** a `.dro` collection contains adjacent `.drp` definitions
- **THEN** each phrase retains its own boundary and definition tree and the converter does not merge them

#### Scenario: Example-only expression
- **WHEN** a multiword expression appears only inside an example sentence
- **THEN** it remains example content and is not made available as an independent entry

### Requirement: Derive interposed-object lookup evidence conservatively
The converter SHALL derive interposed-object evidence only from paired target-highlight spans with retained intervening object text, and SHALL associate the resulting `v_phr` lookup rule with the canonical phrase rather than an example or wildcard term.

#### Scenario: Separable phrasal verb
- **WHEN** an example highlights `take` and `apart` with `a town` between them for the canonical phrase `take apart`
- **THEN** the phrase receives `v_phr` evidence and no `take XXX apart` term is created

#### Scenario: Italic text without paired targets
- **WHEN** an example contains italic or emphasized text but does not contain the required paired target spans
- **THEN** the converter does not derive interposed-object evidence

### Requirement: Classify ignored and unrecognized source content
The converter SHALL recognize pronunciation audio, first-known-use text, and entry-status artwork as intentionally ignored units. For any other unclassified element with nonblank visible text or media-like content, it SHALL create an actionable source finding and SHALL preserve visible text as neutral fallback content under the nearest owner.

#### Scenario: Known ignored audio
- **WHEN** a pronunciation contains an audio control
- **THEN** the audio is not rendered and is not reported as unrecognized

#### Scenario: Unknown descendant in a known container
- **WHEN** a recognized `.dt` container has an unclassified child with visible text
- **THEN** the child text is preserved under the owning definition and a finding identifies its word, owner, element, classes, position, and text preview

#### Scenario: Structural wrapper
- **WHEN** an unsemantic layout wrapper contains recognized descendants
- **THEN** the converter recursively processes the descendants without rendering or reporting the wrapper as an information unit

#### Scenario: Unknown wrapper with known-looking descendants
- **WHEN** an unclassified wrapper contains visible text and descendants that would be recognizable outside that wrapper
- **THEN** the converter preserves and reports the wrapper subtree once as atomic fallback content and does not separately render its descendants

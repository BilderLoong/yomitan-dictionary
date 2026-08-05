# MWU Entry Conversion

## Purpose

Convert planned MWU canonical owners into conservative, inspectable Yomitan structured content while keeping soft links definition-free.

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

### Requirement: Produce conservative readable structured content

The first-version converter SHALL produce valid Yomitan structured content
containing the useful visible definition text owned by the canonical source
structure. It SHALL preserve useful text order and basic source block
boundaries without claiming the final Level 1-6 semantic presentation.

#### Scenario: Basic definition

- **WHEN** a canonical owner contains one or more visible definition blocks
- **THEN** their readable text appears in source order in supported
  structured-content nodes

#### Scenario: Visible source link

- **WHEN** definition content includes a GoldenDict-only link with useful
  visible text
- **THEN** the visible text remains and the internal navigation target is not
  emitted

#### Scenario: Empty definition owner

- **WHEN** a planned canonical owner contains no readable definition or
  definition-like relation text
- **THEN** conversion returns a fatal diagnostic instead of emitting an empty
  canonical record

### Requirement: Preserve unsupported visible content once

The converter SHALL retain unsupported visible content as one neutral fallback
at its source position and SHALL record one actionable conversion finding. It
SHALL NOT silently discard the content or render recognizable descendants a
second time.

#### Scenario: Unknown visible subtree

- **WHEN** a canonical owner contains an unsupported subtree with visible text
- **THEN** that subtree contributes one neutral fallback and one finding with
  the source row, canonical owner, element, classes, source position, and text
  preview

#### Scenario: Empty presentation node

- **WHEN** an unsupported node has no visible text or meaningful media-like
  content
- **THEN** it produces neither visible fallback nor a misleading semantic unit

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

### Requirement: Leave final presentation policy deferred

The first-version converter SHALL leave the Yomitan reading field empty and
SHALL NOT require the hand-authored fixture's hierarchy, styling, collapsed
sections, example policy, or record shape. Pronunciation and other unsupported
header information MAY remain visible through conservative source text and
findings, but their final semantic rendering is outside this change.

#### Scenario: Fixture comparison

- **WHEN** first-version output differs from the hand-authored fixture while
  preserving correct canonical ownership, readable owner-local definitions,
  and valid Yomitan content
- **THEN** the difference is not a conversion failure solely because it differs
  from the fixture

#### Scenario: Reading field

- **WHEN** a canonical source contains MWU pronunciation text
- **THEN** the emitted Yomitan reading string remains empty in this version

# MWU UI review feedback record

**Status:** completed

This file records the accepted desktop UI decisions from the review. The real
Yomitan search page and narrow popup are the visual source of truth.

## Local metadata

- [x] Sense-local qualifiers use the local-tag style. Examples are `archaic`,
      `chiefly British`, `of a ship`, `cricket`, `transitive verb`, and
      `intransitive verb`.
- [x] Header metadata does not use the local-tag style. Examples are `often
      capitalized`, `plural`, `chiefly dialectal`, and inflection connectors
      such as `or` and `also`.
- [x] Local tags use Yomitan's default/POS tag gray, text color, height,
      padding, and radius. The purple dictionary badge stays visually separate.
- [x] Local tags are static metadata. They do not have a pointer cursor, help
      cursor, tooltip, click action, or navigation action.
- [x] Cross-references use neutral text, a dotted underline, and a default
      cursor. This style identifies a reference without making it look like an
      active blue link.

## Entry header

- [x] IPA, pronunciation notes, and inflection forms use one clean left content
      edge.
- [x] Pronunciation notes and forms use transparent, borderless rows. The entry
      header has one subtle bottom boundary instead of competing cards.
- [x] Header qualifiers use restrained inline metadata text instead of badges.
- [x] Slash-separated inflection markers include visible spaces. Example:
      `-ed / -ing / -s`.

## Definitions and examples

- [x] Source-number markers are quiet, use tabular numbers, and align with the
      first visible text line through relative layout values.
- [x] Example sentences use native disc list markers.
- [x] Each local example set uses one quiet shared background. Individual
      sentences and the extra-example disclosure do not use separate cards or
      left borders.
- [x] A collapsed extra-example row and its visible sentence use the same text
      column and marker column.
- [x] Example sources remain inside their owning sentence and shared example
      surface. A long source can wrap inside its own box without clipping or
      causing horizontal scrolling.

## Secondary sections

- [x] `Origin` and `Synonym Discussion` use the same muted secondary disclosure
      treatment.
- [x] Origin summaries and bodies have no decorative left border or unexpected
      start indentation.
- [x] Phrase, origin, and synonym sections align to the same section edge.
- [x] Phrase lists start collapsed. Their summary remains slightly stronger
      than the origin and synonym summaries.

## Verification scope

- [x] `inspect:dict:headless` runs Chromium in headless mode, so automated
      checks do not open a visible browser window. `inspect:dict` remains the
      visible human-review command.
- [x] Root Bun test discovery ignores `plugins/**` and embedded fixture tests.
- [x] Desktop search-page and narrow-popup layouts are in scope.
- [x] Mobile adaptation and touch-specific review are out of scope.
- [x] Final automated acceptance: `what`, `in`, `give`, `put`, `sum`, `down`,
      `turn`, and `o`; light and dark themes; 1100px search page and 360px
      popup. The fresh build emitted 377 records for 14 selected roots, and all
      32 rendered states plus the keyboard disclosure check passed.

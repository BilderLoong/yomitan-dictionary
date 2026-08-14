# Accept every complete cxl-ref relation phrase

The `.cxl-ref` cross-reference is a general relation-reference source, not a
spelling-variant allowlist. Every non-empty complete relation phrase is
valid; the exact raw phrase is preserved as the dictionary-deinflection rule.

## Context

The Unabridged corpus carries `.cxl-ref` references with 145 distinct
relation phrases across 17,402 references. `plural of` alone accounts for
3,767 references. The previous implementation approved exactly eight
spelling/variant phrases and dropped everything else as
`cxl-ref-not-emitted` findings, losing inflected lookups, taxonomic
synonyms, and the continuation tail.

## Decision

- A cross-reference-only `<mean>` owns one `cxl-ref-soft-link` route per
  valid `.cxt` target. A definition-bearing mean keeps canonical ownership
  and its visible relation-reference content.
- Every non-empty complete relation phrase is semantically valid. The exact
  raw phrase — capitalization, abbreviations, legacy wording, source
  spelling — is preserved as the rule.
- A connective-only continuation (`or`, `and`, `or of`, `and of`) inherits
  the exact raw phrase of the nearest preceding complete relation in the
  same mean. An orphan continuation emits no route and records an
  `orphan-continuation` finding.
- Every target anchor is processed independently in source order; a failing
  target does not remove valid siblings. Exact lookup-target-rule routes
  deduplicate at the first position.
- Route identity is exact lookup spelling, canonical target spelling, and
  exact effective relation phrase.
- A spelling/variant relation (normalized words include `variant`,
  `variants`, `spelling`, or `spellings`) shadows a same-route generic `.va`
  alternate and merges its evidence; a non-spelling relation coexists with
  the generic `alternative` route.
- The target spelling and target homograph identity come only from the
  `bword://` href. Missing and unsupported hrefs are per-target findings;
  visible anchor text is never used as identity. The homograph number is
  report evidence only — not part of the visible label, searchable spelling,
  or soft-link tuple.
- The visible unit is `relation-reference`; its target is a generic
  cross-reference target without the false `variant` relation.

## Consequences

- The cxl-ref and generic `.va` families serialize 45,324 records instead of
  36,427 (net +8,897). Main-to-alternative-spelling records are unaffected.
- Real-database audit, driving the Level 1 planner over the Unabridged rows:
  17,402 source references; 17,297 planner-reached; 145 phrases; 15,058 raw
  valid links; 15,017 distinct routes; 14,822 resolved records; 69
  continuations with no orphans; 50 secondary targets (43 valid, 6 absent
  rows, 1 self-link); 1,127 collision pairs with 1,121 spelling/variant
  shadowings.
- Raw phrase mistakes and legacy forms (`present 3d singular of`, `past
  particple of`) remain unchanged in rule output.
- The soft-link tuple targets a spelling only; it does not select a target
  homograph in Yomitan.

## Alternatives rejected

- Keep the conservative allowlist, expanded: exact-match lists do not scale
  to the combinatorial count-1 phrase tail.
- Normalize relation phrases before serialization: alters dictionary
  evidence and still leaves identity questions open.
- Emit cxl soft links from definition-bearing means: violates the
  level-ownership boundary.
- Fall back to visible anchor text when the href is missing or unsupported:
  makes identity depend on display text.

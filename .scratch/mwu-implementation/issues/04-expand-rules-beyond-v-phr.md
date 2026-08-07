# 04 — Decide and implement full rules generation (POS conditions beyond v_phr)

**What to build:** Yomitan's per-dictionary "Part of speech filtering" setting
only shows entries whose declared rules overlap the deinflection chain that
produced the search match. Today every MWU entry declares nothing except
evidence-based `v_phr` on interposed-object phrases, so a filter user gets
literal matches only for everything else (`goes` will not find `go`, `turns`
will not find `turn`). This ticket decides whether MWU entries should declare
the full English condition set (`v`, `v_phr`, `n`, `np`, `ns`, `adj`, `adv`)
derived from their part-of-speech labels — and, if accepted, implements it so
inflected lookups keep working for filter users. The decision itself is
deliberately open: the ticket exists to be thought about before any code.

**Blocked by:** None — can start immediately (the survey inspector already
provides the class inventory prerequisite; ADR 0005 records the current
minimal boundary).

**Status:** ready-for-agent

- [ ] Decision recorded: each entry's rules are derived from its
      part-of-speech labels (whitelist from the renderer's POS token map) —
      or a documented decision to stay minimal is reaffirmed
- [ ] Non-condition labels (`abbr`, `pron`, `phrase`, …) never written to
      the rules field — only the seven English dictionary-form names have
      any lookup meaning
- [ ] Mixed-POS rows handled: one record carrying noun AND verb senses
      declares a space-separated rule list (coarse whole-card semantics),
      or per-sense granularity is explicitly deferred with reasoning
- [ ] Every emitted rule traces to source label evidence and is reported in
      the build report, keeping the lookup-behavior surface auditable
- [ ] Verified in the real extension with "Part of speech filtering" ON:
      `turns`/`turned`/`goes`/`apples`-style searches match `n`/`v`-declared
      entries; with the filter OFF (default) behavior is byte-for-byte
      unchanged
- [ ] ADR updated (extend 0005 or new ADR) with the tradeoffs: filter-off
      no-op, false-negative risk when labels are wrong, `v_phr` as a
      sub-condition of `v` (shared flag, so verb rules cover phrasal chains)

## Current-state assessment (2026-08-07, agreed with ticket owner)

With "Part of speech filtering" OFF — the default — the `v_phr` rule (and
rules in general) has **zero lookup effect**: the interposed-object
transform runs unconditionally on the search side, the entry matches by
text, and the rules field is never consulted. Today `v_phr`'s actual value
is limited to: the "Phrasal verb" chip on the card, correct behavior for
the small opt-in filter audience, and being the one rule we can emit with
zero risk because the source proves it. If the filter audience is judged
not worth serving, `v_phr` (and all rules) could be dropped or kept as
cosmetic metadata — this ticket is the place that judgment gets made.

## Background (researched 2026-08-07, verified against the bundled
## Yomitan 26.7.29.0 fixture source and its real engine)

- The English transforms (plural, possessive, past, -ing, 3rd person
  singular present, interposed object, comparative, superlative, …) are
  built into Yomitan and ALWAYS run on the search text — the dictionary
  never supplies or enables transforms.
- Each deinflection chain keeps the conditions its rules produced
  (`goes` → `go {v v_phr}` via the verb rule, `go {n ns}` via the plural
  rule). The filter's overlap test is: entry flags AND chain flags, where
  the entry flags come from the term-bank rules field
  (`getConditionFlagsFromPartsOfSpeech`); conditions 0 (literal search)
  always match.
- Only the seven names `v`, `v_phr`, `n`, `np`, `ns`, `adj`, `adv` are
  dictionary-form conditions for English; `v_phr` is a sub-condition of
  `v` and shares its flag, so declaring `v` covers phrasal-verb chains too.
- Filter OFF (default): the overlap test is skipped entirely — matching is
  pure text equality, and empty rules cost nothing. Filter ON: an entry
  with empty rules matches only literal searches, i.e. `turns` stops
  finding `turn` — the false-negative risk that motivates this ticket.
- Real-engine baseline used for verification: `takes the engine apart` →
  `take apart {v v_phr}` (interposed object + 3rd person), shown with
  rules `v_phr`, hidden with rules empty; `turns` → `turn {n ns}` and
  `turn {v v_phr}`, shown with `n v`, hidden with empty.

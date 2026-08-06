# 01 — Cross-reference-only mean soft-link generation

**What to build:** A definition-free mean whose only evidence is a
cross-reference (`.cxl-ref`) emits a soft-link entry to the referenced
target — for example the `O` mean in the `o` row links to `oh` — instead of
only a `definition-free-mean` finding. The renderer side already lands:
means with a definition tree render `.cxl-ref` as `variant-reference`
content. This ticket is the planner side.

**Blocked by:** User decision — deferred 2026-08-06 in TODO.md; must be
un-deferred before implementation starts

**Status:** resolved — un-deferred and implemented 2026-08-07 on
`worktree-1` (blanket overnight delegation from the ticket owner); review
the un-deferral when back.

**Source:** TODO.md, "Open Level 1 generation TODOs"; full behavior speced in
`openspec/specs/mwu-level-1-entry-generation/spec.md` (Requirement: Extract
cxl-ref targets and rules conservatively).

- [x] A definition-free mean carrying only `.cxl-ref` evidence produces a
      `cxl-ref-variant-reference-soft-link` relationship instead of a bare
      `definition-free-mean` finding
- [x] Link target resolved from the `.cxt` `bword://` href
- [x] Variant phrase family applied (e.g. `O` → `oh` serializes as
      `[[oh, ["variant spelling of"]]]`)
- [x] Duplicate links dedup by `(lookup, target)`, accumulating evidence
- [x] Target joins `requiredDependencyIds` so the build pulls the needed row
- [x] `.cxl-ref` never participates in canonical-entry ownership
- [x] `o`-row build report shows the new relationship with the expected tuple

## Implementation notes (2026-08-07)

- `planCxlRefVariantSoftLinks` in `src/level1/planLinks.ts` plans one link
  per `.cxl-ref` in a definition-free mean; the mean's `definition-free-mean`
  finding is replaced by per-reference `cxl-ref-not-emitted` findings when no
  link is emitted.
- Approved family (case-insensitive): `variant spelling of`, `variant of`,
  `archaic variant of`, `obsolete variant of`, `dialectal variant of`,
  `Scottish variant of`, `chiefly Scottish variant of`, `chiefly British
  spelling of`. Inflection references (`plural of`, …), `synonym of`,
  `taxonomic synonym of`, and `and of` continuations stay findings.
- Target is extracted from the `.cxt` `bword://` href with any trailing
  `[homograph]` stripped; the visible anchor text (which may carry a
  homograph prefix) is evidence only. Self-links and targets without a
  decoded source row are skipped with a finding.
- A `cxl-ref-variant-reference-soft-link` replaces same-route
  `vr-mean-alternate-soft-link`/`phrase-alternate-soft-link` links globally
  (cross-row too, e.g. the `oh` row's `O` alternate merges into the `o`
  row's `O → oh` link), accumulating their evidence.
- Verified end to end: `bun run src/index.ts --words o` emits
  `["O","",null,"",-100,[["oh",["variant spelling of"]]],…]` with zero
  findings and zero errors; unit + integration + full suite green (129
  tests).

# 01 — Cross-reference-only mean soft-link generation

**What to build:** A definition-free mean whose only evidence is a
cross-reference (`.cxl-ref`) emits a soft-link entry to the referenced
target — for example the `O` mean in the `o` row links to `oh` — instead of
only a `definition-free-mean` finding. The renderer side already lands:
means with a definition tree render `.cxl-ref` as `variant-reference`
content. This ticket is the planner side.

**Blocked by:** User decision — deferred 2026-08-06 in TODO.md; must be
un-deferred before implementation starts

**Status:** blocked — user decision

**Source:** TODO.md, "Open Level 1 generation TODOs"; full behavior speced in
`openspec/specs/mwu-level-1-entry-generation/spec.md` (Requirement: Extract
cxl-ref targets and rules conservatively).

- [ ] A definition-free mean carrying only `.cxl-ref` evidence produces a
      `cxl-ref-variant-reference-soft-link` relationship instead of a bare
      `definition-free-mean` finding
- [ ] Link target resolved from the `.cxt` `bword://` href
- [ ] Variant phrase family applied (e.g. `o` → `oh` serializes as
      `[[oh, ["variant spelling of"]]]`)
- [ ] Duplicate links dedup by `(lookup, target)`, accumulating evidence
- [ ] Target joins `requiredDependencyIds` so the build pulls the needed row
- [ ] `.cxl-ref` never participates in canonical-entry ownership
- [ ] `o`-row build report shows the new relationship with the expected tuple

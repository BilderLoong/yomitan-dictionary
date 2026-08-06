# 03 — Design the repeatable survey inspector

**What to build:** A read-only survey tool that inspects one source word and
reports its DOM structure in survey vocabulary — DOM paths, class tokens,
ownership candidates, parser status — plus an inventory mode that reports
structure/class coverage and example word names. Unknown or unrecognized HTML
is reported, never silently discarded.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Source:** PROJECT_NOTES.md, "Research checklist — In progress" (migrated
2026-08-06). Earlier design-job commands (`design:fragments`,
`design:update-metadata`, `design:survey`) were removed from the package;
this ticket is for a fresh design built from observed HTML, not a
re-implementation of them.

- [ ] Two modes supported: inspect one word (DOM paths, class tokens,
      ownership candidates, parser status) and inventory (structure/class
      coverage, example word names)
- [ ] Output follows the survey's three-section contract: interesting
      information / not needed / not yet noticed-or-recognized
- [ ] Unknown or unrecognized HTML is reported with its owner and level,
      never silently discarded
- [ ] Read-only: emits no Yomitan entries and never mutates the source
      database
- [ ] Reuses the living survey's information-unit vocabulary and ownership
      rule (nearest semantic owner)
